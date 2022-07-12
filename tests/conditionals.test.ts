import test from "ava";

import { Immutableness } from "../src";

import { runTestForGetTypeImmutableness } from "./helpers";

test("simple", (t) => {
  // prettier-ignore
  for (const code of [
    "type Test<G> = G extends number ? number : string;",
  ]) {
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.Immutable,
      "handles simple contitional of immutable types"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test<G> = G extends number ? readonly number[] : readonly string[];",
  ]) {
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.ReadonlyDeep,
      "handles simple contitional of deeply readonly types"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test<G> = G extends number ? { foo: number } : { foo: string };",
  ]) {
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.Mutable,
      "handles simple contitional of mutable types"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test<G> = Readonly<G extends number ? { foo: number } : { foo: string }>;",
  ]) {
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.Immutable,
      "handles immutable contitional of mutable types"
    );
  }
});
