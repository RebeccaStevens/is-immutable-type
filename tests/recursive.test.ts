import test from "ava";

import { Immutableness } from "../src";

import { runTestImmutableness } from "./helpers";

test("simple", (t) => {
  for (const code of [
    "type Test<G> = Readonly<{ foo: Test<string> | string; }>;",
    "type Test<G> = G extends string ? Readonly<{ foo: string }> : Test<string>",
  ]) {
    runTestImmutableness(
      t,
      code,
      Immutableness.Immutable,
      "handles recursive immutable types"
    );
  }

  for (const code of [
    "type Test<G> = Readonly<{ foo: ReadonlyArray<Test<string>> | string; }>;",
    "type Test<G> = G extends string ? ReadonlyArray<string> : Test<string>",
  ]) {
    runTestImmutableness(
      t,
      code,
      Immutableness.ReadonlyDeep,
      "handles recursive deeply readonly types"
    );
  }

  for (const code of [
    "type Test<G> = Readonly<{ foo: Array<Test<string>> | string; }>;",
    "type Test<G> = G extends string ? Readonly<{ foo: Array<string>; }> : Test<string>",
  ]) {
    runTestImmutableness(
      t,
      code,
      Immutableness.ReadonlyShallow,
      "handles recursive shallowly readonly types"
    );
  }

  for (const code of [
    "type Test<G> = { foo: Test<string> | string; };",
    "type Test<G> = G extends string ? { foo: string } : Test<string>",
  ]) {
    runTestImmutableness(
      t,
      code,
      Immutableness.Mutable,
      "handles recursive mutable types"
    );
  }
});
