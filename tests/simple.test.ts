import { describe, it } from "vitest";

import { Immutability } from "#is-immutable-type";

import { runTestImmutability } from "./helpers";

describe("primitives", () => {
  it.each([
    "null",
    "undefined",
    "string",
    "number",
    "boolean",
    "symbol",
    "bigint",
  ])("treat %s as immutable", (test) => {
    runTestImmutability(`type Test = ${test};`, Immutability.Immutable);
  });
});

describe("records", () => {
  it.each([
    "type Test = { readonly foo: string; };",
    "type Test = Readonly<{ foo: string; }>;",
  ])("handles immutable records", (code) => {
    runTestImmutability(code, Immutability.Immutable);
  });

  it.each(["type Test = { foo: string; };"])(
    "handles mutable records",
    (code) => {
      runTestImmutability(code, Immutability.Mutable);
    },
  );
});

describe("arrays", () => {
  const ImmutableShallow = `type ImmutableShallow<T extends {}> = {
    readonly [P in keyof T & {}]: T[P];
  };`;

  it.each([
    `type Test = ImmutableShallow<readonly string[]>; ${ImmutableShallow}`,
    `type Test = ImmutableShallow<ReadonlyArray<string>>; ${ImmutableShallow}`,
  ])("handles immutable arrays", (code) => {
    runTestImmutability(code, Immutability.Immutable);
  });

  it.each([
    "type Test = readonly string[];",
    "type Test = ReadonlyArray<string>;",
  ])("handles deeply readonly arrays", (code) => {
    runTestImmutability(code, Immutability.ReadonlyDeep);
  });

  it.each([
    "type Test = readonly { foo: string }[];",
    "type Test = ReadonlyArray<{ foo: string }>;",
  ])("handles shallowly readonly arrays", (code) => {
    runTestImmutability(code, Immutability.ReadonlyShallow);
  });

  it.each(["type Test = string[];", "type Test = Array<string>;"])(
    "handles mutable arrays",
    (code) => {
      runTestImmutability(code, Immutability.Mutable);
    },
  );
});

describe("tuples", () => {
  it.each([
    "type Test = readonly [string, number, boolean];",
    "type Test = Readonly<[string, number, boolean]>;",
  ])("handles deeply readonly tuples", (code) => {
    runTestImmutability(code, Immutability.ReadonlyDeep);
  });

  it.each([
    "type Test = readonly [{ foo: string }, { bar: number }];",
    "type Test = Readonly<[{ foo: string }, { bar: number }]>;",
  ])("handles shallowly readonly tuples", (code) => {
    runTestImmutability(code, Immutability.ReadonlyShallow);
  });

  it.each(["type Test = [string, number, boolean];"])(
    "handles mutable tuples",
    (code) => {
      runTestImmutability(code, Immutability.Mutable);
    },
  );
});

describe("sets and maps", () => {
  it.each([
    "type Test = Readonly<ReadonlySet<string>>;",
    "type Test = Readonly<ReadonlyMap<string, string>>;",
  ])("handles immutable sets and maps", (code) => {
    runTestImmutability(code, Immutability.Immutable);
  });

  it.each([
    "type Test = ReadonlySet<string>;",
    "type Test = ReadonlyMap<string, string>;",
  ])("handles deeply readonly sets and maps", (code) => {
    runTestImmutability(code, Immutability.ReadonlyDeep);
  });

  it.each([
    "type Test = ReadonlySet<{ foo: string }>;",
    "type Test = ReadonlyMap<{ foo: string }, { bar: string }>;",
  ])("handles shallowly readonly sets and maps", (code) => {
    runTestImmutability(code, Immutability.ReadonlyShallow);
  });

  it.each(["type Test = Set<string>;", "type Test = Map<string, string>;"])(
    "handles mutable sets and maps",
    (code) => {
      runTestImmutability(code, Immutability.Mutable);
    },
  );
});

describe("functions", () => {
  it.each([
    "type Test = () => number;",
    "type Test = (foo: { bar: string; }) => { baz: number; };",
    "type Test = { (): number; };",
    "type Test = { (foo: { bar: string; }): { baz: number; } };",
  ])("handles functions", (code) => {
    runTestImmutability(code, Immutability.Immutable);
  });
});

describe("methods", () => {
  it.each([
    "type Test = { readonly foo: () => string; };",
    "type Test = Readonly<{ foo(): string; }>;",
  ])("handles immutable records with methods", (code) => {
    runTestImmutability(code, Immutability.Immutable);
  });

  it.each([
    "type Test = { foo: () => string; };",
    "type Test = { foo(): string; };",
  ])("handles mutable records with methods", (code) => {
    runTestImmutability(code, Immutability.ReadonlyDeep);
  });
});

describe("private identifiers", () => {
  it.each([
    'class Foo { readonly #readonlyPrivateField = "foo"; }',
    'class Foo { #privateField = "foo"; }',
    "class Foo { #privateMember() {}; }",
  ])("treats private identifier as immutable", (code) => {
    runTestImmutability(code, Immutability.Immutable);
  });
});
