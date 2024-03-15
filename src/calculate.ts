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
  isTypeReference,
  isUnionType,
} from "ts-api-utils";
import ts from "typescript";

import { max, min } from "./compare";
import { Immutability } from "./immutability";
import {
  cacheData,
  cast,
  getCachedData,
  getTypeData,
  hasSymbol,
  isTypeNode,
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

type Snapshot =
  | SnapshotBase
  | SnapshotChildren
  | SnapshotWithLimits
  | SnapshotCheckDone
  | SnapshotCheckOverride;

type SnapshotBase = {
  immutability: Immutability;
  stage: SnapshotStage;
  typeData: Readonly<TypeData>;
};

type SnapshotWithLimits = SnapshotBase & {
  limits: ImmutabilityLimits;
};

type SnapshotChildren = SnapshotBase & {
  stage: SnapshotStage.ReduceChildren;
  children: ReadonlyArray<{ immutability: Immutability }>;
  childrenReducer: (a: Immutability, b: Immutability) => Immutability;
};

// eslint-disable-next-line functional/no-mixed-types
type SnapshotCheckDone = {
  stage: SnapshotStage.CheckDone;
  snapshot: Snapshot;
  notDoneAction: (snapshot: SnapshotWithLimits) => void;
};

type SnapshotCheckOverride = {
  snapshot: Snapshot;
  stage: SnapshotStage.CheckOverride;
  override: ImmutabilityOverrides[number];
};

/**
 * The stage of a snapshot.
 */
const enum SnapshotStage {
  Init,
  ReduceChildren,
  ObjectProperties,
  ObjectTypeReference,
  ObjectIndexSignature,
  CheckDone,
  CheckOverride,
  Done,
}

function createSnapshot(typeData: TypeData): SnapshotBase {
  return {
    typeData,
    stage: SnapshotStage.Init,
    immutability: Immutability.Calculating,
  };
}

function createChildrenReducer(
  current: SnapshotBase,
  children: SnapshotChildren["children"],
  childrenReducer: SnapshotChildren["childrenReducer"],
): SnapshotChildren {
  return {
    typeData: current.typeData,
    children,
    childrenReducer,
    stage: SnapshotStage.ReduceChildren,
    immutability: Immutability.Calculating,
  };
}

function createDoneChecker(
  snapshot: Snapshot,
  notDoneAction: SnapshotCheckDone["notDoneAction"],
): SnapshotCheckDone {
  return {
    snapshot,
    notDoneAction,
    stage: SnapshotStage.CheckDone,
  };
}

function createOverrideChecker(
  snapshot: Snapshot,
  override: ImmutabilityOverrides[number],
): SnapshotCheckOverride {
  return {
    snapshot,
    override,
    stage: SnapshotStage.CheckOverride,
  };
}

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

  const checker = program.getTypeChecker();

  const m_stack: Snapshot[] = [createSnapshot(td)];
  let m_PreviousImmutability = Immutability.Unknown;
  let m_current: Snapshot;
  do {
    m_current = m_stack.pop() ?? assert.fail();

    switch (m_current.stage) {
      case SnapshotStage.Init: {
        handleStageInit(m_current);
        break;
      }
      case SnapshotStage.ReduceChildren: {
        reduceChildren(m_current);
        break;
      }
      case SnapshotStage.CheckDone: {
        handleTypeObjectCheckDone(m_current);
        assert("snapshot" in m_current);
        m_current = m_current.snapshot;
        assert(m_current.stage !== SnapshotStage.CheckDone);
        break;
      }
      case SnapshotStage.ObjectTypeReference: {
        handleTypeObjectTypeReference(m_current);
        break;
      }
      case SnapshotStage.ObjectIndexSignature: {
        handleTypeObjectIndexSignature(m_current);
        break;
      }
      case SnapshotStage.CheckOverride: {
        handleCheckOverride(m_current);
        assert("snapshot" in m_current);
        m_current = m_current.snapshot;
        assert(m_current.stage !== SnapshotStage.CheckOverride);
        break;
      }
      case SnapshotStage.Done: {
        break;
      }
      default: {
        assert.fail("Unexpected snapshot stage");
      }
    }

    assert("immutability" in m_current);
    if (m_current.immutability !== Immutability.Calculating) {
      cacheData(program, cache, m_current.typeData, m_current.immutability);
      m_PreviousImmutability = m_current.immutability;
    }
  } while (m_stack.length > 0);

  assert(m_current.immutability !== Immutability.Calculating);
  return m_current.immutability;

  /**
   * The first stage for all types.
   */
  function handleStageInit(m_snapshot: Snapshot): void {
    assert(m_snapshot.stage === SnapshotStage.Init);

    const cached = getCachedData(program, cache, m_snapshot.typeData);
    if (cached !== undefined) {
      m_snapshot.immutability = cached;
      return;
    }

    const override = getOverride(m_snapshot);
    if (override?.to !== undefined) {
      // Early escape if we don't need to check the override from.
      if (override.from === undefined) {
        m_snapshot.immutability = override.to;
        cacheData(program, cache, m_snapshot.typeData, m_snapshot.immutability);
        return;
      }

      m_stack.push(createOverrideChecker(m_snapshot, override));
    }

    assert(m_snapshot.immutability === Immutability.Calculating);
    cacheData(program, cache, m_snapshot.typeData, m_snapshot.immutability);

    if (isUnionType(m_snapshot.typeData.type)) {
      handleTypeUnion(m_snapshot);
      return;
    }

    if (isIntersectionType(m_snapshot.typeData.type)) {
      handleTypeIntersection(m_snapshot);
      return;
    }

    if (isConditionalType(m_snapshot.typeData.type)) {
      handleTypeConditional(m_snapshot);
      return;
    }

    if (isFunction(m_snapshot.typeData.type)) {
      handleTypeFunction(m_snapshot);
      return;
    }

    if (checker.isTupleType(m_snapshot.typeData.type)) {
      handleTypeTuple(m_snapshot);
      return;
    }

    if (checker.isArrayType(m_snapshot.typeData.type)) {
      handleTypeArray(m_snapshot);
      return;
    }

    if (isObjectType(m_snapshot.typeData.type)) {
      handleTypeObject(m_snapshot);
      return;
    }

    // Must be a primitive.
    handleTypePrimitive(m_snapshot);
  }

  function handleCheckOverride(m_snapshot: Snapshot) {
    assert(m_snapshot.stage === SnapshotStage.CheckOverride);
    assert("override" in m_snapshot);
    assert(m_snapshot.override.from !== undefined);
    assert("immutability" in m_snapshot.snapshot);

    if (
      (m_snapshot.override.from <= m_snapshot.snapshot.immutability &&
        m_snapshot.snapshot.immutability <= m_snapshot.override.to) ||
      (m_snapshot.override.from >= m_snapshot.snapshot.immutability &&
        m_snapshot.snapshot.immutability >= m_snapshot.override.to)
    ) {
      m_snapshot.snapshot.immutability = m_snapshot.override.to;
    }
  }

  function handleTypeUnion(m_snapshot: Snapshot) {
    assert(m_snapshot.stage === SnapshotStage.Init);
    assert(isUnionType(m_snapshot.typeData.type));

    const children = m_snapshot.typeData.type.types.map((type, index) => {
      const typeNode =
        m_snapshot.typeData.typeNode !== null &&
        ts.isUnionTypeNode(m_snapshot.typeData.typeNode)
          ? m_snapshot.typeData.typeNode.types[index]
          : undefined; // TODO: can we safely get a union type node nested within a different type node?

      return createSnapshot(getTypeData(type, typeNode));
    });

    m_stack.push(createChildrenReducer(m_snapshot, children, min), ...children);
  }

  function handleTypeIntersection(m_snapshot: Snapshot) {
    assert(m_snapshot.stage === SnapshotStage.Init);

    handleTypeObject(m_snapshot);
  }

  function handleTypeConditional(m_snapshot: Snapshot) {
    assert(m_snapshot.stage === SnapshotStage.Init);
    assert(isConditionalType(m_snapshot.typeData.type));

    const children = [
      m_snapshot.typeData.type.root.node.trueType,
      m_snapshot.typeData.type.root.node.falseType,
    ].map((typeNode) => {
      const type = checker.getTypeFromTypeNode(typeNode);
      return createSnapshot(getTypeData(type, typeNode));
    });

    m_stack.push(createChildrenReducer(m_snapshot, children, min), ...children);
  }

  function handleTypeFunction(m_snapshot: Snapshot) {
    assert(m_snapshot.stage === SnapshotStage.Init);

    m_snapshot.immutability = Immutability.Immutable;
  }

  function handleTypeTuple(m_snapshot: Snapshot) {
    assert(m_snapshot.stage === SnapshotStage.Init);
    assert(checker.isTupleType(m_snapshot.typeData.type));

    if (!m_snapshot.typeData.type.target.readonly) {
      m_snapshot.immutability = Immutability.Mutable;
      return;
    }
    handleTypeArray(m_snapshot);
  }

  function handleTypeArray(m_snapshot: Snapshot) {
    assert(m_snapshot.stage === SnapshotStage.Init);

    m_stack.push(
      createDoneChecker(m_snapshot, (m_objectType) => {
        assert("limits" in m_objectType);

        m_objectType.stage = SnapshotStage.Done;
        m_objectType.immutability = max(
          m_objectType.limits.min,
          m_objectType.limits.max,
        );
        m_stack.push(m_objectType);
      }),
      createDoneChecker(m_snapshot, (m_objectType) => {
        assert("limits" in m_objectType);

        if (isTypeReferenceWithTypeArguments(m_objectType.typeData.type)) {
          handleTypeArguments(m_snapshot);
        }
      }),
    );

    handleTypeObject(m_snapshot);
  }

  function handleTypeObject(m_snapshot: Snapshot) {
    assert(m_snapshot.stage === SnapshotStage.Init);
    assert(!("limits" in m_snapshot), "Limits already set");
    assert(cast<SnapshotWithLimits>(m_snapshot));

    m_snapshot.stage = SnapshotStage.ObjectProperties;
    m_snapshot.limits = {
      max: maxImmutability,
      min: Immutability.Mutable,
    };

    m_stack.push(
      createDoneChecker(m_snapshot, (m_objectType) => {
        assert(m_objectType.stage === SnapshotStage.ObjectProperties);
        assert("limits" in m_objectType);

        if (isTypeReferenceWithTypeArguments(m_objectType.typeData.type)) {
          m_objectType.stage = SnapshotStage.ObjectTypeReference;
          m_stack.push(m_objectType);
          return;
        }

        m_objectType.stage = SnapshotStage.ObjectIndexSignature;
        m_stack.push(m_objectType);
      }),
    );

    const properties = m_snapshot.typeData.type.getProperties();
    if (properties.length > 0) {
      for (const property of properties) {
        if (
          isPropertyReadonlyInType(
            m_snapshot.typeData.type,
            property.getEscapedName(),
            checker,
          ) ||
          // Ignore "length" for tuples.
          // TODO: Report this issue to upstream.
          ((property.escapedName as string) === "length" &&
            checker.isTupleType(m_snapshot.typeData.type))
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
            m_snapshot.limits.max = min(
              m_snapshot.limits.max,
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
            m_snapshot.limits.max = min(
              m_snapshot.limits.max,
              Immutability.ReadonlyDeep,
            );
            continue;
          }
        }

        m_snapshot.immutability = Immutability.Mutable;
        return;
      }
    }

    const propertyNodes = new Map<string, ts.TypeNode>(
      m_snapshot.typeData.typeNode !== null &&
      hasType(m_snapshot.typeData.typeNode) &&
      m_snapshot.typeData.typeNode.type !== undefined &&
      ts.isTypeLiteralNode(m_snapshot.typeData.typeNode.type)
        ? m_snapshot.typeData.typeNode.type.members
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
          m_snapshot.typeData.type,
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

        return createSnapshot(getTypeData(propertyType, propertyTypeNode));
      })
      .filter((snapshot): snapshot is SnapshotBase => snapshot !== null);

    if (children.length > 0) {
      m_snapshot.limits.min = Immutability.ReadonlyShallow;

      m_stack.push(
        createChildrenReducer(m_snapshot, children, min),
        ...children,
      );
    }
  }

  function handleTypeObjectTypeReference(m_snapshot: Snapshot) {
    assert(m_snapshot.stage === SnapshotStage.ObjectTypeReference);
    assert("limits" in m_snapshot);

    m_stack.push(
      createDoneChecker(m_snapshot, (m_objectType) => {
        assert(m_objectType.stage === SnapshotStage.ObjectTypeReference);
        m_objectType.stage = SnapshotStage.ObjectIndexSignature;
        m_stack.push(m_objectType);
      }),
    );
    handleTypeArguments(m_snapshot);
  }

  function handleTypeObjectIndexSignature(m_snapshot: Snapshot) {
    assert(m_snapshot.stage === SnapshotStage.ObjectIndexSignature);
    assert("limits" in m_snapshot);
    assert(
      m_snapshot.typeData.typeNode === null ||
        isIntersectionType(m_snapshot.typeData.type) ===
          ts.isIntersectionTypeNode(m_snapshot.typeData.typeNode),
    );

    const [types, typeNodes] = isIntersectionType(m_snapshot.typeData.type)
      ? [
          m_snapshot.typeData.type.types,
          (m_snapshot.typeData.typeNode as ts.IntersectionTypeNode | null)
            ?.types,
        ]
      : [
          [m_snapshot.typeData.type],
          m_snapshot.typeData.typeNode === null
            ? undefined
            : [m_snapshot.typeData.typeNode],
        ];

    m_stack.push(
      createDoneChecker(m_snapshot, (m_objectType) => {
        assert(m_objectType.stage === SnapshotStage.ObjectIndexSignature);

        m_objectType.stage = SnapshotStage.Done;
        m_objectType.immutability = max(
          m_objectType.limits.min,
          m_objectType.limits.max,
        );
        m_stack.push(m_objectType);
      }),
      createDoneChecker(m_snapshot, (m_objectType) => {
        assert(m_objectType.stage === SnapshotStage.ObjectIndexSignature);
        assert("limits" in m_objectType);

        const children = types.flatMap((type, index) =>
          createIndexSignatureSnapshots(
            m_objectType,
            ts.IndexKind.Number,
            getTypeData(type, typeNodes?.[index]),
          ),
        );
        if (children.length > 0) {
          m_stack.push(
            createChildrenReducer(m_objectType, children, max),
            ...children,
          );
        }
      }),
    );

    const children = types.flatMap((type, index) =>
      createIndexSignatureSnapshots(
        m_snapshot,
        ts.IndexKind.String,
        getTypeData(type, typeNodes?.[index]),
      ),
    );
    if (children.length > 0) {
      m_stack.push(
        createChildrenReducer(m_snapshot, children, max),
        ...children,
      );
    }
  }

  function handleTypeObjectCheckDone(m_snapshot: Snapshot) {
    assert("snapshot" in m_snapshot);
    assert("limits" in m_snapshot.snapshot);
    assert("notDoneAction" in m_snapshot);

    if (m_PreviousImmutability !== Immutability.Calculating) {
      m_snapshot.snapshot.limits.max = min(
        m_snapshot.snapshot.limits.max,
        m_PreviousImmutability,
      );
      if (m_snapshot.snapshot.limits.min >= m_snapshot.snapshot.limits.max) {
        m_snapshot.snapshot.immutability = m_snapshot.snapshot.limits.min;
        return;
      }
    }

    m_snapshot.notDoneAction(m_snapshot.snapshot);
  }

  function handleTypeArguments(m_snapshot: Snapshot) {
    assert("typeData" in m_snapshot);
    assert(isTypeReferenceWithTypeArguments(m_snapshot.typeData.type));

    const children = m_snapshot.typeData.type.typeArguments.map((type) =>
      createSnapshot(getTypeData(type, undefined)),
    );
    m_stack.push(createChildrenReducer(m_snapshot, children, min), ...children);
  }

  function createIndexSignatureSnapshots(
    m_snapshot: SnapshotBase,
    kind: ts.IndexKind,
    typeData: TypeData,
  ): Array<Exclude<Snapshot, SnapshotCheckDone | SnapshotCheckOverride>> {
    const indexInfo = checker.getIndexInfoOfType(typeData.type, kind);
    if (indexInfo === undefined) {
      m_snapshot.immutability = Immutability.Unknown;
      return [];
    }

    if (maxImmutability <= Immutability.ReadonlyShallow) {
      m_snapshot.immutability = Immutability.ReadonlyShallow;
      return [];
    }

    if (indexInfo.isReadonly) {
      if (indexInfo.type === typeData.type) {
        m_snapshot.immutability = maxImmutability;
        return [];
      }

      const child = createSnapshot(
        getTypeData(indexInfo.type, undefined), // TODO: can we get a type node for this?
      );

      return [
        createChildrenReducer(
          m_snapshot,
          [{ immutability: Immutability.ReadonlyShallow }, child],
          max,
        ),
        child,
      ];
    }

    m_snapshot.immutability = Immutability.Mutable;
    return [];
  }

  function handleTypePrimitive(m_snapshot: Snapshot) {
    assert("immutability" in m_snapshot);
    m_snapshot.immutability = Immutability.Immutable;
  }

  /**
   * Get the override for the type if it has one.
   */
  function getOverride(m_snapshot: Snapshot) {
    assert("typeData" in m_snapshot);
    return overrides.find((potentialOverride) =>
      typeMatchesSpecifier(
        m_snapshot.typeData,
        potentialOverride.type,
        program,
      ),
    );
  }

  function reduceChildren(m_snapshot: Snapshot): void {
    assert("children" in m_snapshot && "childrenReducer" in m_snapshot);
    assert(cast<SnapshotChildren>(m_snapshot));

    m_snapshot.immutability = (
      m_snapshot.children[0] ?? assert.fail("no children")
    ).immutability;
    for (let m_index = 1; m_index < m_snapshot.children.length; m_index++) {
      m_snapshot.immutability = m_snapshot.childrenReducer(
        m_snapshot.immutability,
        m_snapshot.children[m_index]!.immutability,
      );
    }
  }
}

/**
 * Is type a (non-namespace) function?
 */
function isFunction(type: ts.Type) {
  return (
    type.getCallSignatures().length > 0 && type.getProperties().length === 0
  );
}

function isTypeReferenceWithTypeArguments(
  type: ts.Type,
): type is ts.TypeReference & {
  typeArguments: NonNullable<ts.TypeReference["typeArguments"]>;
} {
  return (
    isTypeReference(type) &&
    type.typeArguments !== undefined &&
    type.typeArguments.length > 0
  );
}
