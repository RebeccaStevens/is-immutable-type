import assert from "node:assert/strict";

import { getTypeOfPropertyOfType } from "@typescript-eslint/type-utils";
import {
  isConditionalType,
  isObjectType,
  isUnionType,
  isPropertyReadonlyInType,
  isSymbolFlagSet,
  isIntersectionType,
  isTypeReference,
  isIntrinsicType,
} from "ts-api-utils";
import ts from "typescript";

import { max, min, clamp } from "./compare";
import { Immutability } from "./immutability";
import {
  type TypeData,
  type TypeSpecifier,
  asTypeData,
  cacheData,
  getCachedData,
  getTypeData,
  hasSymbol,
  typeMatchesSpecifier,
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
  const typeData = getTypeData(program, typeOrTypeNode);
  return getTypeImmutabilityHelper(
    program,
    typeData,
    overrides,
    useCache,
    maxImmutability,
  );
}

/**
 * Get the immutability of the given type data.
 */
function getTypeImmutabilityHelper(
  program: ts.Program,
  typeData: Readonly<TypeData>,
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

  const cached = getCachedData(program, cache, typeData);
  if (cached !== undefined) {
    return cached;
  }

  const override = getOverride(program, typeData, overrides);
  const overrideTo = override?.to;
  const overrideFrom = override?.from;

  // Early escape if we don't need to check the override from.
  if (overrideTo !== undefined && overrideFrom === undefined) {
    cacheData(program, cache, typeData, overrideTo);
    return overrideTo;
  }

  cacheData(program, cache, typeData, Immutability.Calculating);

  const immutability = calculateTypeImmutability(
    program,
    typeData,
    overrides,
    cache,
    maxImmutability,
  );

  if (overrideTo !== undefined) {
    assert(overrideFrom !== undefined);
    if (
      (overrideFrom <= immutability && immutability <= overrideTo) ||
      (overrideFrom >= immutability && immutability >= overrideTo)
    ) {
      cacheData(program, cache, typeData, overrideTo);
      return overrideTo;
    }
  }

  cacheData(program, cache, typeData, immutability);
  return immutability;
}

/**
 * Get the override for the type if it has one.
 */
function getOverride(
  program: ts.Program,
  typeData: Readonly<TypeData>,
  overrides: ImmutabilityOverrides,
) {
  return overrides.find((potentialOverride) =>
    typeMatchesSpecifier(typeData, potentialOverride.type, program),
  );
}

/**
 * Calculated the immutability of the given type.
 */
function calculateTypeImmutability(
  program: ts.Program,
  typeData: Readonly<TypeData>,
  overrides: ImmutabilityOverrides,
  cache: ImmutabilityCache,
  maxImmutability: Immutability,
): Immutability {
  // Union?
  if (isUnionType(typeData.type)) {
    const typeLikes =
      (typeData.typeNode as ts.UnionTypeNode | undefined)?.types ??
      typeData.type.types;
    return typeLikes
      .map((t) =>
        getTypeImmutabilityHelper(
          program,
          getTypeData(program, t),
          overrides,
          cache,
          maxImmutability,
        ),
      )
      .reduce(min);
  }

  // Intersection?
  if (isIntersectionType(typeData.type)) {
    return objectImmutability(
      program,
      typeData,
      overrides,
      cache,
      maxImmutability,
    );
  }

  // Conditional?
  if (isConditionalType(typeData.type)) {
    return [typeData.type.root.node.trueType, typeData.type.root.node.falseType]
      .map((t) => {
        return getTypeImmutabilityHelper(
          program,
          getTypeData(program, t),
          overrides,
          cache,
          maxImmutability,
        );
      })
      .reduce(min);
  }

  // (Non-namespace) Function?
  if (
    typeData.type.getCallSignatures().length > 0 &&
    typeData.type.getProperties().length === 0
  ) {
    return Immutability.Immutable;
  }

  const checker = program.getTypeChecker();

  // Tuple?
  if (checker.isTupleType(typeData.type)) {
    if (!typeData.type.target.readonly) {
      return Immutability.Mutable;
    }

    return arrayImmutability(
      program,
      typeData as Readonly<
        TypeData & {
          type: ts.TypeReference;
        }
      >,
      overrides,
      cache,
      maxImmutability,
    );
  }

  // Array?
  if (checker.isArrayType(typeData.type)) {
    return arrayImmutability(
      program,
      typeData as Readonly<
        TypeData & {
          type: ts.TypeReference;
        }
      >,
      overrides,
      cache,
      maxImmutability,
    );
  }

  // Other type of object?
  if (isObjectType(typeData.type)) {
    return objectImmutability(
      program,
      typeData,
      overrides,
      cache,
      maxImmutability,
    );
  }

  // Must be a primitive.
  return Immutability.Immutable;
}

/**
 * Get the immutability of the given array.
 */
function arrayImmutability(
  program: ts.Program,
  typeData: Readonly<
    TypeData & {
      type: ts.TypeReference;
    }
  >,
  overrides: ImmutabilityOverrides,
  cache: ImmutabilityCache,
  maxImmutability: Immutability,
): Immutability {
  const shallowImmutability = objectImmutability(
    program,
    typeData,
    overrides,
    cache,
    maxImmutability,
  );
  if (
    shallowImmutability <= Immutability.ReadonlyShallow ||
    shallowImmutability >= maxImmutability
  ) {
    return shallowImmutability;
  }

  const deepImmutability = typeArgumentsImmutability(
    program,
    typeData.type,
    overrides,
    cache,
    maxImmutability,
  );

  return clamp(
    Immutability.ReadonlyShallow,
    deepImmutability,
    shallowImmutability,
  );
}

/**
 * Get the immutability of the given object.
 */
function objectImmutability(
  program: ts.Program,
  typeData: Readonly<TypeData>,
  overrides: ImmutabilityOverrides,
  cache: ImmutabilityCache,
  maxImmutability: Immutability,
): Immutability {
  const checker = program.getTypeChecker();

  let m_maxImmutability = maxImmutability;
  let m_minImmutability = Immutability.Mutable;

  const properties = typeData.type.getProperties();
  // eslint-disable-next-line functional/no-conditional-statements
  if (properties.length > 0) {
    // eslint-disable-next-line functional/no-loop-statements
    for (const property of properties) {
      if (
        isPropertyReadonlyInType(
          typeData.type,
          property.getEscapedName(),
          checker,
        ) ||
        // Ignore "length" for tuples.
        // TODO: Report this issue to upstream.
        (property.escapedName === "length" &&
          checker.isTupleType(typeData.type))
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
          m_maxImmutability = min(m_maxImmutability, Immutability.ReadonlyDeep);
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
          m_maxImmutability = min(m_maxImmutability, Immutability.ReadonlyDeep);
          continue;
        }
      }

      return Immutability.Mutable;
    }

    m_minImmutability = Immutability.ReadonlyShallow;

    // eslint-disable-next-line functional/no-loop-statements
    for (const property of properties) {
      const propertyType = getTypeOfPropertyOfType(
        checker,
        typeData.type,
        property,
      );
      if (
        propertyType === undefined ||
        (isIntrinsicType(propertyType) &&
          propertyType.intrinsicName === "error")
      ) {
        continue;
      }

      const result = getTypeImmutabilityHelper(
        program,
        asTypeData(propertyType),
        overrides,
        cache,
        maxImmutability,
      );
      m_maxImmutability = min(m_maxImmutability, result);
      if (m_minImmutability >= m_maxImmutability) {
        return m_minImmutability;
      }
    }
  }

  if (isTypeReference(typeData.type)) {
    const result = typeArgumentsImmutability(
      program,
      typeData.type,
      overrides,
      cache,
      maxImmutability,
    );
    m_maxImmutability = min(m_maxImmutability, result);
    if (m_minImmutability >= m_maxImmutability) {
      return m_minImmutability;
    }
  }

  const types = isIntersectionType(typeData.type)
    ? (typeData.typeNode as ts.IntersectionTypeNode | undefined)?.types ??
      typeData.type.types
    : [typeData.typeNode ?? typeData.type];

  const stringIndexSigImmutability = types
    .map((t) =>
      indexSignatureImmutability(
        program,
        getTypeData(program, t),
        ts.IndexKind.String,
        overrides,
        cache,
        maxImmutability,
      ),
    )
    .reduce(max);

  m_maxImmutability = min(stringIndexSigImmutability, m_maxImmutability);
  if (m_minImmutability >= m_maxImmutability) {
    return m_minImmutability;
  }

  const numberIndexSigImmutability = types
    .map((t) =>
      indexSignatureImmutability(
        program,
        getTypeData(program, t),
        ts.IndexKind.Number,
        overrides,
        cache,
        maxImmutability,
      ),
    )
    .reduce(max);

  m_maxImmutability = min(numberIndexSigImmutability, m_maxImmutability);
  if (m_minImmutability >= m_maxImmutability) {
    return m_minImmutability;
  }

  return max(m_minImmutability, m_maxImmutability);
}

/**
 * Get the immutability of the given type arguments.
 */
function typeArgumentsImmutability(
  program: ts.Program,
  type: ts.TypeReference,
  overrides: ImmutabilityOverrides,
  cache: ImmutabilityCache,
  maxImmutability: Immutability,
): Immutability {
  const { typeArguments } = type;
  if (typeArguments !== undefined && typeArguments.length > 0) {
    return typeArguments
      .map((t) =>
        getTypeImmutabilityHelper(
          program,
          getTypeData(program, t),
          overrides,
          cache,
          maxImmutability,
        ),
      )
      .reduce(min);
  }

  return Immutability.Unknown;
}

/**
 * Get the immutability of the given index signature.
 */
function indexSignatureImmutability(
  program: ts.Program,
  typeData: Readonly<TypeData>,
  kind: ts.IndexKind,
  overrides: ImmutabilityOverrides,
  cache: ImmutabilityCache,
  maxImmutability: Immutability,
): Immutability {
  const checker = program.getTypeChecker();
  const indexInfo = checker.getIndexInfoOfType(typeData.type, kind);
  if (indexInfo === undefined) {
    return Immutability.Unknown;
  }

  if (maxImmutability <= Immutability.ReadonlyShallow) {
    return Immutability.ReadonlyShallow;
  }

  if (indexInfo.isReadonly) {
    if (indexInfo.type === typeData.type) {
      return maxImmutability;
    }

    return max(
      Immutability.ReadonlyShallow,
      getTypeImmutabilityHelper(
        program,
        asTypeData(indexInfo.type),
        overrides,
        cache,
        maxImmutability,
      ),
    );
  }

  return Immutability.Mutable;
}
