type Immutable = { readonly value: string };
type Mutable = { value: string };
type Deep = ReadonlyArray<string>;
type Shallow = { readonly value: string[] };
type Recursive = { readonly value: string; readonly next: Recursive };
type First = { readonly next: Second };
type Second = { readonly next: First; readonly value: string };
type Expanding<U> = {
  readonly a: U;
  readonly b: Expanding<Expanding<U>>;
};
type AnonymousExpansion<T> = { readonly next: AnonymousExpansion<{ readonly value: T }> };
type ExpandedAnonymous = AnonymousExpansion<string>;
type Expanded = Expanding<string>;
type Key = "a" | "b";
type ImmutableRecord = Readonly<Record<Key, string>>;
type DeepRecord = Readonly<Record<Key, ReadonlyArray<string>>>;
type Conditional<T> = T extends string ? ReadonlyArray<string> : { value: string };
type ImmutableConditional<T> = T extends string ? string : number;
type RecursiveConditional<T> = T extends string ? RecursiveConditional<T> : ReadonlyArray<string>;
type DefaultOverride = Date;
type CustomOverride = { value: number };
type Tuple = readonly [string, number];
type MutableRecursive = { value: string; readonly next: MutableRecursive };
type ShallowFirst = { readonly next: MutableSecond };
type MutableSecond = { value: string; readonly next: ShallowFirst };
type ExpandedMutable = Expanding<string[]>;
type Box<T> = { readonly value: T };
type Siblings = { readonly a: Box<string>; readonly b: Box<string[]> };
type NestedBox = Box<Box<Mutable>>;
type ShallowContainer = { readonly value: string[]; readonly next: ShallowLink };
type ShallowLink = { readonly next: ShallowContainer };
type Methods = { method(): string };
type FunctionProperty = { method: () => string };
type ReadonlyIndex = Readonly<Record<string, string>>;
type MutableIndex = Record<string, string>;
type MutableTuple = [string, number];
type ConditionalDeep<T> = T extends string ? ReadonlyArray<string> : ReadonlyArray<number>;
type ResolvedConditional = Conditional<string>;
type ReadonlyMapOverride = ReadonlyMap<string, string>;

/** Types exercised by the checker compatibility tests. */
export declare const cases: readonly [
  Immutable,
  Mutable,
  Deep,
  Shallow,
  Recursive,
  First,
  Second,
  Expanded,
  ExpandedAnonymous,
  Key,
  ImmutableRecord,
  DeepRecord,
  DefaultOverride,
  CustomOverride,
  Tuple,
  MutableRecursive,
  ShallowFirst,
  MutableSecond,
  ExpandedMutable,
  Siblings,
  NestedBox,
  ShallowContainer,
  ShallowLink,
  Conditional<unknown>,
  ImmutableConditional<unknown>,
  RecursiveConditional<unknown>,
  ConditionalDeep<unknown>,
  Methods,
  FunctionProperty,
  ReadonlyIndex,
  MutableIndex,
  MutableTuple,
  ResolvedConditional,
  ReadonlyMapOverride,
];
