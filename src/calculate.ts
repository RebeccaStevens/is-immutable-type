import assert from "node:assert";

import { getTypeOfPropertyOfType } from "@typescript-eslint/type-utils";
import {
  isConditionalType,
  isObjectType,
  isUnionType,
  isPropertyReadonlyInType,
  isSymbolFlagSet,
  isIntersectionType,
  isTypeReference,
} from "ts-api-utils";
import ts from "typescript";

import { max, min, clamp } from "./compare";
import { Immutability } from "./immutability";
import { hasSymbol, isTypeNode, typeToString } from "./utils";

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
    { name: "Date", to: Immutability.Mutable },
    { name: "URL", to: Immutability.Mutable },
    { name: "URLSearchParams", to: Immutability.Mutable },
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
 * Cache a type's immutability.
 */
function cacheTypeImmutability(
  program: ts.Program,
  cache: ImmutabilityCache,
  type: Readonly<ts.Type>,
  value: Immutability
) {
  const checker = program.getTypeChecker();
  const identity = checker.getRecursionIdentity(type);
  cache.set(identity, value);
}

/**
 * Get a type's cashed immutability.
 */
function getCachedTypeImmutability(
  program: ts.Program,
  cache: ImmutabilityCache,
  type: Readonly<ts.Type>
) {
  const checker = program.getTypeChecker();
  const identity = checker.getRecursionIdentity(type);
  return cache.get(identity);
}

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
  maxImmutability = Immutability.Immutable
): Immutability {
  const checker = program.getTypeChecker();
  const cache: ImmutabilityCache =
    useCache === true
      ? globalCache
      : useCache === false
      ? new WeakMap()
      : useCache;

  const type = isTypeNode(typeOrTypeNode)
    ? checker.getTypeFromTypeNode(typeOrTypeNode)
    : typeOrTypeNode;
  const cached = getCachedTypeImmutability(program, cache, type);
  if (cached !== undefined) {
    return cached;
  }

  const override = getOverride(program, typeOrTypeNode, overrides);
  const overrideTo = override?.to;
  const overrideFrom = override?.from;

  // Early escape if we don't need to check the override from.
  if (overrideTo !== undefined && overrideFrom === undefined) {
    cacheTypeImmutability(program, cache, type, overrideTo);
    return overrideTo;
  }

  cacheTypeImmutability(program, cache, type, Immutability.Calculating);

  const immutability = calculateTypeImmutability(
    program,
    type,
    overrides,
    cache,
    maxImmutability
  );

  if (overrideTo !== undefined) {
    assert(overrideFrom !== undefined);
    if (
      (overrideFrom <= immutability && immutability <= overrideTo) ||
      (overrideFrom >= immutability && immutability >= overrideTo)
    ) {
      cacheTypeImmutability(program, cache, type, overrideTo);
      return overrideTo;
    }
  }

  cacheTypeImmutability(program, cache, type, immutability);
  return immutability;
}

/**
 * Get the override for the type if it has one.
 */
function getOverride(
  program: ts.Program,
  typeOrTypeNode: Readonly<ts.Type | ts.TypeNode>,
  overrides: ImmutabilityOverrides
) {
  const {
    name,
    nameWithArguments,
    alias,
    aliasWithArguments,
    evaluated,
    written,
  } = typeToString(program, typeOrTypeNode);

  return overrides.find((potentialOverride) => {
    return (
      (name !== undefined &&
        (potentialOverride.name === name ||
          potentialOverride.pattern?.test(nameWithArguments ?? name) ===
            true)) ||
      (alias !== undefined &&
        (potentialOverride.name === alias ||
          potentialOverride.pattern?.test(alias) === true)) ||
      (aliasWithArguments !== undefined &&
        potentialOverride.pattern?.test(aliasWithArguments) === true) ||
      potentialOverride.pattern?.test(evaluated) === true ||
      (written !== undefined &&
        potentialOverride.pattern?.test(written) === true)
    );
  });
}

/**
 * Calculated the immutability of the given type.
 */
function calculateTypeImmutability(
  program: ts.Program,
  type: Readonly<ts.Type>,
  overrides: ImmutabilityOverrides,
  cache: ImmutabilityCache,
  maxImmutability: Immutability
): Immutability {
  // Union?
  if (isUnionType(type)) {
    return type.types
      .map((t) =>
        getTypeImmutability(program, t, overrides, cache, maxImmutability)
      )
      .reduce(min);
  }

  // Intersection?
  if (isIntersectionType(type)) {
    return objectImmutability(program, type, overrides, cache, maxImmutability);
  }

  // Conditional?
  if (isConditionalType(type)) {
    const checker = program.getTypeChecker();
    return [type.root.node.trueType, type.root.node.falseType]
      .map((tn) => {
        const t = checker.getTypeFromTypeNode(tn);
        return getTypeImmutability(
          program,
          t,
          overrides,
          cache,
          maxImmutability
        );
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

  const checker = program.getTypeChecker();

  // Tuple?
  if (checker.isTupleType(type)) {
    if (!type.target.readonly) {
      return Immutability.Mutable;
    }

    return arrayImmutability(program, type, overrides, cache, maxImmutability);
  }

  // Array?
  if (checker.isArrayType(type)) {
    return arrayImmutability(program, type, overrides, cache, maxImmutability);
  }

  // Other type of object?
  if (isObjectType(type)) {
    return objectImmutability(program, type, overrides, cache, maxImmutability);
  }

  // Must be a primitive.
  return Immutability.Immutable;
}

/**
 * Get the immutability of the given array.
 */
function arrayImmutability(
  program: ts.Program,
  type: Readonly<ts.TypeReference>,
  overrides: ImmutabilityOverrides,
  cache: ImmutabilityCache,
  maxImmutability: Immutability
): Immutability {
  const shallowImmutability = objectImmutability(
    program,
    type,
    overrides,
    cache,
    maxImmutability
  );
  if (
    shallowImmutability === Immutability.Mutable ||
    shallowImmutability >= maxImmutability
  ) {
    return shallowImmutability;
  }

  const deepImmutability = typeArgumentsImmutability(
    program,
    type,
    overrides,
    cache,
    maxImmutability
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
  program: ts.Program,
  type: Readonly<ts.Type>,
  overrides: ImmutabilityOverrides,
  cache: ImmutabilityCache,
  maxImmutability: Immutability
): Immutability {
  const checker = program.getTypeChecker();

  let m_maxImmutability = maxImmutability;
  let m_minImmutability = Immutability.Mutable;

  const properties = type.getProperties();
  // eslint-disable-next-line functional/no-conditional-statements
  if (properties.length > 0) {
    // eslint-disable-next-line functional/no-loop-statements
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

      const declarations = property.getDeclarations() ?? [];
      if (declarations.length > 0) {
        if (
          declarations.some(
            (declaration) =>
              hasSymbol(declaration) &&
              isSymbolFlagSet(declaration.symbol, ts.SymbolFlags.Method)
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
              ts.isFunctionTypeNode(declaration.type)
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
      const propertyType = getTypeOfPropertyOfType(checker, type, property);
      if (propertyType === undefined) {
        return Immutability.Unknown;
      }

      const result = getTypeImmutability(
        program,
        propertyType,
        overrides,
        cache,
        maxImmutability
      );
      m_maxImmutability = min(m_maxImmutability, result);
      if (m_minImmutability >= m_maxImmutability) {
        return m_minImmutability;
      }
    }
  }

  if (isTypeReference(type)) {
    const result = typeArgumentsImmutability(
      program,
      type,
      overrides,
      cache,
      maxImmutability
    );
    m_maxImmutability = min(m_maxImmutability, result);
    if (m_minImmutability >= m_maxImmutability) {
      return m_minImmutability;
    }
  }

  const types = isIntersectionType(type) ? type.types : [type];

  const stringIndexSigImmutability = types
    .map((t) =>
      indexSignatureImmutability(
        program,
        t,
        ts.IndexKind.String,
        overrides,
        cache,
        maxImmutability
      )
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
        t,
        ts.IndexKind.Number,
        overrides,
        cache,
        maxImmutability
      )
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
  type: Readonly<ts.TypeReference>,
  overrides: ImmutabilityOverrides,
  cache: ImmutabilityCache,
  maxImmutability: Immutability
): Immutability {
  const checker = program.getTypeChecker();
  const typeArguments = checker.getTypeArguments(type);
  if (typeArguments.length > 0) {
    return typeArguments
      .map((t) =>
        getTypeImmutability(program, t, overrides, cache, maxImmutability)
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
  type: Readonly<ts.Type>,
  kind: ts.IndexKind,
  overrides: ImmutabilityOverrides,
  cache: ImmutabilityCache,
  maxImmutability: Immutability
): Immutability {
  const checker = program.getTypeChecker();
  const indexInfo = checker.getIndexInfoOfType(type, kind);
  if (indexInfo === undefined) {
    return Immutability.Unknown;
  }

  if (maxImmutability <= Immutability.ReadonlyShallow) {
    return Immutability.ReadonlyShallow;
  }

  if (indexInfo.isReadonly) {
    if (indexInfo.type === type) {
      return maxImmutability;
    }

    return max(
      Immutability.ReadonlyShallow,
      getTypeImmutability(
        program,
        indexInfo.type,
        overrides,
        cache,
        maxImmutability
      )
    );
  }

  return Immutability.Mutable;
}
