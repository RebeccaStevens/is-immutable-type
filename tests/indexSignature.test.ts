import test from "ava";

import { Immutableness } from "../src";

import { runTestForGetTypeImmutableness } from "./helpers";

test("Property Signatures", (t) => {
  for (const code of [
    "type Test = { readonly [key: string]: string };",
    "type Test = { readonly [key: string]: { readonly foo: string; }; };",
  ]) {
    runTestForGetTypeImmutableness(
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
      runTestForGetTypeImmutableness(
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
    runTestForGetTypeImmutableness(
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
    runTestForGetTypeImmutableness(
      t,
      code,
      Immutableness.Mutable,
      "handles mutable IndexSignatures"
    );
  }
});
