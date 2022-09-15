/**
 * The immutability sorted ascendently.
 */
export enum Immutability {
  Unknown = Number.NaN,
  // MutableDeep = 1,
  Mutable = 2,
  // MutableShallow = 2,
  // Readonly = 3,
  ReadonlyShallow = 3,
  ReadonlyDeep = 4,
  Immutable = 5,
}
