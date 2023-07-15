import test from "ava";

import { Immutability } from "#is-immutable-type";

import { runTestImmutability } from "./helpers";

test("direct", (t) => {
  for (const code of [
    `
      interface I { readonly [key: string]: string | I };
      const test: I = {};
    `,
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "handles direct recursive immutable types",
    );
  }

  for (const code of ["type Test = string | ReadonlyArray<Test>;"]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyDeep,
      "handles direct recursive deeply readonly types",
    );
  }

  for (const code of ["type Test = ReadonlyArray<Test | { foo: 1 }>;"]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyShallow,
      "handles direct recursive shallowly readonly types",
    );
  }

  for (const code of ["type Test = string | Test[];"]) {
    runTestImmutability(
      t,
      code,
      Immutability.Mutable,
      "handles direct recursive mutable types",
    );
  }
});

test("generics", (t) => {
  for (const code of [
    "type Test<G> = Readonly<{ foo: Test<string> | string; }>;",
    "type Test<G> = G extends string ? Readonly<{ foo: string }> : Test<string>",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "handles generic recursive immutable types",
    );
  }

  for (const code of [
    "type Test<G> = Readonly<{ foo: ReadonlyArray<Test<string>> | G; }>;",
    "type Test<G> = G extends string ? ReadonlyArray<string> : Test<string>",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyDeep,
      "handles generic recursive deeply readonly types",
    );
  }

  for (const code of [
    "type Test<G> = Readonly<{ foo: Array<Test<string>> | string; }>;",
    "type Test<G> = G extends string ? Readonly<{ foo: Array<string>; }> : Test<string>",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyShallow,
      "handles generic recursive shallowly readonly types",
    );
  }

  for (const code of [
    "type Test<G> = { foo: Test<string> | string; };",
    "type Test<G> = G extends string ? { foo: string } : Test<string>",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Mutable,
      "handles generic recursive mutable types",
    );
  }
});

test("nested", (t) => {
  for (const code of ["type Foo<U> = { readonly foo: Foo<Foo<U>>; };"]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "handles nested recursive immutable types",
    );
  }
});
