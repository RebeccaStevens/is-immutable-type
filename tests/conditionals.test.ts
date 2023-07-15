import test from "ava";

import { Immutability } from "#is-immutable-type";

import { runTestImmutability } from "./helpers";

test("simple", (t) => {
  // prettier-ignore
  for (const code of [
    "type Test<G> = G extends number ? number : string;",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "handles simple contitional of immutable types"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test<G> = G extends number ? readonly number[] : readonly string[];",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyDeep,
      "handles simple contitional of deeply readonly types"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test<G> = G extends number ? { foo: number } : { foo: string };",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Mutable,
      "handles simple contitional of mutable types"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test<G> = Readonly<G extends number ? { foo: number } : { foo: string }>;",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "handles immutable contitional of mutable types"
    );
  }
});
