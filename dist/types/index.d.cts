import ts from 'typescript';

/**
 * The immutability sorted ascendently.
 */
declare enum Immutability {
    Unknown,
    Mutable = 2,
    ReadonlyShallow = 3,
    ReadonlyDeep = 4,
    Immutable = 5
}

/**
 * A list of immutability overrides.
 */
declare type ImmutabilityOverrides = ReadonlyArray<({
    name: string;
    pattern?: undefined;
} | {
    name?: undefined;
    pattern: RegExp;
}) & {
    to: Immutability;
    from?: Immutability;
}>;
/**
 * Get the default overrides that are applied.
 */
declare function getDefaultOverrides(): ImmutabilityOverrides;
/**
 * A cache used to keep track of what types have already been calculated.
 */
declare type ImmutabilityCache = WeakMap<ts.Type, Immutability>;
/**
 * Get the immutability of the given type.
 *
 * @param checker - The TypeScript Type Checker to use.
 * @param type - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
declare function getTypeImmutability(checker: ts.TypeChecker, type: ts.Type, overrides?: ImmutabilityOverrides, useCache?: ImmutabilityCache | boolean): Immutability;

/**
 * Get the minimum immutability from the given values.
 *
 * Note: Unknown immutability will be ignore; thus Unknown will be return if
 * and only if all values are Unknown.
 */
declare function min(a: Immutability, b: Immutability): Immutability;
/**
 * Get the maximum immutability from the given values.
 *
 * Note: Unknown immutability will be ignore; thus Unknown will be return if
 * and only if all values are Unknown.
 */
declare function max(a: Immutability, b: Immutability): Immutability;
/**
 * Clamp the immutability between min and max.
 */
declare function clamp(minValue: Immutability, value: Immutability, maxValue: Immutability): number;
/**
 * Is the given immutability immutable?
 */
declare function isImmutable(immutability: Immutability): boolean;
/**
 * Is the given immutability at least ReadonlyDeep?
 */
declare function isReadonlyDeep(immutability: Immutability): boolean;
/**
 * Is the given immutability at least ReadonlyShallow?
 */
declare function isReadonlyShallow(immutability: Immutability): boolean;
/**
 * Is the given immutability Mutable?
 */
declare function isMutable(immutability: Immutability): boolean;
/**
 * Is the given immutability unknown?
 */
declare function isUnknown(value: Immutability): boolean;

/**
 * Is the immutability of the given type immutable.
 *
 * @param checker - The TypeScript Type Checker to use.
 * @param type - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
declare function isImmutableType(checker: ts.TypeChecker, type: ts.Type, overrides?: ImmutabilityOverrides, useCache?: ImmutabilityCache | boolean): boolean;
/**
 * Is the immutability of the given type at least readonly deep.
 *
 * @param checker - The TypeScript Type Checker to use.
 * @param type - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
declare function isReadonlyDeepType(checker: ts.TypeChecker, type: ts.Type, overrides?: ImmutabilityOverrides, useCache?: ImmutabilityCache | boolean): boolean;
/**
 * Is the immutability of the given type at least readonly shallow.
 *
 * @param checker - The TypeScript Type Checker to use.
 * @param type - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
declare function isReadonlyShallowType(checker: ts.TypeChecker, type: ts.Type, overrides?: ImmutabilityOverrides, useCache?: ImmutabilityCache | boolean): boolean;
/**
 * Is the immutability of the given type mutable.
 *
 * @param checker - The TypeScript Type Checker to use.
 * @param type - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
declare function isMutableType(checker: ts.TypeChecker, type: ts.Type, overrides?: ImmutabilityOverrides, useCache?: ImmutabilityCache | boolean): boolean;

export { Immutability, ImmutabilityCache, ImmutabilityOverrides, clamp, getDefaultOverrides, getTypeImmutability, isImmutable, isImmutableType, isMutable, isMutableType, isReadonlyDeep, isReadonlyDeepType, isReadonlyShallow, isReadonlyShallowType, isUnknown, max, min };
