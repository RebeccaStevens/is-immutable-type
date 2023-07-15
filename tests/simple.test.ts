import test from "ava";

import { Immutability } from "#is-immutable-type";

import { runTestImmutability } from "./helpers";

test("primitives", (t) => {
  for (const code of [
    "type Test = null;",
    "type Test = undefined;",
    "type Test = string;",
    "type Test = number;",
    "type Test = boolean;",
    "type Test = symbol;",
    "type Test = bigint;",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "treat primitives as immutable",
    );
  }
});

test("records", (t) => {
  for (const code of [
    "type Test = { readonly foo: string; };",
    "type Test = Readonly<{ foo: string; }>;",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "handles immutable records",
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = { foo: string; };",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Mutable,
      "handles mutable records"
    );
  }
});

test("arrays", (t) => {
  const ImmutableShallow = `type ImmutableShallow<T extends {}> = {
    readonly [P in keyof T & {}]: T[P];
  };`;

  for (const code of [
    `type Test = ImmutableShallow<readonly string[]>; ${ImmutableShallow}`,
    `type Test = ImmutableShallow<ReadonlyArray<string>>; ${ImmutableShallow}`,
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "handles immutable arrays",
    );
  }

  for (const code of [
    "type Test = readonly string[];",
    "type Test = ReadonlyArray<string>;",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyDeep,
      "handles deeply readonly arrays",
    );
  }

  for (const code of [
    "type Test = readonly { foo: string }[];",
    "type Test = ReadonlyArray<{ foo: string }>;",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyShallow,
      "handles shallowly readonly arrays",
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = string[];",
    "type Test = Array<string>;",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Mutable,
      "handles mutable arrays"
    );
  }
});

test("tuples", (t) => {
  for (const code of [
    "type Test = readonly [string, number, boolean];",
    "type Test = Readonly<[string, number, boolean]>;",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyDeep,
      "handles deeply readonly tuples",
    );
  }

  for (const code of [
    "type Test = readonly [{ foo: string }, { bar: number }];",
    "type Test = Readonly<[{ foo: string }, { bar: number }]>;",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyShallow,
      "handles shallowly readonly tuples",
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = [string, number, boolean];",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Mutable,
      "handles mutable tuples"
    );
  }
});

test("sets and maps", (t) => {
  for (const code of [
    "type Test = Readonly<ReadonlySet<string>>;",
    "type Test = Readonly<ReadonlyMap<string, string>>;",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "handles immutable sets and maps",
    );
  }

  for (const code of [
    "type Test = ReadonlySet<string>;",
    "type Test = ReadonlyMap<string, string>;",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyDeep,
      "handles deeply readonly sets and maps",
    );
  }

  for (const code of [
    "type Test = ReadonlySet<{ foo: string }>;",
    "type Test = ReadonlyMap<{ foo: string }, { bar: string }>;",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyShallow,
      "handles shallowly readonly sets and maps",
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = Set<string>;",
    "type Test = Map<string, string>;"
  ]) {
      runTestImmutability(
        t,
        code,
        Immutability.Mutable,
        "handles mutable sets and maps"
      );
    }
});

test("functions", (t) => {
  for (const code of [
    "type Test = () => number;",
    "type Test = (foo: { bar: string; }) => { baz: number; };",
    "type Test = { (): number; };",
    "type Test = { (foo: { bar: string; }): { baz: number; } };",
  ]) {
    runTestImmutability(t, code, Immutability.Immutable, "handles function");
  }
});

test("methods", (t) => {
  for (const code of [
    "type Test = { readonly foo: () => string; };",
    "type Test = Readonly<{ foo(): string; }>;",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "handles immutable records with methods",
    );
  }

  for (const code of [
    "type Test = { foo: () => string; };",
    "type Test = { foo(): string; };",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyDeep,
      "handles mutable records with methods",
    );
  }
});

test("private identifiers", (t) => {
  for (const code of [
    'class Foo { readonly #readonlyPrivateField = "foo"; }',
    'class Foo { #privateField = "foo"; }',
    "class Foo { #privateMember() {}; }",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "treat private identifier as immutable",
    );
  }
});
