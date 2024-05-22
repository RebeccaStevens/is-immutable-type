import type ts from "typescript";

import {
  type ImmutabilityCache,
  type ImmutabilityOverrides,
  getDefaultOverrides,
  getTypeImmutability,
} from "./calculate";
import {
  isImmutable,
  isMutable,
  isReadonlyDeep,
  isReadonlyShallow,
} from "./compare";
import { Immutability } from "./immutability";

/**
 * Is the immutability of the given type immutable.
 *
 * @param program - The TypeScript Program to use.
 * @param typeOrTypeNode - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
export function isImmutableType(
  program: ts.Program,
  typeOrTypeNode: ts.Type | ts.TypeNode,
  overrides: ImmutabilityOverrides = getDefaultOverrides(),
  useCache: ImmutabilityCache | boolean = true,
) {
  const immutability = getTypeImmutability(
    program,
    typeOrTypeNode,
    overrides,
    useCache,
    Immutability.Immutable,
  );
  return isImmutable(immutability);
}

/**
 * Is the immutability of the given type at least readonly deep.
 *
 * @param program - The TypeScript Program to use.
 * @param typeOrTypeNode - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
export function isReadonlyDeepType(
  program: ts.Program,
  typeOrTypeNode: ts.Type | ts.TypeNode,
  overrides: ImmutabilityOverrides = getDefaultOverrides(),
  useCache: ImmutabilityCache | boolean = true,
) {
  const immutability = getTypeImmutability(
    program,
    typeOrTypeNode,
    overrides,
    useCache,
    Immutability.ReadonlyDeep,
  );
  return isReadonlyDeep(immutability);
}

/**
 * Is the immutability of the given type at least readonly shallow.
 *
 * @param program - The TypeScript Program to use.
 * @param typeOrTypeNode - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
export function isReadonlyShallowType(
  program: ts.Program,
  typeOrTypeNode: ts.Type | ts.TypeNode,
  overrides: ImmutabilityOverrides = getDefaultOverrides(),
  useCache: ImmutabilityCache | boolean = true,
) {
  const immutability = getTypeImmutability(
    program,
    typeOrTypeNode,
    overrides,
    useCache,
    Immutability.ReadonlyShallow,
  );
  return isReadonlyShallow(immutability);
}

/**
 * Is the immutability of the given type mutable.
 *
 * @param program - The TypeScript Program to use.
 * @param typeOrTypeNode - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
export function isMutableType(
  program: ts.Program,
  typeOrTypeNode: ts.Type | ts.TypeNode,
  overrides: ImmutabilityOverrides = getDefaultOverrides(),
  useCache: ImmutabilityCache | boolean = true,
) {
  const immutability = getTypeImmutability(
    program,
    typeOrTypeNode,
    overrides,
    useCache,
    Immutability.Mutable,
  );
  return isMutable(immutability);
}
