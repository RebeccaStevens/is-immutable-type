/**
 * The immutableness sorted ascendently.
 */
export enum Immutableness {
  Unknown = -1,
  Mutable = 0,
  ReadonlyShallow = 1,
  ReadonlyDeep = 2,
  Immutable = 3,
}

/**
 * Get the minimum immutableness from the given values.
 *
 * Unknown immutableness will be discarded if possible.
 */
export function getMinImmutableness(
  a: Immutableness,
  b: Immutableness
): Immutableness {
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
export function getMaxImmutableness(
  a: Immutableness,
  b: Immutableness
): Immutableness {
  return Math.max(a, b);
}
