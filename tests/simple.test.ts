import test from "ava";

import { Immutableness } from "../src";

import { runTestForGetTypeImmutableness } from "./helpers";

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
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.Immutable,
      "treat primitives as immutable"
    );
  }
});

test("records", (t) => {
  for (const code of [
    "type Test = { readonly foo: string; };",
    "type Test = Readonly<{ foo: string; }>;",
  ]) {
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.Immutable,
      "handles immutable records"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = { foo: string; };",
  ]) {
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.Mutable,
      "handles mutable records"
    );
  }
});

test("arrays", (t) => {
  for (const code of [
    "type Test = readonly string[];",
    "type Test = ReadonlyArray<string>;",
  ]) {
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.ReadonlyDeep,
      "handles deeply readonly arrays"
    );
  }

  for (const code of [
    "type Test = readonly { foo: string }[];",
    "type Test = ReadonlyArray<{ foo: string }>;",
  ]) {
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.ReadonlyShallow,
      "handles shallowly readonly arrays"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = string[];",
    "type Test = Array<string>;",
  ]) {
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.Mutable,
      "handles mutable arrays"
    );
  }
});

test("tuples", (t) => {
  for (const code of [
    "type Test = readonly [string, number, boolean];",
    "type Test = Readonly<[string, number, boolean]>;",
  ]) {
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.ReadonlyDeep,
      "handles deeply readonly tuples"
    );
  }

  for (const code of [
    "type Test = readonly [{ foo: string }, { bar: number }];",
    "type Test = Readonly<[{ foo: string }, { bar: number }]>;",
  ]) {
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.ReadonlyShallow,
      "handles shallowly readonly tuples"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = [string, number, boolean];",
  ]) {
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.Mutable,
      "handles mutable tuples"
    );
  }
});

test("sets and maps", (t) => {
  for (const code of [
    "type Test = Readonly<ReadonlySet<string>>;",
    "type Test = Readonly<ReadonlyMap<string, string>>;",
  ]) {
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.Immutable,
      "handles immutable sets and maps"
    );
  }

  for (const code of [
    "type Test = ReadonlySet<string>;",
    "type Test = ReadonlyMap<string, string>;",
  ]) {
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.ReadonlyDeep,
      "handles deeply readonly sets and maps"
    );
  }

  // TODO: Distinguish shallowly readonly Sets and Maps.
  // [
  //   "type Test = ReadonlySet<{ foo: string }>;",
  //   "type Test = ReadonlyMap<{ foo: string }, { bar: string }>;",
  // ].forEach((code) => {
  //   runTestForAliasDeclaration(
  //     t,
  //     code,
  //     Immutableness.ReadonlyShallow,
  //     "handles shallowly readonly sets and maps"
  //   );
  // });

  // TODO: Distinguish and mutable Sets and Maps.
  // // prettier-ignore
  // [
  //   "type Test = Set<string>;",
  //   "type Test = Map<string, string>;"
  // ].forEach(
  //   (code) => {
  //     runTestForAliasDeclaration(
  //       t,
  //       code,
  //       Immutableness.Mutable,
  //       "handles mutable sets and maps"
  //     );
  //   }
  // );
});

test("functions", (t) => {
  for (const code of [
    "type Test = () => number;",
    "type Test = (foo: { bar: string; }) => { baz: number; };",
    "type Test = { (): number; };",
    "type Test = { (foo: { bar: string; }): { baz: number; } };",
  ]) {
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.Immutable,
      "handles function"
    );
  }
});

test("methods", (t) => {
  for (const code of [
    "type Test = { readonly foo: () => string; };",
    "type Test = Readonly<{ foo(): string; }>;",
  ]) {
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.Immutable,
      "handles immutable records with methods"
    );
  }

  for (const code of [
    "type Test = { foo: () => string; };",
    "type Test = { foo(): string; };",
  ]) {
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.ReadonlyDeep,
      "handles mutable records with methods"
    );
  }
});

test("private identifiers", (t) => {
  for (const code of [
    'class Foo { readonly #readonlyPrivateField = "foo"; }',
    'class Foo { #privateField = "foo"; }',
    "class Foo { #privateMember() {}; }",
  ]) {
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.Immutable,
      "treat private identifier as immutable"
    );
  }
});
