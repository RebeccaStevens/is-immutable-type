import { describe, it } from "vitest";

import { Immutability } from "#is-immutable-type";

import { runTestImmutability } from "./helpers";

describe("Conditionals", () => {
  it.each(["type Test<G> = G extends number ? number : string;"])("Immutable", (code) => {
    runTestImmutability(code, Immutability.Immutable);
  });

  it.each(["type Test<G> = G extends number ? readonly number[] : readonly string[];"])("ReadonlyDeep", (code) => {
    runTestImmutability(code, Immutability.ReadonlyDeep);
  });

  it.each(["type Test<G> = G extends number ? { foo: number } : { foo: string };"])("Mutable", (code) => {
    runTestImmutability(code, Immutability.Mutable);
  });

  it.each(["type Test<G> = Readonly<G extends number ? { foo: number } : { foo: string }>;"])(
    "Mutable wrapped to Immutable",
    (code) => {
      runTestImmutability(code, Immutability.Immutable);
    },
  );

  describe("recursive", () => {
    it.each(["type Test<G> = G extends number ? Test<G> : Test<G>;"])(
      "resolves to the lattice top when every branch is a recursive self-reference",
      (code) => {
        runTestImmutability(code, Immutability.Immutable);
      },
    );

    it.each(["type Test<G> = G extends number ? Test<G> : readonly string[];"])(
      "lets a non-recursive branch determine the immutability",
      (code) => {
        runTestImmutability(code, Immutability.ReadonlyDeep);
      },
    );
  });
});
