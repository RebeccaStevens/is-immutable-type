import test from "ava";

import { Immutability } from "../src";

import { runTestImmutability } from "./helpers";

test("simple", (t) => {
  for (const code of [
    "type Test<G> = Readonly<{ foo: Test<string> | string; }>;",
    "type Test<G> = G extends string ? Readonly<{ foo: string }> : Test<string>",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "handles recursive immutable types"
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
      "handles recursive deeply readonly types"
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
      "handles recursive shallowly readonly types"
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
      "handles recursive mutable types"
    );
  }
});
