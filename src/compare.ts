import { Immutability } from "./immutability";

/**
 * Get the minimum immutability from the given values.
 *
 * Note: Unknown immutability will be ignore; thus Unknown will be return if
 * and only if all values are Unknown.
 */
export function min(a: Immutability, b: Immutability): Immutability {
  if (isUnknown(a)) {
    return b;
  }
  if (isUnknown(b)) {
    return a;
  }
  return Math.min(a, b);
}

/**
 * Get the maximum immutability from the given values.
 *
 * Note: Unknown immutability will be ignore; thus Unknown will be return if
 * and only if all values are Unknown.
 */
export function max(a: Immutability, b: Immutability): Immutability {
  if (isUnknown(a)) {
    return b;
  }
  if (isUnknown(b)) {
    return a;
  }
  return Math.max(a, b);
}

/**
 * Clamp the immutability between min and max.
 */
export function clamp(
  minValue: Immutability,
  value: Immutability,
  maxValue: Immutability
) {
  return Math.max(minValue, Math.min(maxValue, value));
}

/**
 * Is the given immutability immutable?
 */
export function isImmutable(immutability: Immutability) {
  return immutability >= Immutability.Immutable;
}

/**
 * Is the given immutability at least ReadonlyDeep?
 */
export function isReadonlyDeep(immutability: Immutability) {
  return immutability >= Immutability.ReadonlyDeep;
}

/**
 * Is the given immutability at least ReadonlyShallow?
 */
export function isReadonlyShallow(immutability: Immutability) {
  return immutability >= Immutability.ReadonlyShallow;
}

/**
 * Is the given immutability Mutable?
 */
export function isMutable(immutability: Immutability) {
  return immutability <= Immutability.Mutable;
}

/**
 * Is the given immutability unknown?
 */
export function isUnknown(value: Immutability) {
  return Number.isNaN(value);
}
