import { describe, it } from "vitest";

import { Immutability } from "#is-immutable-type";

import { runTestImmutability } from "./helpers";

describe("Intersections", () => {
  describe("simple", () => {
    it.each(["type Test = Readonly<{ foo: string; }> & Readonly<{ bar: string; }>;"])("Immutable", (code) => {
      runTestImmutability(code, Immutability.Immutable);
    });

    it.each(["type Test = readonly (number | string)[] & readonly (number | boolean)[];"])("ReadonlyDeep", (code) => {
      runTestImmutability(code, Immutability.ReadonlyDeep);
    });

    it.each(["type Test = { foo: string; } & { bar: string; };"])("Mutable", (code) => {
      runTestImmutability(code, Immutability.Mutable);
    });

    it.each(["type Test = Readonly<{ foo: string; } & { bar: string; }>;"])("Immutable", (code) => {
      runTestImmutability(code, Immutability.Immutable);
    });
  });

  describe("same props", () => {
    it.each(["type Test = { readonly foo: ReadonlyArray<string>; } & { readonly foo: Array<string>; };"])(
      "ReadonlyDeep",
      (code) => {
        runTestImmutability(code, Immutability.ReadonlyDeep);
      },
    );
  });

  describe("arrays", () => {
    it.each(["type Test = ReadonlyArray<number> & { readonly 0: number; };"])("ReadonlyDeep", (code) => {
      runTestImmutability(code, Immutability.ReadonlyDeep);
    });
  });

  describe("primitives", () => {
    it.each(["string", "number", "boolean", "symbol", "bigint"])(
      "treats %s intersected with an empty object as immutable",
      (primitive) => {
        runTestImmutability(`type Test = ${primitive} & {};`, Immutability.Immutable);
      },
    );

    it("treats a readonly branded primitive as immutable", () => {
      runTestImmutability(
        `
          declare const brand: unique symbol;
          type Test = number & { readonly [brand]: true };
        `,
        Immutability.Immutable,
      );
    });

    it("treats writable properties added to a primitive as mutable", () => {
      runTestImmutability("type Test = number & { value: string };", Immutability.Mutable);
    });

    it("treats methods added to a primitive as readonly deep", () => {
      runTestImmutability("type Test = number & { mutate(): void };", Immutability.ReadonlyDeep);
    });
  });
});
