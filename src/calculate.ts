import assert from "node:assert";

import { getTypeOfPropertyOfType } from "@typescript-eslint/type-utils";
import { ESLintUtils } from "@typescript-eslint/utils";
import {
  isConditionalType,
  isObjectType,
  isUnionType,
  unionTypeParts,
  isPropertyReadonlyInType,
  isSymbolFlagSet,
  isIntersectionType,
  isPropertySignature,
  isFunctionTypeNode,
  isTypeReference,
} from "tsutils";
import ts from "typescript";

import {
  Immutableness,
  getMaxImmutableness,
  getMinImmutableness,
} from "./immutableness";
import { hasSymbol, typeToString } from "./utils";

/**
 * A list of immutableness overrides.
 */
export type ImmutablenessOverrides = ReadonlyArray<
  (
    | {
        name: string;
      }
    | {
        pattern: RegExp;
      }
  ) & {
    to: Immutableness;
    from?: Immutableness;
  }
>;

type ImmutablenessOverridesFlattened = ImmutablenessOverrides &
  ReadonlyArray<{
    name?: string;
    pattern?: RegExp;
  }>;

/**
 * The default overrides that are applied.
 */
export const defaultOverrides: ImmutablenessOverrides = [
  { name: "Map", to: Immutableness.Mutable },
  { name: "Set", to: Immutableness.Mutable },
];

/**
 * A cache used to keep track of what types have already been calculated.
 */
export type ImmutablenessCache = Map<ts.Type, Immutableness>;

/**
 * Get the immutableness of the given type.
 */
export function getTypeImmutableness(
  checker: ts.TypeChecker,
  type: ts.Type,
  overrides: ImmutablenessOverrides = defaultOverrides,
  cache: ImmutablenessCache = new Map()
): Immutableness {
  const cached = cache.get(type);
  if (cached !== undefined) {
    return cached;
  }

  const override = getOverride(checker, type, overrides);
  const overrideTo = override?.to;
  const overrideFrom = override?.from;

  if (
    overrideTo !== undefined &&
    (overrideFrom === undefined ||
      (overrideFrom <= overrideTo && overrideTo <= Immutableness.Mutable))
  ) {
    cache.set(type, overrideTo);
    return overrideTo;
  }

  cache.set(type, Immutableness.Unknown);

  const immutableness = calculateTypeImmutableness(
    checker,
    type,
    overrides,
    cache
  );

  if (overrideTo !== undefined) {
    assert(overrideFrom !== undefined);
    if (overrideFrom <= overrideTo) {
      if (immutableness >= overrideFrom) {
        cache.set(type, overrideTo);
        return overrideTo;
      }
    } else if (immutableness <= overrideFrom) {
      cache.set(type, overrideTo);
      return overrideTo;
    }
  }

  cache.set(type, immutableness);
  return immutableness;
}

/**
 * Get the override for the type if it has one.
 */
function getOverride(
  checker: ts.TypeChecker,
  type: ts.Type,
  overrides: ImmutablenessOverridesFlattened
) {
  const { name, nameWithArguments, alias, aliasWithArguments } = typeToString(
    checker,
    type
  );

  for (const potentialOverride of overrides) {
    if (
      potentialOverride.name === name ||
      potentialOverride.pattern?.test(nameWithArguments ?? name) === true ||
      (alias !== undefined &&
        (potentialOverride.name === alias ||
          potentialOverride.pattern?.test(alias) === true)) ||
      (aliasWithArguments !== undefined &&
        potentialOverride.pattern?.test(aliasWithArguments) === true)
    ) {
      return potentialOverride;
    }
  }

  return undefined;
}

/**
 * Calculated the immutableness of the given type.
 */
function calculateTypeImmutableness(
  checker: ts.TypeChecker,
  type: ts.Type,
  overrides: ImmutablenessOverrides = defaultOverrides,
  cache: ImmutablenessCache
): Immutableness {
  // Union?
  if (isUnionType(type)) {
    return unionTypeParts(type)
      .map((t) => getTypeImmutableness(checker, t, overrides, cache))
      .reduce(getMinImmutableness);
  }

  // Intersection?
  if (isIntersectionType(type)) {
    return objectImmutableness(checker, type, overrides, cache);
  }

  // Conditional?
  if (isConditionalType(type)) {
    return [type.root.node.trueType, type.root.node.falseType]
      .map((tn) => {
        const t = checker.getTypeFromTypeNode(tn);
        return getTypeImmutableness(checker, t, overrides, cache);
      })
      .reduce(getMinImmutableness);
  }

  // (Non-namespace) Function?
  if (
    type.getCallSignatures().length > 0 &&
    type.getProperties().length === 0
  ) {
    return Immutableness.Immutable;
  }

  // Tuple?
  if (checker.isTupleType(type)) {
    if (!type.target.readonly) {
      return Immutableness.Mutable;
    }

    return arrayImmutableness(checker, type, overrides, cache);
  }

  // Array?
  if (checker.isArrayType(type)) {
    return arrayImmutableness(checker, type, overrides, cache);
  }

  // Other type of object?
  if (isObjectType(type)) {
    return objectImmutableness(checker, type, overrides, cache);
  }

  // Must be a primitive.
  return Immutableness.Immutable;
}

/**
 * Get the immutableness of the given array.
 */
function arrayImmutableness(
  checker: ts.TypeChecker,
  type: ts.TypeReference,
  overrides: ImmutablenessOverrides,
  cache: ImmutablenessCache
): -1 | Immutableness {
  const shallowImmutableness = objectImmutableness(
    checker,
    type,
    overrides,
    cache
  );
  if (shallowImmutableness === Immutableness.Mutable) {
    return shallowImmutableness;
  }

  const deepImmutableness = typeArgumentsImmutableness(
    checker,
    type,
    overrides,
    cache
  );

  return getMaxImmutableness(
    Immutableness.ReadonlyShallow,
    getMinImmutableness(shallowImmutableness, deepImmutableness)
  );
}

/**
 * Get the immutableness of the given object.
 */
function objectImmutableness(
  checker: ts.TypeChecker,
  type: ts.Type,
  overrides: ImmutablenessOverrides,
  cache: ImmutablenessCache
): Immutableness {
  let m_maxImmutableness = Immutableness.Immutable;
  let m_minImmutableness = Immutableness.Mutable;

  const properties = type.getProperties();
  if (properties.length > 0) {
    for (const property of properties) {
      if (
        isPropertyReadonlyInType(type, property.getEscapedName(), checker) ||
        // Ignore "length" for tuples.
        // TODO: Report this issue to upstream.
        (property.escapedName === "length" && checker.isTupleType(type))
      ) {
        continue;
      }

      const name = ts.getNameOfDeclaration(property.valueDeclaration);
      if (name !== undefined && ts.isPrivateIdentifier(name)) {
        continue;
      }

      if (
        property.valueDeclaration !== undefined &&
        hasSymbol(property.valueDeclaration) &&
        isSymbolFlagSet(property.valueDeclaration.symbol, ts.SymbolFlags.Method)
      ) {
        m_maxImmutableness = getMinImmutableness(
          m_maxImmutableness,
          Immutableness.ReadonlyDeep
        );
        continue;
      }

      const lastDeclaration = property.getDeclarations()?.at(-1);
      if (
        lastDeclaration !== undefined &&
        isPropertySignature(lastDeclaration) &&
        lastDeclaration.type !== undefined &&
        isFunctionTypeNode(lastDeclaration.type)
      ) {
        m_maxImmutableness = getMinImmutableness(
          m_maxImmutableness,
          Immutableness.ReadonlyDeep
        );
        continue;
      }

      return Immutableness.Mutable;
    }

    m_minImmutableness = Immutableness.ReadonlyShallow;

    for (const property of properties) {
      const propertyType = ESLintUtils.nullThrows(
        getTypeOfPropertyOfType(checker, type, property),
        ESLintUtils.NullThrowsReasons.MissingToken(
          `property "${property.name}"`,
          "type"
        )
      );

      const result = getTypeImmutableness(
        checker,
        propertyType,
        overrides,
        cache
      );
      m_maxImmutableness = getMinImmutableness(m_maxImmutableness, result);
      if (m_minImmutableness >= m_maxImmutableness) {
        return m_minImmutableness;
      }
    }
  }

  if (isTypeReference(type)) {
    const result = typeArgumentsImmutableness(checker, type, overrides, cache);
    m_maxImmutableness = getMinImmutableness(m_maxImmutableness, result);
    if (m_minImmutableness >= m_maxImmutableness) {
      return m_minImmutableness;
    }
  }

  const stringIndexSigImmutableness = indexSignatureImmutableness(
    checker,
    type,
    ts.IndexKind.String,
    overrides,
    cache
  );
  m_maxImmutableness = getMinImmutableness(
    stringIndexSigImmutableness,
    m_maxImmutableness
  );
  if (m_minImmutableness >= m_maxImmutableness) {
    return m_minImmutableness;
  }

  const numberIndexSigImmutableness = indexSignatureImmutableness(
    checker,
    type,
    ts.IndexKind.Number,
    overrides,
    cache
  );
  m_maxImmutableness = getMinImmutableness(
    numberIndexSigImmutableness,
    m_maxImmutableness
  );
  if (m_minImmutableness >= m_maxImmutableness) {
    return m_minImmutableness;
  }

  return getMaxImmutableness(m_minImmutableness, m_maxImmutableness);
}

/**
 * Get the immutableness of the given type arguments.
 */
function typeArgumentsImmutableness(
  checker: ts.TypeChecker,
  type: ts.TypeReference,
  overrides: ImmutablenessOverrides,
  cache: ImmutablenessCache
): Immutableness {
  const typeArguments = checker.getTypeArguments(type);
  if (typeArguments.length > 0) {
    return typeArguments
      .map((t) => getTypeImmutableness(checker, t, overrides, cache))
      .reduce(getMinImmutableness);
  }

  return Immutableness.Unknown;
}

/**
 * Get the immutableness of the given index signature.
 */
function indexSignatureImmutableness(
  checker: ts.TypeChecker,
  type: ts.Type,
  kind: ts.IndexKind,
  overrides: ImmutablenessOverrides,
  cache: ImmutablenessCache
): Immutableness {
  const indexInfo = checker.getIndexInfoOfType(type, kind);
  if (indexInfo === undefined) {
    return Immutableness.Unknown;
  }

  if (indexInfo.isReadonly) {
    return getMaxImmutableness(
      Immutableness.ReadonlyShallow,
      getTypeImmutableness(checker, indexInfo.type, overrides, cache)
    );
  }

  return Immutableness.Mutable;
}
