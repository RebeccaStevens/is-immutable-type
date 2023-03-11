import test from "ava";

import { Immutability } from "../src";

import { runTestImmutability } from "./helpers";

test("direct", (t) => {
  for (const code of ["interface Test { readonly [key: string]: Test };"]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "handles direct recursive immutable types"
    );
  }

  for (const code of ["type Test = ReadonlyArray<Test>;"]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyDeep,
      "handles direct recursive deeply readonly types"
    );
  }

  for (const code of ["type Test = ReadonlyArray<Test | { foo: 1 }>;"]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyShallow,
      "handles direct recursive shallowly readonly types"
    );
  }

  for (const code of ["type Test = Test[];"]) {
    runTestImmutability(
      t,
      code,
      Immutability.Mutable,
      "handles direct recursive mutable types"
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
      "handles generic recursive immutable types"
    );
  }

  for (const code of [
    "type Test<G> = Readonly<{ foo: ReadonlyArray<Test<string>> | string; }>;",
    "type Test<G> = G extends string ? ReadonlyArray<string> : Test<string>",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyDeep,
      "handles generic recursive deeply readonly types"
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
      "handles generic recursive shallowly readonly types"
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
      "handles generic recursive mutable types"
    );
  }
});
