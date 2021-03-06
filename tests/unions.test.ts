import test from "ava";

import { Immutableness } from "../src";

import { runTestImmutableness } from "./helpers";

test("simple", (t) => {
  for (const code of [
    "type Test = string | number",
    "type Test = Readonly<{ foo: string; }> | number;",
  ]) {
    runTestImmutableness(
      t,
      code,
      Immutableness.Immutable,
      "handles simple unions of immutable types"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = readonly string[] | readonly number[];",
  ]) {
    runTestImmutableness(
      t,
      code,
      Immutableness.ReadonlyDeep,
      "handles simple unions of deeply readonly types"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = { foo: string; } | { bar: string; };",
  ]) {
    runTestImmutableness(
      t,
      code,
      Immutableness.Mutable,
      "handles simple unions of mutable types"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = Readonly<{ foo: string; } | { bar: string; }>;",
  ]) {
    runTestImmutableness(
      t,
      code,
      Immutableness.Immutable,
      "handles immutable unions of mutable types"
    );
  }
});
