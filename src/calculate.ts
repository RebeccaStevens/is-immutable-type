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
  type TypeData,
  type TypeMatchesPatternSpecifier,
  type TypeSpecifier,
  cacheData,
  defaultTypeMatchesPatternSpecifier,
  getCachedData,
  getTypeData,
  hasSymbol,
  isFunction,
  isTypeNode,
  isTypeReferenceWithTypeArguments,
  propertyNameToString,
  typeDataMatchesSpecifier,
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

/**
 * The bounds on the immutability of a type.
 */
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
 * @param typeMatchesPatternSpecifier - Allows for overriding how we check if a
 * type matches a pattern. This is used for checking if an override should be
 * applied or not.
 */
export function getTypeImmutability(
  program: ts.Program,
  typeOrTypeNode: ts.Type | ts.TypeNode,
  overrides: ImmutabilityOverrides = getDefaultOverrides(),
  useCache: ImmutabilityCache | boolean = true,
  maxImmutability: Immutability = Immutability.Immutable,
  typeMatchesPatternSpecifier: TypeMatchesPatternSpecifier = defaultTypeMatchesPatternSpecifier,
): Immutability {
  const givenTypeNode = isTypeNode(typeOrTypeNode);

  const type = givenTypeNode ? program.getTypeChecker().getTypeFromTypeNode(typeOrTypeNode) : typeOrTypeNode;
  const typeNode = givenTypeNode ? typeOrTypeNode : undefined;

  const typeData = getTypeData(type, typeNode);
  return getTypeImmutabilityHelper(
    program,
    typeData,
    overrides,
    useCache,
    maxImmutability,
    typeMatchesPatternSpecifier,
  );
}

/**
 * The different states a task can be in.
 */
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
  typeMatchesPatternSpecifier: TypeMatchesPatternSpecifier;
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
  typeMatchesPatternSpecifier: TypeMatchesPatternSpecifier,
): Immutability {
  const cache: ImmutabilityCache = useCache === true ? globalCache : useCache === false ? new WeakMap() : useCache;

  const parameters: Parameters = {
    program,
    overrides,
    cache,
    immutabilityLimits: {
      min: Immutability.Mutable,
      max: maxImmutability,
    },
    typeMatchesPatternSpecifier,
  };

  const mut_stack: Stack = [createNewTaskState(td)];
  let mut_PreviousImmutability = Immutability.Unknown;
  let mut_state: TaskState;
  do {
    mut_state = mut_stack.pop() ?? assert.fail();

    switch (mut_state.stage) {
      case TaskStateStage.Triage: {
        taskTriage(parameters, mut_stack, mut_state);
        break;
      }
      case TaskStateStage.ReduceChildren: {
        taskReduceChildren(mut_state);
        break;
      }
      case TaskStateStage.ObjectTypeReference: {
        taskObjectTypeReference(mut_stack, mut_state);
        break;
      }
      case TaskStateStage.ObjectIndexSignature: {
        taskObjectIndexSignature(parameters, mut_stack, mut_state);
        break;
      }
      case TaskStateStage.ApplyOverride: {
        taskApplyOverride(mut_state);
        mut_state = mut_state.taskState;
        break;
      }
      case TaskStateStage.CheckDone: {
        taskCheckDone(mut_state, mut_PreviousImmutability);
        mut_state = mut_state.taskState;
        break;
      }
      case TaskStateStage.Done: {
        break;
      }
      default: {
        assert.fail("Unexpected taskState stage");
      }
    }

    if (mut_state.immutability !== Immutability.Calculating) {
      cacheData(program, cache, mut_state.typeData, mut_state.immutability);
      mut_PreviousImmutability = mut_state.immutability;
    }
  } while (mut_stack.length > 0);

  if (mut_state.immutability === Immutability.Calculating) {
    assert.fail('Tried to return immutability of "Calculating"');
    // @ts-expect-error Unreachable Code
    return Immutability.Unknown;
  }
  return mut_state.immutability;
}

/**
 * Create the state for a new task.
 */
function createNewTaskState(typeData: Readonly<TypeData>): TaskStateTriage {
  return {
    typeData,
    stage: TaskStateStage.Triage,
    immutability: Immutability.Calculating,
  };
}

/**
 * Create the state for a new task that reduces the children task states.
 */
function createChildrenReducerTaskState(
  parent: Readonly<TaskStateBase>,
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

/**
 * Create the state for a new task that checks if the previous task has found
 * the type's immutability. If it hasn't the given action is called.
 */
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

/**
 * Create the state for a new task that applies an override if the from
 * immutability check matches.
 */
function createApplyOverrideTaskState(
  taskState: TaskStateApplyOverride["taskState"],
  override: Readonly<ImmutabilityOverrides[number]>,
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
function getOverride(parameters: Parameters, typeData: Readonly<TypeData>) {
  return parameters.overrides.find((potentialOverride) =>
    typeDataMatchesSpecifier(
      parameters.program,
      potentialOverride.type,
      typeData,
      parameters.typeMatchesPatternSpecifier,
    ),
  );
}

/**
 * Process the state and create any new next task that need to be used to process it.
 */
function taskTriage(parameters: Parameters, mut_stack: Stack, mut_state: TaskStateTriage): void {
  const cached = getCachedData(parameters.program, parameters.cache, mut_state.typeData);
  if (cached !== undefined) {
    mut_state.immutability = cached;
    return;
  }

  const override = getOverride(parameters, mut_state.typeData);
  if (override?.to !== undefined) {
    // Early escape if we don't need to check the override from.
    if (override.from === undefined) {
      mut_state.immutability = override.to;
      cacheData(parameters.program, parameters.cache, mut_state.typeData, mut_state.immutability);
      return;
    }

    mut_stack.push(createApplyOverrideTaskState(mut_state, override));
  }

  assert(mut_state.immutability === Immutability.Calculating);
  cacheData(parameters.program, parameters.cache, mut_state.typeData, mut_state.immutability);

  if (isUnionType(mut_state.typeData.type)) {
    handleTypeUnion(parameters, mut_stack, mut_state);
    return;
  }

  if (isIntersectionType(mut_state.typeData.type)) {
    handleTypeIntersection(parameters, mut_stack, mut_state);
    return;
  }

  if (isConditionalType(mut_state.typeData.type)) {
    handleTypeConditional(parameters, mut_stack, mut_state);
    return;
  }

  if (isFunction(mut_state.typeData.type)) {
    handleTypeFunction(mut_state);
    return;
  }

  const checker = parameters.program.getTypeChecker();

  if (checker.isTupleType(mut_state.typeData.type)) {
    handleTypeTuple(parameters, mut_stack, mut_state);
    return;
  }

  if (checker.isArrayType(mut_state.typeData.type)) {
    handleTypeArray(parameters, mut_stack, mut_state);
    return;
  }

  if (isObjectType(mut_state.typeData.type)) {
    handleTypeObject(parameters, mut_stack, mut_state);
    return;
  }

  // Must be a primitive.
  handleTypePrimitive(mut_state);
}

/**
 * We know we're dealling with a TypeReference, check its type arguments.
 * If we're not done, move on to the ObjectIndexSignature task.
 */
function taskObjectTypeReference(mut_stack: Stack, mut_state: TaskStateWithLimits) {
  mut_stack.push(
    createCheckDoneTaskState(mut_state, () => {
      mut_state.stage = TaskStateStage.ObjectIndexSignature;
      mut_stack.push(mut_state);
    }),
  );
  handleTypeArguments(mut_stack, mut_state);
}

/**
 * We know we're dealling with an object, check its index signatures.
 */
function taskObjectIndexSignature(parameters: Parameters, mut_stack: Stack, mut_state: TaskStateWithLimits) {
  assert(
    mut_state.typeData.typeNode === null ||
      isIntersectionType(mut_state.typeData.type) === ts.isIntersectionTypeNode(mut_state.typeData.typeNode),
  );

  const [types, typeNodes] = isIntersectionType(mut_state.typeData.type)
    ? [mut_state.typeData.type.types, (mut_state.typeData.typeNode as ts.IntersectionTypeNode | null)?.types]
    : [[mut_state.typeData.type], mut_state.typeData.typeNode === null ? undefined : [mut_state.typeData.typeNode]];

  mut_stack.push(
    createCheckDoneTaskState(mut_state, () => {
      mut_state.stage = TaskStateStage.Done;
      mut_state.immutability = max(mut_state.limits.min, mut_state.limits.max);
      mut_stack.push(mut_state);
    }),

    createCheckDoneTaskState(mut_state, () => {
      const children = types.flatMap((type, index) =>
        createIndexSignatureTaskStates(
          parameters,
          mut_state,
          ts.IndexKind.Number,
          getTypeData(type, typeNodes?.[index]),
        ),
      );
      if (children.length > 0) {
        mut_stack.push(createChildrenReducerTaskState(mut_state, children, max), ...children);
      }
    }),
  );

  const children = types.flatMap((type, index) =>
    createIndexSignatureTaskStates(parameters, mut_state, ts.IndexKind.String, getTypeData(type, typeNodes?.[index])),
  );
  if (children.length > 0) {
    mut_stack.push(createChildrenReducerTaskState(mut_state, children, max), ...children);
  }
}

/**
 * Apply an override if its criteria are met.
 */
function taskApplyOverride(mut_state: TaskStateApplyOverride) {
  assert(mut_state.override.from !== undefined, "Override should have already been applied");

  if (
    (mut_state.override.from <= mut_state.taskState.immutability &&
      mut_state.taskState.immutability <= mut_state.override.to) ||
    (mut_state.override.from >= mut_state.taskState.immutability &&
      mut_state.taskState.immutability >= mut_state.override.to)
  ) {
    mut_state.taskState.immutability = mut_state.override.to;
  }
}

/**
 * Check if we're found the type's immutability.
 */
function taskCheckDone(mut_state: TaskStateCheckDone, immutability: Immutability) {
  if (immutability !== Immutability.Calculating) {
    mut_state.taskState.limits.max = min(mut_state.taskState.limits.max, immutability);
    if (mut_state.taskState.limits.min >= mut_state.taskState.limits.max) {
      mut_state.taskState.immutability = mut_state.taskState.limits.min;
      return;
    }
  }

  mut_state.notDoneAction();
}

/**
 * Reduce the children's immutability values to a single value.
 */
function taskReduceChildren(mut_state: TaskStateChildrenReducer): void {
  mut_state.immutability = (mut_state.children[0] ?? assert.fail("no children")).immutability;
  for (let mut_index = 1; mut_index < mut_state.children.length; mut_index++) {
    mut_state.immutability = mut_state.childrenReducer(
      mut_state.immutability,
      mut_state.children[mut_index]!.immutability,
    );
  }
}

/**
 * Handle a type we know is a union.
 */
function handleTypeUnion(parameters: Parameters, mut_stack: Stack, mut_state: TaskStateTriage) {
  assert(isUnionType(mut_state.typeData.type));

  const checker = parameters.program.getTypeChecker();

  // TypeScript canonicalizes the constituents of `type.types` (e.g. primitives
  // first), while the AST preserves source order, so pair each TS type with
  // the typeNode whose checker-derived type matches it rather than zipping by
  // index. Without this, lookups that prefer `typeNode.getText()` (overrides,
  // alias names) would consult the wrong AST node.
  const unionTypeNode =
    mut_state.typeData.typeNode === null ? null : findUnionTypeNode(checker, mut_state.typeData.typeNode);
  const mut_typeNodes = unionTypeNode === null ? null : [...unionTypeNode.types];

  const children = mut_state.typeData.type.types.map((type) => {
    let typeNode: ts.TypeNode | undefined;
    if (mut_typeNodes !== null) {
      const matchIndex = mut_typeNodes.findIndex((node) => checker.getTypeFromTypeNode(node) === type);
      if (matchIndex >= 0) {
        // Splice so duplicate constituents don't both bind to the same node.
        [typeNode] = mut_typeNodes.splice(matchIndex, 1);
      }
    }

    return createNewTaskState(getTypeData(type, typeNode));
  });

  mut_stack.push(createChildrenReducerTaskState(mut_state, children, min), ...children);
}

/**
 * Find a UnionTypeNode reachable from the given typeNode, unwrapping
 * parentheses and resolving type-alias references whose declaration is itself
 * a union. Returns null if no UnionTypeNode is reachable (e.g. the typeNode
 * is a generic instantiation or a non-alias reference).
 */
function findUnionTypeNode(checker: ts.TypeChecker, typeNode: ts.TypeNode): ts.UnionTypeNode | null {
  if (ts.isUnionTypeNode(typeNode)) {
    return typeNode;
  }
  if (ts.isParenthesizedTypeNode(typeNode)) {
    return findUnionTypeNode(checker, typeNode.type);
  }
  if (ts.isTypeReferenceNode(typeNode)) {
    const nameNode = ts.isQualifiedName(typeNode.typeName) ? typeNode.typeName.right : typeNode.typeName;
    const symbol = checker.getSymbolAtLocation(nameNode);
    for (const declaration of symbol?.declarations ?? []) {
      if (ts.isTypeAliasDeclaration(declaration)) {
        const nested = findUnionTypeNode(checker, declaration.type);
        if (nested !== null) {
          return nested;
        }
      }
    }
  }
  return null;
}

/**
 * Handle a type we know is an intersection.
 */
function handleTypeIntersection(parameters: Parameters, mut_stack: Stack, mut_state: TaskState) {
  assert(mut_state.stage === TaskStateStage.Triage);

  handleTypeObject(parameters, mut_stack, mut_state);
}

/**
 * Handle a type we know is a conditional type.
 */
function handleTypeConditional(parameters: Parameters, mut_stack: Stack, mut_state: TaskState) {
  assert(mut_state.stage === TaskStateStage.Triage);
  assert(isConditionalType(mut_state.typeData.type));

  const checker = parameters.program.getTypeChecker();
  const children = [mut_state.typeData.type.root.node.trueType, mut_state.typeData.type.root.node.falseType].map(
    (typeNode) => {
      const type = checker.getTypeFromTypeNode(typeNode);
      return createNewTaskState(getTypeData(type, typeNode));
    },
  );

  mut_stack.push(createChildrenReducerTaskState(mut_state, children, min), ...children);
}

/**
 * Handle a type we know is a non-namespace function.
 */
function handleTypeFunction(mut_state: TaskState) {
  assert(mut_state.stage === TaskStateStage.Triage);

  mut_state.immutability = Immutability.Immutable;
}

/**
 * Handle a type we know is a tuple.
 */
function handleTypeTuple(parameters: Parameters, mut_stack: Stack, mut_state: TaskState) {
  assert(mut_state.stage === TaskStateStage.Triage);
  assert(parameters.program.getTypeChecker().isTupleType(mut_state.typeData.type));

  if (!mut_state.typeData.type.target.readonly) {
    mut_state.immutability = Immutability.Mutable;
    return;
  }
  handleTypeArray(parameters, mut_stack, mut_state);
}

/**
 * Handle a type we know is an array (this includes tuples).
 */
function handleTypeArray(parameters: Parameters, mut_stack: Stack, mut_state: TaskState) {
  assert(mut_state.stage === TaskStateStage.Triage);

  // It will have limits after being processed by `handleTypeObject`.
  const mut_stateWithLimits = mut_state as unknown as TaskStateWithLimits;
  mut_stack.push(
    createCheckDoneTaskState(mut_stateWithLimits, () => {
      mut_stateWithLimits.stage = TaskStateStage.Done;
      mut_stateWithLimits.immutability = max(mut_stateWithLimits.limits.min, mut_stateWithLimits.limits.max);
      mut_stack.push(mut_stateWithLimits);
    }),

    createCheckDoneTaskState(mut_stateWithLimits, () => {
      if (isTypeReferenceWithTypeArguments(mut_stateWithLimits.typeData.type)) {
        handleTypeArguments(mut_stack, mut_stateWithLimits);
      }
    }),
  );

  handleTypeObject(parameters, mut_stack, mut_state);
}

/**
 * Handle a type that all we know is that it's an object.
 */
function handleTypeObject(parameters: Parameters, mut_stack: Stack, mut_state: TaskStateTriage) {
  // Add limits.
  const mut_stateWithLimits = mut_state as unknown as TaskStateWithLimits;
  mut_stateWithLimits.stage = TaskStateStage.ObjectProperties;
  mut_stateWithLimits.limits = {
    ...parameters.immutabilityLimits,
  };

  mut_stack.push(
    createCheckDoneTaskState(mut_stateWithLimits, () => {
      if (isTypeReferenceWithTypeArguments(mut_stateWithLimits.typeData.type)) {
        mut_stateWithLimits.stage = TaskStateStage.ObjectTypeReference;
        mut_stack.push(mut_stateWithLimits);
        return;
      }

      mut_stateWithLimits.stage = TaskStateStage.ObjectIndexSignature;
      mut_stack.push(mut_stateWithLimits);
    }),
  );

  const checker = parameters.program.getTypeChecker();

  const properties = mut_stateWithLimits.typeData.type.getProperties();
  if (properties.length > 0) {
    for (const property of properties) {
      if (
        isPropertyReadonlyInType(mut_stateWithLimits.typeData.type, property.getEscapedName(), checker) ||
        // Ignore "length" for tuples.
        // TODO: Report this issue to upstream.
        ((property.escapedName as string) === "length" && checker.isTupleType(mut_stateWithLimits.typeData.type))
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
            (declaration) => hasSymbol(declaration) && isSymbolFlagSet(declaration.symbol, ts.SymbolFlags.Method),
          )
        ) {
          mut_stateWithLimits.limits.max = min(mut_stateWithLimits.limits.max, Immutability.ReadonlyDeep);
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
          mut_stateWithLimits.limits.max = min(mut_stateWithLimits.limits.max, Immutability.ReadonlyDeep);
          continue;
        }
      }

      mut_stateWithLimits.immutability = Immutability.Mutable;
      return;
    }
  }

  const propertyNodes = new Map<string, ts.TypeNode>(
    mut_stateWithLimits.typeData.typeNode !== null &&
      hasType(mut_stateWithLimits.typeData.typeNode) &&
      mut_stateWithLimits.typeData.typeNode.type !== undefined &&
      ts.isTypeLiteralNode(mut_stateWithLimits.typeData.typeNode.type)
      ? mut_stateWithLimits.typeData.typeNode.type.members
          .map((member): [string, ts.TypeNode] | undefined =>
            member.name === undefined || !hasType(member) || member.type === undefined
              ? undefined
              : [propertyNameToString(member.name), member.type],
          )
          .filter(<T>(v: T | undefined): v is T => v !== undefined)
      : [],
  );

  const children = properties
    .map((property) => {
      const propertyType = getTypeOfPropertyOfType(checker, mut_stateWithLimits.typeData.type, property);
      if (propertyType === undefined || (isIntrinsicType(propertyType) && propertyType.intrinsicName === "error")) {
        return null;
      }

      const propertyTypeNode = propertyNodes.get(property.getEscapedName() as string);

      return createNewTaskState(getTypeData(propertyType, propertyTypeNode));
    })
    .filter((taskState): taskState is TaskStateTriage => taskState !== null);

  if (children.length > 0) {
    mut_stateWithLimits.limits.min = Immutability.ReadonlyShallow;

    mut_stack.push(createChildrenReducerTaskState(mut_stateWithLimits, children, min), ...children);
  }
}

/**
 * Handle the type arguments of a type reference.
 */
function handleTypeArguments(mut_stack: Stack, mut_state: TaskStateWithLimits) {
  assert(isTypeReferenceWithTypeArguments(mut_state.typeData.type));

  const children = mut_state.typeData.type.typeArguments.map((type) =>
    createNewTaskState(getTypeData(type, undefined)),
  );
  mut_stack.push(createChildrenReducerTaskState(mut_state, children, min), ...children);
}

/**
 * Handle a primitive type.
 */
function handleTypePrimitive(mut_state: TaskStateTriage) {
  mut_state.immutability = Immutability.Immutable;
}

/**
 * Create the task states for analyzing an object's index signatures.
 */
function createIndexSignatureTaskStates(
  parameters: Parameters,
  mut_state: TaskStateBase,
  kind: ts.IndexKind,
  typeData: Readonly<TypeData>,
): Array<Exclude<TaskState, TaskStateCheckDone | TaskStateApplyOverride>> {
  const checker = parameters.program.getTypeChecker();
  const indexInfo = checker.getIndexInfoOfType(typeData.type, kind);
  if (indexInfo === undefined) {
    mut_state.immutability = Immutability.Unknown;
    return [];
  }

  if (!indexInfo.isReadonly) {
    mut_state.immutability = Immutability.Mutable;
    return [];
  }

  if (parameters.immutabilityLimits.max <= Immutability.ReadonlyShallow) {
    mut_state.immutability = Immutability.ReadonlyShallow;
    return [];
  }

  if (indexInfo.type === typeData.type) {
    mut_state.immutability = parameters.immutabilityLimits.max;
    return [];
  }

  const child = createNewTaskState(
    getTypeData(indexInfo.type, undefined), // TODO: can we get a type node for this?
  );

  return [
    createChildrenReducerTaskState(mut_state, [{ immutability: Immutability.ReadonlyShallow }, child], max),
    child,
  ];
}
