import test from "ava";

import { Immutableness } from "../src";

import { runTestImmutableness } from "./helpers";

test("Property Signatures", (t) => {
  for (const code of [
    "type Test = { readonly [key: string]: string };",
    "type Test = { readonly [key: string]: { readonly foo: string; }; };",
  ]) {
    runTestImmutableness(
      t,
      code,
      Immutableness.Immutable,
      "handles immutable IndexSignatures"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = { readonly [key: string]: readonly string[] };"
  ]) {
      runTestImmutableness(
        t,
        code,
        Immutableness.ReadonlyDeep,
        "handles deeply readonly IndexSignatures"
      );
    }

  // prettier-ignore
  for (const code of [
    "type Test = { readonly [key: string]: { foo: string[]; }; };",
  ]) {
    runTestImmutableness(
      t,
      code,
      Immutableness.ReadonlyShallow,
      "handles shallowly readonly IndexSignatures"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = { [key: string]: string };",
  ]) {
    runTestImmutableness(
      t,
      code,
      Immutableness.Mutable,
      "handles mutable IndexSignatures"
    );
  }
});
