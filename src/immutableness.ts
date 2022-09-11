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
