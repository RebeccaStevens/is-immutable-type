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

import { max, min, clamp } from "./compare";
import { Immutability } from "./immutability";
import { hasSymbol, typeToString } from "./utils";

/**
 * A list of immutability overrides.
 */
export type ImmutabilityOverrides = ReadonlyArray<
  (
    | {
        name: string;
        pattern?: undefined;
      }
    | {
        name?: undefined;
        pattern: RegExp;
      }
  ) & {
    to: Immutability;
    from?: Immutability;
  }
>;

/**
 * Get the default overrides that are applied.
 */
export function getDefaultOverrides(): ImmutabilityOverrides {
  return [
    { name: "Map", to: Immutability.Mutable },
    { name: "Set", to: Immutability.Mutable },
  ];
}

/**
 * A cache used to keep track of what types have already been calculated.
 */
export type ImmutabilityCache = WeakMap<ts.Type, Immutability>;

/**
 * A global cache that can be used between consumers.
 */
const globalCache: ImmutabilityCache = new WeakMap();

/**
 * Get the immutability of the given type.
 *
 * @param checker - The TypeScript Type Checker to use.
 * @param type - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
export function getTypeImmutability(
  checker: ts.TypeChecker,
  type: ts.Type,
  overrides: ImmutabilityOverrides = getDefaultOverrides(),
  useCache: ImmutabilityCache | boolean = true
): Immutability {
  const cache: ImmutabilityCache =
    useCache === true
      ? globalCache
      : useCache === false
      ? new WeakMap()
      : useCache;

  const cached = cache.get(type);
  if (cached !== undefined) {
    return cached;
  }

  const override = getOverride(checker, type, overrides);
  const overrideTo = override?.to;
  const overrideFrom = override?.from;

  // Early escape if we don't need to check the override from.
  if (overrideTo !== undefined && overrideFrom === undefined) {
    cache.set(type, overrideTo);
    return overrideTo;
  }

  cache.set(type, Immutability.Unknown);

  const immutability = calculateTypeImmutability(
    checker,
    type,
    overrides,
    cache
  );

  if (overrideTo !== undefined) {
    assert(overrideFrom !== undefined);
    if (
      (overrideFrom <= immutability && immutability <= overrideTo) ||
      (overrideFrom >= immutability && immutability >= overrideTo)
    ) {
      cache.set(type, overrideTo);
      return overrideTo;
    }
  }

  cache.set(type, immutability);
  return immutability;
}

/**
 * Get the override for the type if it has one.
 */
function getOverride(
  checker: ts.TypeChecker,
  type: ts.Type,
  overrides: ImmutabilityOverrides
) {
  const { name, nameWithArguments, alias, aliasWithArguments } = typeToString(
    checker,
    type
  );

  for (const potentialOverride of overrides) {
    if (
      (name !== undefined &&
        (potentialOverride.name === name ||
          potentialOverride.pattern?.test(nameWithArguments ?? name) ===
            true)) ||
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
 * Calculated the immutability of the given type.
 */
function calculateTypeImmutability(
  checker: ts.TypeChecker,
  type: ts.Type,
  overrides: ImmutabilityOverrides,
  cache: ImmutabilityCache
): Immutability {
  // Union?
  if (isUnionType(type)) {
    return unionTypeParts(type)
      .map((t) => getTypeImmutability(checker, t, overrides, cache))
      .reduce(min);
  }

  // Intersection?
  if (isIntersectionType(type)) {
    return objectImmutability(checker, type, overrides, cache);
  }

  // Conditional?
  if (isConditionalType(type)) {
    return [type.root.node.trueType, type.root.node.falseType]
      .map((tn) => {
        const t = checker.getTypeFromTypeNode(tn);
        return getTypeImmutability(checker, t, overrides, cache);
      })
      .reduce(min);
  }

  // (Non-namespace) Function?
  if (
    type.getCallSignatures().length > 0 &&
    type.getProperties().length === 0
  ) {
    return Immutability.Immutable;
  }

  // Tuple?
  if (checker.isTupleType(type)) {
    if (!type.target.readonly) {
      return Immutability.Mutable;
    }

    return arrayImmutability(checker, type, overrides, cache);
  }

  // Array?
  if (checker.isArrayType(type)) {
    return arrayImmutability(checker, type, overrides, cache);
  }

  // Other type of object?
  if (isObjectType(type)) {
    return objectImmutability(checker, type, overrides, cache);
  }

  // Must be a primitive.
  return Immutability.Immutable;
}

/**
 * Get the immutability of the given array.
 */
function arrayImmutability(
  checker: ts.TypeChecker,
  type: ts.TypeReference,
  overrides: ImmutabilityOverrides,
  cache: ImmutabilityCache
): Immutability {
  const shallowImmutability = objectImmutability(
    checker,
    type,
    overrides,
    cache
  );
  if (shallowImmutability === Immutability.Mutable) {
    return shallowImmutability;
  }

  const deepImmutability = typeArgumentsImmutability(
    checker,
    type,
    overrides,
    cache
  );

  return clamp(
    shallowImmutability,
    deepImmutability,
    Immutability.ReadonlyShallow
  );
}

/**
 * Get the immutability of the given object.
 */
function objectImmutability(
  checker: ts.TypeChecker,
  type: ts.Type,
  overrides: ImmutabilityOverrides,
  cache: ImmutabilityCache
): Immutability {
  let m_maxImmutability = Immutability.Immutable;
  let m_minImmutability = Immutability.Mutable;

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
        m_maxImmutability = min(m_maxImmutability, Immutability.ReadonlyDeep);
        continue;
      }

      const lastDeclaration = property.getDeclarations()?.at(-1);
      if (
        lastDeclaration !== undefined &&
        isPropertySignature(lastDeclaration) &&
        lastDeclaration.type !== undefined &&
        isFunctionTypeNode(lastDeclaration.type)
      ) {
        m_maxImmutability = min(m_maxImmutability, Immutability.ReadonlyDeep);
        continue;
      }

      return Immutability.Mutable;
    }

    m_minImmutability = Immutability.ReadonlyShallow;

    for (const property of properties) {
      const propertyType = ESLintUtils.nullThrows(
        getTypeOfPropertyOfType(checker, type, property),
        ESLintUtils.NullThrowsReasons.MissingToken(
          `property "${property.name}"`,
          "type"
        )
      );

      const result = getTypeImmutability(
        checker,
        propertyType,
        overrides,
        cache
      );
      m_maxImmutability = min(m_maxImmutability, result);
      if (m_minImmutability >= m_maxImmutability) {
        return m_minImmutability;
      }
    }
  }

  if (isTypeReference(type)) {
    const result = typeArgumentsImmutability(checker, type, overrides, cache);
    m_maxImmutability = min(m_maxImmutability, result);
    if (m_minImmutability >= m_maxImmutability) {
      return m_minImmutability;
    }
  }

  const stringIndexSigImmutability = indexSignatureImmutability(
    checker,
    type,
    ts.IndexKind.String,
    overrides,
    cache
  );
  m_maxImmutability = min(stringIndexSigImmutability, m_maxImmutability);
  if (m_minImmutability >= m_maxImmutability) {
    return m_minImmutability;
  }

  const numberIndexSigImmutability = indexSignatureImmutability(
    checker,
    type,
    ts.IndexKind.Number,
    overrides,
    cache
  );
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
  checker: ts.TypeChecker,
  type: ts.TypeReference,
  overrides: ImmutabilityOverrides,
  cache: ImmutabilityCache
): Immutability {
  const typeArguments = checker.getTypeArguments(type);
  if (typeArguments.length > 0) {
    return typeArguments
      .map((t) => getTypeImmutability(checker, t, overrides, cache))
      .reduce(min);
  }

  return Immutability.Unknown;
}

/**
 * Get the immutability of the given index signature.
 */
function indexSignatureImmutability(
  checker: ts.TypeChecker,
  type: ts.Type,
  kind: ts.IndexKind,
  overrides: ImmutabilityOverrides,
  cache: ImmutabilityCache
): Immutability {
  const indexInfo = checker.getIndexInfoOfType(type, kind);
  if (indexInfo === undefined) {
    return Immutability.Unknown;
  }

  if (indexInfo.isReadonly) {
    return max(
      Immutability.ReadonlyShallow,
      getTypeImmutability(checker, indexInfo.type, overrides, cache)
    );
  }

  return Immutability.Mutable;
}
