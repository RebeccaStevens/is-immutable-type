import { Immutableness } from "./immutableness";

/**
 * Get the minimum immutableness from the given values.
 *
 * Note: Unknown immutableness will be ignore; thus Unknown will be return if
 * and only if all values are Unknown.
 */
export function min(a: Immutableness, b: Immutableness): Immutableness {
  if (isUnknown(a)) {
    return b;
  }
  if (isUnknown(b)) {
    return a;
  }
  return Math.min(a, b);
}

/**
 * Get the maximum immutableness from the given values.
 *
 * Note: Unknown immutableness will be ignore; thus Unknown will be return if
 * and only if all values are Unknown.
 */
export function max(a: Immutableness, b: Immutableness): Immutableness {
  if (isUnknown(a)) {
    return b;
  }
  if (isUnknown(b)) {
    return a;
  }
  return Math.max(a, b);
}

/**
 * Clamp the immutableness between min and max.
 */
export function clamp(
  minValue: Immutableness,
  value: Immutableness,
  maxValue: Immutableness
) {
  return Math.max(minValue, Math.min(maxValue, value));
}

/**
 * Returns true if and only if `value` is inclusively between `min` and `max`.
 *
 * Note: Will always return false if any value is unknown.
 */
export function isClamped(
  minValue: Immutableness,
  value: Immutableness,
  maxValue: Immutableness
) {
  return minValue <= value && value <= maxValue;
}

/**
 * Is the given immutableness immutable?
 */
export function isImmutable(immutableness: Immutableness) {
  return immutableness >= Immutableness.Immutable;
}

/**
 * Is the given immutableness at least ReadonlyDeep?
 */
export function isReadonlyDeep(immutableness: Immutableness) {
  return immutableness >= Immutableness.ReadonlyDeep;
}

/**
 * Is the given immutableness at least ReadonlyShallow?
 */
export function isReadonlyShallow(immutableness: Immutableness) {
  return immutableness >= Immutableness.ReadonlyShallow;
}

/**
 * Is the given immutableness Mutable?
 */
export function isMutable(immutableness: Immutableness) {
  return immutableness <= Immutableness.Mutable;
}

/**
 * Is the given immutableness unknown?
 */
export function isUnknown(value: Immutableness) {
  return Number.isNaN(value);
}
