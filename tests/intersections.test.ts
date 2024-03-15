import { describe, it } from "vitest";

import { Immutability } from "#is-immutable-type";

import { runTestImmutability } from "./helpers";

describe("Intersections", () => {
  describe("simple", () => {
    it.each([
      "type Test = Readonly<{ foo: string; }> & Readonly<{ bar: string; }>;",
    ])("Immutable", (code) => {
      runTestImmutability(code, Immutability.Immutable);
    });

    it.each([
      "type Test = readonly (number | string)[] & readonly (number | boolean)[];",
    ])("ReadonlyDeep", (code) => {
      runTestImmutability(code, Immutability.ReadonlyDeep);
    });

    it.each(["type Test = { foo: string; } & { bar: string; };"])(
      "Mutable",
      (code) => {
        runTestImmutability(code, Immutability.Mutable);
      },
    );

    it.each(["type Test = Readonly<{ foo: string; } & { bar: string; }>;"])(
      "Immutable",
      (code) => {
        runTestImmutability(code, Immutability.Immutable);
      },
    );
  });

  describe("same props", () => {
    it.each([
      "type Test = { readonly foo: ReadonlyArray<string>; } & { readonly foo: Array<string>; };",
    ])("ReadonlyDeep", (code) => {
      runTestImmutability(code, Immutability.ReadonlyDeep);
    });
  });

  describe("arrays", () => {
    it.each(["type Test = ReadonlyArray<number> & { readonly 0: number; };"])(
      "ReadonlyDeep",
      (code) => {
        runTestImmutability(code, Immutability.ReadonlyDeep);
      },
    );
  });
});
