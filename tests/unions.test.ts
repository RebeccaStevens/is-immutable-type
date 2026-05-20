import dedent from "dedent";
import { describe, it } from "vitest";

import { Immutability, type ImmutabilityOverrides } from "#is-immutable-type";

import { runTestImmutability } from "./helpers";

describe("Unions", () => {
  describe("override resolution is independent of constituent order", () => {
    const overrides: ImmutabilityOverrides = [
      { type: "Error", to: Immutability.ReadonlyShallow },
    ];

    it.each([
      "type Test = Error | string;",
      "type Test = string | Error;",
    ])("ReadonlyShallow regardless of source order (%s)", (code) => {
      runTestImmutability({ code, overrides }, Immutability.ReadonlyShallow);
    });
  });

  describe("override resolves through aliases that wrap a union", () => {
    const overrides: ImmutabilityOverrides = [
      { type: "MyError", to: Immutability.ReadonlyShallow },
    ];

    it("constituent is itself an alias inside a direct union", () => {
      runTestImmutability(
        {
          code: dedent`
            type MyError = Error;
            type Test = MyError | string;
          `,
          overrides,
        },
        Immutability.ReadonlyShallow,
      );
    });

    it("the union is reached via a parenthesized type", () => {
      runTestImmutability(
        {
          code: dedent`
            type MyError = Error;
            type Test = (MyError | string);
          `,
          overrides,
        },
        Immutability.ReadonlyShallow,
      );
    });

    it("the union is reached via a type-alias reference", () => {
      runTestImmutability(
        {
          code: dedent`
            type MyError = Error;
            type Aliased = MyError | string;
            type Test = Aliased;
          `,
          overrides,
        },
        Immutability.ReadonlyShallow,
      );
    });
  });

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
