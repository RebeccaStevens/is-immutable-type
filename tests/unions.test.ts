import test from "ava";

import { Immutability } from "../src";

import { runTestImmutability } from "./helpers";

test("simple", (t) => {
  for (const code of [
    "type Test = string | number",
    "type Test = Readonly<{ foo: string; }> | number;",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "handles simple unions of immutable types"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = readonly string[] | readonly number[];",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyDeep,
      "handles simple unions of deeply readonly types"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = { foo: string; } | { bar: string; };",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Mutable,
      "handles simple unions of mutable types"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = Readonly<{ foo: string; } | { bar: string; }>;",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "handles immutable unions of mutable types"
    );
  }
});
