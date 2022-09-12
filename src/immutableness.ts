/**
 * The immutableness sorted ascendently.
 */
export enum Immutableness {
  Unknown = Number.NaN,
  // MutableDeep = 1,
  Mutable = 2,
  // MutableShallow = 2,
  // Readonly = 3,
  ReadonlyShallow = 3,
  ReadonlyDeep = 4,
  Immutable = 5,
}

/**
 * Is the given Immutableness value Unknown?
 */
export function isUnknownImmutableness(value: Immutableness) {
  return Number.isNaN(value);
}

/**
 * Get the minimum immutableness from the given values.
 *
 * Note: Unknown immutableness will be ignore; thus Unknown will be return if
 * and only if all values are Unknown.
 */
export function min(a: Immutableness, b: Immutableness): Immutableness {
  if (isUnknownImmutableness(a)) {
    return b;
  }
  if (isUnknownImmutableness(b)) {
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
  if (isUnknownImmutableness(a)) {
    return b;
  }
  if (isUnknownImmutableness(b)) {
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
