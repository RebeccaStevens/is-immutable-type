import { describe, it } from "vitest";

import { Immutability } from "#is-immutable-type";

import { runTestImmutabilityCappedAt } from "./helpers";

describe("Index Signatures", () => {
  describe("capped at ReadonlyShallow", () => {
    it.each(["type Test = Record<string, number>;", "type Test = { [key: string]: number };"])(
      "reports a non-readonly index signature as Mutable",
      (code) => {
        runTestImmutabilityCappedAt(code, Immutability.ReadonlyShallow, Immutability.Mutable);
      },
    );

    it.each(["type Test = { readonly [key: string]: number };"])(
      "reports a readonly index signature as ReadonlyShallow",
      (code) => {
        runTestImmutabilityCappedAt(code, Immutability.ReadonlyShallow, Immutability.ReadonlyShallow);
      },
    );
  });
});
