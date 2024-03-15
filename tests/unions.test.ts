import { describe, it } from "vitest";

import { Immutability } from "#is-immutable-type";

import { runTestImmutability } from "./helpers";

describe("Unions", () => {
  it.each([
    "type Test = string | number",
    "type Test = Readonly<{ foo: string; }> | number;",
  ])("Immutable", (code) => {
    runTestImmutability(code, Immutability.Immutable);
  });

  it.each(["type Test = readonly string[] | readonly number[];"])(
    "ReadonlyDeep",
    (code) => {
      runTestImmutability(code, Immutability.ReadonlyDeep);
    },
  );

  it.each(["type Test = { foo: string; } | { bar: string; };"])(
    "Mutable",
    (code) => {
      runTestImmutability(code, Immutability.Mutable);
    },
  );

  it.each(["type Test = Readonly<{ foo: string; } | { bar: string; }>;"])(
    "Immutable",
    (code) => {
      runTestImmutability(code, Immutability.Immutable);
    },
  );
});
