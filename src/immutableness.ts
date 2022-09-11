/**
 * The immutableness sorted ascendently.
 */
export enum Immutableness {
  Unknown = -1,
  // MutableDeep = 1,
  Mutable = 2,
  // MutableShallow = 2,
  // Readonly = 3,
  ReadonlyShallow = 3,
  ReadonlyDeep = 4,
  Immutable = 5,
}

/**
 * The possible immutableness values that aren't unknown.
 */
export type KnownImmutableness = Exclude<Immutableness, Immutableness.Unknown>;

/**
 * Get the minimum immutableness from the given values.
 *
 * Unknown immutableness will be discarded if possible.
 */
export function min(a: Immutableness, b: Immutableness): Immutableness {
  if (a === Immutableness.Unknown) {
    return b;
  }
  if (b === Immutableness.Unknown) {
    return a;
  }
  return Math.min(a, b);
}

/**
 * Get the maximum immutableness from the given values.
 *
 * Unknown immutableness will be discarded if possible.
 */
export function max(a: Immutableness, b: Immutableness): Immutableness {
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
 * @throws When any of the given parameter are unknown immutableness.
 */
export function isClamped(
  minValue: Immutableness,
  value: Immutableness,
  maxValue: Immutableness
) {
  throwIfUnknownImmutableness(minValue, value, maxValue);
  return minValue <= value && value <= maxValue;
}

/**
 * Returns true if and only if `a` and `b` have equal immutableness.
 *
 * @throws When either `a` or `b` is unknown immutableness.
 */
export function equalTo(a: Immutableness, b: Immutableness) {
  throwIfUnknownImmutableness(a, b);
  return a === b;
}

/**
 * Returns true if and only if `a` is more immutable than `b`.
 *
 * @throws When either `a` or `b` is unknown immutableness.
 */
export function greaterThan(a: Immutableness, b: Immutableness) {
  throwIfUnknownImmutableness(a, b);
  return a > b;
}

/**
 * Returns true if and only if `a` is more or equally as immutable as `b`.
 *
 * @throws When either `a` or `b` is unknown immutableness.
 */
export function greaterThanOrEqualTo(a: Immutableness, b: Immutableness) {
  throwIfUnknownImmutableness(a, b);
  return a >= b;
}

/**
 * Returns true if and only if `a` is less immutable than `b`.
 *
 * @throws When any of the given parameter are unknown immutableness.
 */
export function lessThan(a: Immutableness, b: Immutableness) {
  throwIfUnknownImmutableness(a, b);
  return a < b;
}

/**
 * Returns true if and only if `a` is less or equally as immutable as `b`.
 *
 * @throws When any of the given parameter are unknown immutableness.
 */
export function lessThanOrEqualTo(a: Immutableness, b: Immutableness) {
  throwIfUnknownImmutableness(a, b);
  return a <= b;
}

/**
 * Will throw if any of the given parameter are unknown immutableness.
 */
function throwIfUnknownImmutableness(...values: ReadonlyArray<Immutableness>) {
  if (values.includes(Immutableness.Unknown)) {
    throw new Error("Unknown Immutableness");
  }
}
