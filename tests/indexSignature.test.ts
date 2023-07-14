import test from "ava";

import { Immutability } from "../src";

import { runTestImmutability } from "./helpers";

test("Property Signatures", (t) => {
  for (const code of [
    "type Test = { readonly [key: string]: string };",
    "type Test = { readonly [key: string]: { readonly foo: string; }; };",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "handles immutable IndexSignatures",
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = { readonly [key: string]: readonly string[] };"
  ]) {
      runTestImmutability(
        t,
        code,
        Immutability.ReadonlyDeep,
        "handles deeply readonly IndexSignatures"
      );
    }

  // prettier-ignore
  for (const code of [
    "type Test = { readonly [key: string]: { foo: string[]; }; };",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyShallow,
      "handles shallowly readonly IndexSignatures"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = { [key: string]: string };",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Mutable,
      "handles mutable IndexSignatures"
    );
  }
});
