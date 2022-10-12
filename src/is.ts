import type ts from "typescript";

import {
  getDefaultOverrides,
  getTypeImmutability,
  type ImmutabilityCache,
  type ImmutabilityOverrides,
} from "./calculate";
import {
  isImmutable,
  isReadonlyDeep,
  isReadonlyShallow,
  isMutable,
} from "./compare";
import { Immutability } from "./immutability";

/**
 * Is the immutability of the given type immutable.
 *
 * @param checker - The TypeScript Type Checker to use.
 * @param type - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
export function isImmutableType(
  checker: ts.TypeChecker,
  type: ts.Type,
  overrides: ImmutabilityOverrides = getDefaultOverrides(),
  useCache: ImmutabilityCache | boolean = true
) {
  const immutability = getTypeImmutability(
    checker,
    type,
    overrides,
    useCache,
    Immutability.Immutable
  );
  return isImmutable(immutability);
}

/**
 * Is the immutability of the given type at least readonly deep.
 *
 * @param checker - The TypeScript Type Checker to use.
 * @param type - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
export function isReadonlyDeepType(
  checker: ts.TypeChecker,
  type: ts.Type,
  overrides: ImmutabilityOverrides = getDefaultOverrides(),
  useCache: ImmutabilityCache | boolean = true
) {
  const immutability = getTypeImmutability(
    checker,
    type,
    overrides,
    useCache,
    Immutability.ReadonlyDeep
  );
  return isReadonlyDeep(immutability);
}

/**
 * Is the immutability of the given type at least readonly shallow.
 *
 * @param checker - The TypeScript Type Checker to use.
 * @param type - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
export function isReadonlyShallowType(
  checker: ts.TypeChecker,
  type: ts.Type,
  overrides: ImmutabilityOverrides = getDefaultOverrides(),
  useCache: ImmutabilityCache | boolean = true
) {
  const immutability = getTypeImmutability(
    checker,
    type,
    overrides,
    useCache,
    Immutability.ReadonlyShallow
  );
  return isReadonlyShallow(immutability);
}

/**
 * Is the immutability of the given type mutable.
 *
 * @param checker - The TypeScript Type Checker to use.
 * @param type - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
export function isMutableType(
  checker: ts.TypeChecker,
  type: ts.Type,
  overrides: ImmutabilityOverrides = getDefaultOverrides(),
  useCache: ImmutabilityCache | boolean = true
) {
  const immutability = getTypeImmutability(
    checker,
    type,
    overrides,
    useCache,
    Immutability.Mutable
  );
  return isMutable(immutability);
}
