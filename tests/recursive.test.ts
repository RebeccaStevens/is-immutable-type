import dedent from "dedent";
import { describe, it } from "vitest";

import { Immutability } from "#is-immutable-type";

import { runTestImmutability, runTestName } from "./helpers";

describe("Recursive Types", () => {
  describe("direct", () => {
    it.each([
      `
      interface I { readonly [key: string]: string | I };
      const test: I = {};
    `,
    ])("Immutable", (code) => {
      runTestImmutability(code, Immutability.Immutable);
    });

    it.each(["type Test = string | ReadonlyArray<Test>;"])(
      "ReadonlyDeep",
      (code) => {
        runTestImmutability(code, Immutability.ReadonlyDeep);
      },
    );

    it.each(["type Test = ReadonlyArray<Test | { foo: 1 }>;"])(
      "ReadonlyShallow",
      (code) => {
        runTestImmutability(code, Immutability.ReadonlyShallow);
      },
    );

    it.each(["type Test = string | Test[];"])("Mutable", (code) => {
      runTestImmutability(code, Immutability.Mutable);
    });
  });

  describe("generics", () => {
    it.each([
      "type Test<G> = Readonly<{ foo: Test<string> | string; }>;",
      "type Test<G> = G extends string ? Readonly<{ foo: string }> : Test<string>",
    ])("Immutable", (code) => {
      runTestImmutability(code, Immutability.Immutable);
    });

    it.each([
      "type Test<G> = Readonly<{ foo: ReadonlyArray<Test<string>> | G; }>;",
      "type Test<G> = G extends string ? ReadonlyArray<string> : Test<string>",
    ])("ReadonlyDeep", (code) => {
      runTestImmutability(code, Immutability.ReadonlyDeep);
    });

    it.each([
      "type Test<G> = Readonly<{ foo: Array<Test<string>> | string; }>;",
      "type Test<G> = G extends string ? Readonly<{ foo: Array<string>; }> : Test<string>",
    ])("ReadonlyShallow", (code) => {
      runTestImmutability(code, Immutability.ReadonlyShallow);
    });

    it.each([
      "type Test<G> = { foo: Test<string> | string; };",
      "type Test<G> = G extends string ? { foo: string } : Test<string>",
    ])("Mutable", (code) => {
      runTestImmutability(code, Immutability.Mutable);
    });
  });

  describe("nested", () => {
    it.each(["type Foo<U> = { readonly foo: Foo<Foo<U>>; };"])(
      "Immutable",
      (code) => {
        runTestImmutability(code, Immutability.Immutable);
      },
    );
  });

  describe("Complex", () => {
    it("Handles more complex recursive types", () => {
      const code = dedent`
        type TransposeArray<T extends ReadonlyArray<ReadonlyArray<unknown>>> =
          T extends readonly [infer X, ...infer XS]
            ? [X[], ...TransposeArray<XS>]
            : T extends ReadonlyArray<infer X>
              ? X[][]
              : never;
      `;

      runTestImmutability(code, Immutability.Mutable);
      runTestName(code, "TransposeArray<T>");
    });
  });
});
