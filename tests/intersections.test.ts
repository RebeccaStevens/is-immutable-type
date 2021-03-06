import test from "ava";

import { Immutableness } from "../src";

import { runTestImmutableness } from "./helpers";

test("simple", (t) => {
  for (const code of [
    "type Test = Readonly<{ foo: string; }> & Readonly<{ bar: string; }>;",
  ]) {
    runTestImmutableness(
      t,
      code,
      Immutableness.Immutable,
      "handles simple intersections of immutable types"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = readonly (number | string)[] & readonly (number | boolean)[];",
  ]) {
    runTestImmutableness(
      t,
      code,
      Immutableness.ReadonlyDeep,
      "handles simple intersections of deeply readonly types"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = { foo: string; } & { bar: string; };",
  ]) {
    runTestImmutableness(
      t,
      code,
      Immutableness.Mutable,
      "handles simple intersections of mutable types"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = Readonly<{ foo: string; } & { bar: string; }>;",
  ]) {
    runTestImmutableness(
      t,
      code,
      Immutableness.Immutable,
      "handles immutable intersections of mutable types"
    );
  }
});
