import { describe, it } from "vitest";

import { Immutability } from "#is-immutable-type";

import { runTestImmutability } from "./helpers";

describe("Conditionals", () => {
  it.each(["type Test<G> = G extends number ? number : string;"])(
    "Immutable",
    (code) => {
      runTestImmutability(code, Immutability.Immutable);
    },
  );

  it.each([
    "type Test<G> = G extends number ? readonly number[] : readonly string[];",
  ])("ReadonlyDeep", (code) => {
    runTestImmutability(code, Immutability.ReadonlyDeep);
  });

  it.each([
    "type Test<G> = G extends number ? { foo: number } : { foo: string };",
  ])("Mutable", (code) => {
    runTestImmutability(code, Immutability.Mutable);
  });

  it.each([
    "type Test<G> = Readonly<G extends number ? { foo: number } : { foo: string }>;",
  ])("Mutable wrapped to Immutable", (code) => {
    runTestImmutability(code, Immutability.Immutable);
  });
});
