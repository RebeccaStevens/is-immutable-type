import { describe, it } from "vitest";

import { Immutability } from "#is-immutable-type";

import { runTestImmutability } from "./helpers";

describe("Property Signatures", () => {
  it.each([
    "type Test = { readonly [key: string]: string };",
    "type Test = { readonly [key: string]: { readonly foo: string; }; };",
  ])("Immutable", (code) => {
    runTestImmutability(code, Immutability.Immutable);
  });

  it.each(["type Test = { readonly [key: string]: readonly string[] };"])(
    "ReadonlyDeep",
    (code) => {
      runTestImmutability(code, Immutability.ReadonlyDeep);
    },
  );

  it.each(["type Test = { readonly [key: string]: { foo: string[]; }; };"])(
    "ReadonlyShallow",
    (code) => {
      runTestImmutability(code, Immutability.ReadonlyShallow);
    },
  );

  it.each(["type Test = { [key: string]: string };"])("Mutable", (code) => {
    runTestImmutability(code, Immutability.Mutable);
  });
});
