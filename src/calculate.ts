import assert from "node:assert/strict";

import { getTypeOfPropertyOfType } from "@typescript-eslint/type-utils";
import {
  hasType,
  isConditionalType,
  isIntersectionType,
  isIntrinsicType,
  isObjectType,
  isPropertyReadonlyInType,
  isSymbolFlagSet,
  isUnionType,
} from "ts-api-utils";
import ts from "typescript";

import { max, min } from "./compare";
import { Immutability } from "./immutability";
import {
  cacheData,
  getCachedData,
  getTypeData,
  hasSymbol,
  isFunction,
  isTypeNode,
  isTypeReferenceWithTypeArguments,
  propertyNameToString,
  typeMatchesSpecifier,
  type TypeData,
  type TypeSpecifier,
} from "./utils";

/**
 * A list of immutability overrides.
 */
export type ImmutabilityOverrides = ReadonlyArray<{
  type: TypeSpecifier;
  to: Immutability;
  from?: Immutability;
}>;

/**
 * Get the default overrides that are applied.
 */
export function getDefaultOverrides(): ImmutabilityOverrides {
  return [
    {
      type: { from: "lib", name: "Map" },
      to: Immutability.Mutable,
    },
    {
      type: { from: "lib", name: "Set" },
      to: Immutability.Mutable,
    },
    {
      type: { from: "lib", name: "Date" },
      to: Immutability.Mutable,
    },
    {
      type: { from: "lib", name: "URL" },
      to: Immutability.Mutable,
    },
    {
      type: { from: "lib", name: "URLSearchParams" },
      to: Immutability.Mutable,
    },
  ];
}

/**
 * A cache used to keep track of what types have already been calculated.
 */
export type ImmutabilityCache = WeakMap<object, Immutability>;

type ImmutabilityLimits = {
  min: Immutability;
  max: Immutability;
};

/**
 * A global cache that can be used between consumers.
 */
const globalCache: ImmutabilityCache = new WeakMap();

/**
 * Get the immutability of the given type.
 *
 * If you only care about the immutability up to a certain point, a
 * `maxImmutability` can be specified to help improve performance.
 *
 * @param program - The TypeScript Program to use.
 * @param typeOrTypeNode - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 * @param maxImmutability - If set then any return value equal to or greater
 * than this value will state the type's minimum immutability rather than it's
 * actual. This allows for early-escapes to be made in the type calculation.
 */
export function getTypeImmutability(
  program: ts.Program,
  typeOrTypeNode: ts.Type | ts.TypeNode,
  overrides: ImmutabilityOverrides = getDefaultOverrides(),
  useCache: ImmutabilityCache | boolean = true,
  maxImmutability = Immutability.Immutable,
): Immutability {
  const givenTypeNode = isTypeNode(typeOrTypeNode);

  const type = givenTypeNode
    ? program.getTypeChecker().getTypeFromTypeNode(typeOrTypeNode)
    : typeOrTypeNode;
  const typeNode = givenTypeNode ? typeOrTypeNode : undefined;

  const typeData = getTypeData(type, typeNode);
  return getTypeImmutabilityHelper(
    program,
    typeData,
    overrides,
    useCache,
    maxImmutability,
  );
}

type TaskState =
  | TaskStateTriage
  | TaskStateChildrenReducer
  | TaskStateWithLimits
  | TaskStateCheckDone
  | TaskStateApplyOverride
  | TaskStateDone;

type TaskStateBase = {
  stage: TaskStateStage;
  immutability: Immutability;
  typeData: Readonly<TypeData>;
};

type TaskStateTriage = TaskStateBase & {
  stage: TaskStateStage.Triage;
};

type TaskStateWithLimits = TaskStateBase & {
  limits: ImmutabilityLimits;
  stage:
    | TaskStateStage.ObjectIndexSignature
    | TaskStateStage.ObjectProperties
    | TaskStateStage.ObjectTypeReference
    | TaskStateStage.Done;
};

type TaskStateChildrenReducer = TaskStateBase & {
  stage: TaskStateStage.ReduceChildren;
  children: ReadonlyArray<{ immutability: Immutability }>;
  childrenReducer: (a: Immutability, b: Immutability) => Immutability;
};

// eslint-disable-next-line functional/no-mixed-types
type TaskStateCheckDone = {
  stage: TaskStateStage.CheckDone;
  taskState: TaskStateWithLimits;
  notDoneAction: () => void;
};

type TaskStateApplyOverride = {
  stage: TaskStateStage.ApplyOverride;
  taskState: Exclude<TaskState, TaskStateApplyOverride | TaskStateCheckDone>;
  override: ImmutabilityOverrides[number];
};

type TaskStateDone = TaskStateBase & {
  stage: TaskStateStage.Done;
};

/**
 * The stage of a taskState.
 */
const enum TaskStateStage {
  Triage,
  ReduceChildren,
  ObjectProperties,
  ObjectTypeReference,
  ObjectIndexSignature,
  CheckDone,
  ApplyOverride,
  Done,
}

type Stack = TaskState[];

type Parameters = Readonly<{
  program: ts.Program;
  overrides: ImmutabilityOverrides;
  cache: ImmutabilityCache;
  immutabilityLimits: Readonly<ImmutabilityLimits>;
}>;

/**
 * Get the immutability of the given type data.
 */
function getTypeImmutabilityHelper(
  program: ts.Program,
  td: Readonly<TypeData>,
  overrides: ImmutabilityOverrides,
  useCache: ImmutabilityCache | boolean,
  maxImmutability: Immutability,
): Immutability {
  const cache: ImmutabilityCache =
    useCache === true
      ? globalCache
      : useCache === false
        ? new WeakMap()
        : useCache;

  const parameters: Parameters = {
    program,
    overrides,
    cache,
    immutabilityLimits: {
      min: Immutability.Mutable,
      max: maxImmutability,
    },
  };

  const m_stack: Stack = [createNewTaskState(td)];
  let m_PreviousImmutability = Immutability.Unknown;
  let m_state: TaskState;
  do {
    m_state = m_stack.pop() ?? assert.fail();

    switch (m_state.stage) {
      case TaskStateStage.Triage: {
        taskTriage(parameters, m_stack, m_state);
        break;
      }
      case TaskStateStage.ReduceChildren: {
        taskReduceChildren(m_state);
        break;
      }
      case TaskStateStage.ObjectTypeReference: {
        taskObjectTypeReference(m_stack, m_state);
        break;
      }
      case TaskStateStage.ObjectIndexSignature: {
        taskObjectIndexSignature(parameters, m_stack, m_state);
        break;
      }
      case TaskStateStage.ApplyOverride: {
        taskApplyOverride(m_state);
        m_state = m_state.taskState;
        break;
      }
      case TaskStateStage.CheckDone: {
        taskCheckDone(m_state, m_PreviousImmutability);
        m_state = m_state.taskState;
        break;
      }
      case TaskStateStage.Done: {
        break;
      }
      default: {
        assert.fail("Unexpected taskState stage");
      }
    }

    if (m_state.immutability !== Immutability.Calculating) {
      cacheData(program, cache, m_state.typeData, m_state.immutability);
      m_PreviousImmutability = m_state.immutability;
    }
  } while (m_stack.length > 0);

  if (m_state.immutability === Immutability.Calculating) {
    assert.fail('Tried to return immutability of "Calculating"');
    // @ts-expect-error Unreachable Code
    return Immutability.Unknown;
  }
  return m_state.immutability;
}

function createNewTaskState(typeData: TypeData): TaskStateTriage {
  return {
    typeData,
    stage: TaskStateStage.Triage,
    immutability: Immutability.Calculating,
  };
}

function createChildrenReducerTaskState(
  parent: TaskStateBase,
  children: TaskStateChildrenReducer["children"],
  childrenReducer: TaskStateChildrenReducer["childrenReducer"],
): TaskStateChildrenReducer {
  return {
    typeData: parent.typeData,
    children,
    childrenReducer,
    stage: TaskStateStage.ReduceChildren,
    immutability: Immutability.Calculating,
  };
}

function createCheckDoneTaskState(
  taskState: TaskStateCheckDone["taskState"],
  notDoneAction: TaskStateCheckDone["notDoneAction"],
): TaskStateCheckDone {
  return {
    taskState,
    notDoneAction,
    stage: TaskStateStage.CheckDone,
  };
}

function createApplyOverrideTaskState(
  taskState: TaskStateApplyOverride["taskState"],
  override: ImmutabilityOverrides[number],
): TaskStateApplyOverride {
  return {
    taskState,
    override,
    stage: TaskStateStage.ApplyOverride,
  };
}

/**
 * Get the override for the type if it has one.
 */
function getOverride(parameters: Parameters, typeData: TypeData) {
  return parameters.overrides.find((potentialOverride) =>
    typeMatchesSpecifier(typeData, potentialOverride.type, parameters.program),
  );
}

/**
 * The first stage for all types.
 */
function taskTriage(
  parameters: Parameters,
  m_stack: Stack,
  m_state: TaskStateTriage,
): void {
  const cached = getCachedData(
    parameters.program,
    parameters.cache,
    m_state.typeData,
  );
  if (cached !== undefined) {
    m_state.immutability = cached;
    return;
  }

  const override = getOverride(parameters, m_state.typeData);
  if (override?.to !== undefined) {
    // Early escape if we don't need to check the override from.
    if (override.from === undefined) {
      m_state.immutability = override.to;
      cacheData(
        parameters.program,
        parameters.cache,
        m_state.typeData,
        m_state.immutability,
      );
      return;
    }

    m_stack.push(createApplyOverrideTaskState(m_state, override));
  }

  assert(m_state.immutability === Immutability.Calculating);
  cacheData(
    parameters.program,
    parameters.cache,
    m_state.typeData,
    m_state.immutability,
  );

  if (isUnionType(m_state.typeData.type)) {
    handleTypeUnion(m_stack, m_state);
    return;
  }

  if (isIntersectionType(m_state.typeData.type)) {
    handleTypeIntersection(parameters, m_stack, m_state);
    return;
  }

  if (isConditionalType(m_state.typeData.type)) {
    handleTypeConditional(parameters, m_stack, m_state);
    return;
  }

  if (isFunction(m_state.typeData.type)) {
    handleTypeFunction(m_state);
    return;
  }

  const checker = parameters.program.getTypeChecker();

  if (checker.isTupleType(m_state.typeData.type)) {
    handleTypeTuple(parameters, m_stack, m_state);
    return;
  }

  if (checker.isArrayType(m_state.typeData.type)) {
    handleTypeArray(parameters, m_stack, m_state);
    return;
  }

  if (isObjectType(m_state.typeData.type)) {
    handleTypeObject(parameters, m_stack, m_state);
    return;
  }

  // Must be a primitive.
  handleTypePrimitive(m_state);
}

function taskObjectTypeReference(m_stack: Stack, m_state: TaskStateWithLimits) {
  m_stack.push(
    createCheckDoneTaskState(m_state, () => {
      m_state.stage = TaskStateStage.ObjectIndexSignature;
      m_stack.push(m_state);
    }),
  );
  handleTypeArguments(m_stack, m_state);
}

function taskObjectIndexSignature(
  parameters: Parameters,
  m_stack: Stack,
  m_state: TaskStateWithLimits,
) {
  assert(
    m_state.typeData.typeNode === null ||
      isIntersectionType(m_state.typeData.type) ===
        ts.isIntersectionTypeNode(m_state.typeData.typeNode),
  );

  const [types, typeNodes] = isIntersectionType(m_state.typeData.type)
    ? [
        m_state.typeData.type.types,
        (m_state.typeData.typeNode as ts.IntersectionTypeNode | null)?.types,
      ]
    : [
        [m_state.typeData.type],
        m_state.typeData.typeNode === null
          ? undefined
          : [m_state.typeData.typeNode],
      ];

  m_stack.push(
    createCheckDoneTaskState(m_state, () => {
      m_state.stage = TaskStateStage.Done;
      m_state.immutability = max(m_state.limits.min, m_state.limits.max);
      m_stack.push(m_state);
    }),
    createCheckDoneTaskState(m_state, () => {
      const children = types.flatMap((type, index) =>
        createIndexSignatureTaskStates(
          parameters,
          m_state,
          ts.IndexKind.Number,
          getTypeData(type, typeNodes?.[index]),
        ),
      );
      if (children.length > 0) {
        m_stack.push(
          createChildrenReducerTaskState(m_state, children, max),
          ...children,
        );
      }
    }),
  );

  const children = types.flatMap((type, index) =>
    createIndexSignatureTaskStates(
      parameters,
      m_state,
      ts.IndexKind.String,
      getTypeData(type, typeNodes?.[index]),
    ),
  );
  if (children.length > 0) {
    m_stack.push(
      createChildrenReducerTaskState(m_state, children, max),
      ...children,
    );
  }
}

function taskApplyOverride(m_state: TaskStateApplyOverride) {
  assert(
    m_state.override.from !== undefined,
    "Override should have already been applied",
  );

  if (
    (m_state.override.from <= m_state.taskState.immutability &&
      m_state.taskState.immutability <= m_state.override.to) ||
    (m_state.override.from >= m_state.taskState.immutability &&
      m_state.taskState.immutability >= m_state.override.to)
  ) {
    m_state.taskState.immutability = m_state.override.to;
  }
}

function taskCheckDone(
  m_state: TaskStateCheckDone,
  immutability: Immutability,
) {
  if (immutability !== Immutability.Calculating) {
    m_state.taskState.limits.max = min(
      m_state.taskState.limits.max,
      immutability,
    );
    if (m_state.taskState.limits.min >= m_state.taskState.limits.max) {
      m_state.taskState.immutability = m_state.taskState.limits.min;
      return;
    }
  }

  m_state.notDoneAction();
}

function taskReduceChildren(m_state: TaskStateChildrenReducer): void {
  m_state.immutability = (
    m_state.children[0] ?? assert.fail("no children")
  ).immutability;
  for (let m_index = 1; m_index < m_state.children.length; m_index++) {
    m_state.immutability = m_state.childrenReducer(
      m_state.immutability,
      m_state.children[m_index]!.immutability,
    );
  }
}

function handleTypeUnion(m_stack: Stack, m_state: TaskStateTriage) {
  assert(isUnionType(m_state.typeData.type));

  const children = m_state.typeData.type.types.map((type, index) => {
    const typeNode =
      m_state.typeData.typeNode !== null &&
      ts.isUnionTypeNode(m_state.typeData.typeNode)
        ? m_state.typeData.typeNode.types[index]
        : undefined; // TODO: can we safely get a union type node nested within a different type node?

    return createNewTaskState(getTypeData(type, typeNode));
  });

  m_stack.push(
    createChildrenReducerTaskState(m_state, children, min),
    ...children,
  );
}

function handleTypeIntersection(
  parameters: Parameters,
  m_stack: Stack,
  m_state: TaskState,
) {
  assert(m_state.stage === TaskStateStage.Triage);

  handleTypeObject(parameters, m_stack, m_state);
}

function handleTypeConditional(
  parameters: Parameters,
  m_stack: Stack,
  m_state: TaskState,
) {
  assert(m_state.stage === TaskStateStage.Triage);
  assert(isConditionalType(m_state.typeData.type));

  const checker = parameters.program.getTypeChecker();
  const children = [
    m_state.typeData.type.root.node.trueType,
    m_state.typeData.type.root.node.falseType,
  ].map((typeNode) => {
    const type = checker.getTypeFromTypeNode(typeNode);
    return createNewTaskState(getTypeData(type, typeNode));
  });

  m_stack.push(
    createChildrenReducerTaskState(m_state, children, min),
    ...children,
  );
}

function handleTypeFunction(m_state: TaskState) {
  assert(m_state.stage === TaskStateStage.Triage);

  m_state.immutability = Immutability.Immutable;
}

function handleTypeTuple(
  parameters: Parameters,
  m_stack: Stack,
  m_state: TaskState,
) {
  assert(m_state.stage === TaskStateStage.Triage);
  assert(
    parameters.program.getTypeChecker().isTupleType(m_state.typeData.type),
  );

  if (!m_state.typeData.type.target.readonly) {
    m_state.immutability = Immutability.Mutable;
    return;
  }
  handleTypeArray(parameters, m_stack, m_state);
}

function handleTypeArray(
  parameters: Parameters,
  m_stack: Stack,
  m_state: TaskState,
) {
  assert(m_state.stage === TaskStateStage.Triage);

  // It will have limits after being processed by `handleTypeObject`.
  const m_stateWithLimits = m_state as unknown as TaskStateWithLimits;
  m_stack.push(
    createCheckDoneTaskState(m_stateWithLimits, () => {
      m_stateWithLimits.stage = TaskStateStage.Done;
      m_stateWithLimits.immutability = max(
        m_stateWithLimits.limits.min,
        m_stateWithLimits.limits.max,
      );
      m_stack.push(m_stateWithLimits);
    }),

    createCheckDoneTaskState(m_stateWithLimits, () => {
      if (isTypeReferenceWithTypeArguments(m_stateWithLimits.typeData.type)) {
        handleTypeArguments(m_stack, m_stateWithLimits);
      }
    }),
  );

  handleTypeObject(parameters, m_stack, m_state);
}

function handleTypeObject(
  parameters: Parameters,
  m_stack: Stack,
  m_state: TaskStateTriage,
) {
  // Add limits.
  const m_stateWithLimits = m_state as unknown as TaskStateWithLimits;
  m_stateWithLimits.stage = TaskStateStage.ObjectProperties;
  m_stateWithLimits.limits = {
    ...parameters.immutabilityLimits,
  };

  m_stack.push(
    createCheckDoneTaskState(m_stateWithLimits, () => {
      if (isTypeReferenceWithTypeArguments(m_stateWithLimits.typeData.type)) {
        m_stateWithLimits.stage = TaskStateStage.ObjectTypeReference;
        m_stack.push(m_stateWithLimits);
        return;
      }

      m_stateWithLimits.stage = TaskStateStage.ObjectIndexSignature;
      m_stack.push(m_stateWithLimits);
    }),
  );

  const checker = parameters.program.getTypeChecker();

  const properties = m_stateWithLimits.typeData.type.getProperties();
  if (properties.length > 0) {
    for (const property of properties) {
      if (
        isPropertyReadonlyInType(
          m_stateWithLimits.typeData.type,
          property.getEscapedName(),
          checker,
        ) ||
        // Ignore "length" for tuples.
        // TODO: Report this issue to upstream.
        ((property.escapedName as string) === "length" &&
          checker.isTupleType(m_stateWithLimits.typeData.type))
      ) {
        continue;
      }

      const name = ts.getNameOfDeclaration(property.valueDeclaration);
      if (name !== undefined && ts.isPrivateIdentifier(name)) {
        continue;
      }

      const declarations = property.getDeclarations() ?? [];
      if (declarations.length > 0) {
        if (
          declarations.some(
            (declaration) =>
              hasSymbol(declaration) &&
              isSymbolFlagSet(declaration.symbol, ts.SymbolFlags.Method),
          )
        ) {
          m_stateWithLimits.limits.max = min(
            m_stateWithLimits.limits.max,
            Immutability.ReadonlyDeep,
          );
          continue;
        }

        if (
          declarations.every(
            (declaration) =>
              ts.isPropertySignature(declaration) &&
              declaration.type !== undefined &&
              ts.isFunctionTypeNode(declaration.type),
          )
        ) {
          m_stateWithLimits.limits.max = min(
            m_stateWithLimits.limits.max,
            Immutability.ReadonlyDeep,
          );
          continue;
        }
      }

      m_stateWithLimits.immutability = Immutability.Mutable;
      return;
    }
  }

  const propertyNodes = new Map<string, ts.TypeNode>(
    m_stateWithLimits.typeData.typeNode !== null &&
    hasType(m_stateWithLimits.typeData.typeNode) &&
    m_stateWithLimits.typeData.typeNode.type !== undefined &&
    ts.isTypeLiteralNode(m_stateWithLimits.typeData.typeNode.type)
      ? m_stateWithLimits.typeData.typeNode.type.members
          .map((member): [string, ts.TypeNode] | undefined =>
            member.name === undefined ||
            !hasType(member) ||
            member.type === undefined
              ? undefined
              : [propertyNameToString(member.name), member.type],
          )
          .filter(<T>(v: T | undefined): v is T => v !== undefined)
      : [],
  );

  const children = properties
    .map((property) => {
      const propertyType = getTypeOfPropertyOfType(
        checker,
        m_stateWithLimits.typeData.type,
        property,
      );
      if (
        propertyType === undefined ||
        (isIntrinsicType(propertyType) &&
          propertyType.intrinsicName === "error")
      ) {
        return null;
      }

      const propertyTypeNode = propertyNodes.get(
        property.getEscapedName() as string,
      );

      return createNewTaskState(getTypeData(propertyType, propertyTypeNode));
    })
    .filter((taskState): taskState is TaskStateTriage => taskState !== null);

  if (children.length > 0) {
    m_stateWithLimits.limits.min = Immutability.ReadonlyShallow;

    m_stack.push(
      createChildrenReducerTaskState(m_stateWithLimits, children, min),
      ...children,
    );
  }
}

function handleTypeArguments(m_stack: Stack, m_state: TaskStateWithLimits) {
  assert(isTypeReferenceWithTypeArguments(m_state.typeData.type));

  const children = m_state.typeData.type.typeArguments.map((type) =>
    createNewTaskState(getTypeData(type, undefined)),
  );
  m_stack.push(
    createChildrenReducerTaskState(m_state, children, min),
    ...children,
  );
}

function handleTypePrimitive(m_state: TaskStateTriage) {
  m_state.immutability = Immutability.Immutable;
}

function createIndexSignatureTaskStates(
  parameters: Parameters,
  m_state: TaskStateBase,
  kind: ts.IndexKind,
  typeData: TypeData,
): Array<Exclude<TaskState, TaskStateCheckDone | TaskStateApplyOverride>> {
  const checker = parameters.program.getTypeChecker();
  const indexInfo = checker.getIndexInfoOfType(typeData.type, kind);
  if (indexInfo === undefined) {
    m_state.immutability = Immutability.Unknown;
    return [];
  }

  if (parameters.immutabilityLimits.max <= Immutability.ReadonlyShallow) {
    m_state.immutability = Immutability.ReadonlyShallow;
    return [];
  }

  if (indexInfo.isReadonly) {
    if (indexInfo.type === typeData.type) {
      m_state.immutability = parameters.immutabilityLimits.max;
      return [];
    }

    const child = createNewTaskState(
      getTypeData(indexInfo.type, undefined), // TODO: can we get a type node for this?
    );

    return [
      createChildrenReducerTaskState(
        m_state,
        [{ immutability: Immutability.ReadonlyShallow }, child],
        max,
      ),
      child,
    ];
  }

  m_state.immutability = Immutability.Mutable;
  return [];
}
