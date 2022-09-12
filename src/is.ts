import type ts from "typescript";

import {
  getDefaultOverrides,
  getTypeImmutableness,
  type ImmutablenessCache,
  type ImmutablenessOverrides,
} from "./calculate";
import {
  isImmutable,
  isReadonlyDeep,
  isReadonlyShallow,
  isMutable,
} from "./compare";

/**
 * Is the immutableness of the given type immutable.
 *
 * @param checker - The TypeScript Type Checker to use.
 * @param type - The type to test the immutableness of.
 * @param overrides - The overrides to use when calculating the immutableness.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
export function isImmutableType(
  checker: ts.TypeChecker,
  type: ts.Type,
  overrides: ImmutablenessOverrides = getDefaultOverrides(),
  useCache: ImmutablenessCache | boolean = true
) {
  const immutableness = getTypeImmutableness(
    checker,
    type,
    overrides,
    useCache
  );
  return isImmutable(immutableness);
}

/**
 * Is the immutableness of the given type at least readonly deep.
 *
 * @param checker - The TypeScript Type Checker to use.
 * @param type - The type to test the immutableness of.
 * @param overrides - The overrides to use when calculating the immutableness.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
export function isReadonlyDeepType(
  checker: ts.TypeChecker,
  type: ts.Type,
  overrides: ImmutablenessOverrides = getDefaultOverrides(),
  useCache: ImmutablenessCache | boolean = true
) {
  const immutableness = getTypeImmutableness(
    checker,
    type,
    overrides,
    useCache
  );
  return isReadonlyDeep(immutableness);
}

/**
 * Is the immutableness of the given type at least readonly shallow.
 *
 * @param checker - The TypeScript Type Checker to use.
 * @param type - The type to test the immutableness of.
 * @param overrides - The overrides to use when calculating the immutableness.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
export function isReadonlyShallowType(
  checker: ts.TypeChecker,
  type: ts.Type,
  overrides: ImmutablenessOverrides = getDefaultOverrides(),
  useCache: ImmutablenessCache | boolean = true
) {
  const immutableness = getTypeImmutableness(
    checker,
    type,
    overrides,
    useCache
  );
  return isReadonlyShallow(immutableness);
}

/**
 * Is the immutableness of the given type mutable.
 *
 * @param checker - The TypeScript Type Checker to use.
 * @param type - The type to test the immutableness of.
 * @param overrides - The overrides to use when calculating the immutableness.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
export function isMutableType(
  checker: ts.TypeChecker,
  type: ts.Type,
  overrides: ImmutablenessOverrides = getDefaultOverrides(),
  useCache: ImmutablenessCache | boolean = true
) {
  const immutableness = getTypeImmutableness(
    checker,
    type,
    overrides,
    useCache
  );
  return isMutable(immutableness);
}
