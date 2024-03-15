import { describe, it } from "vitest";

import { Immutability, type ImmutabilityOverrides } from "#is-immutable-type";

import { runTestImmutability } from "./helpers";

describe("Overrides", () => {
  describe("root by name", () => {
    const overrides: ImmutabilityOverrides = [
      {
        type: "Test",
        to: Immutability.Immutable,
      },
    ];

    it.each(["type Test = { foo: string };"])("Immutable", (code) => {
      runTestImmutability({ code, overrides }, Immutability.Immutable);
    });
  });

  describe("root by pattern", () => {
    const overrides: ImmutabilityOverrides = [
      {
        type: /^T.*/u,
        to: Immutability.Immutable,
      },
      {
        type: { from: "file", pattern: /^T.*/u },
        to: Immutability.Immutable,
      },
    ];

    it.each(["type Test<G> = { foo: string };"])("Immutable", (code) => {
      runTestImmutability({ code, overrides }, Immutability.Immutable);
    });
  });

  describe("use type parameters in pattern of root override", () => {
    const overrides: ImmutabilityOverrides = [
      {
        type: /^Test<.+>/u,
        to: Immutability.Immutable,
      },
      {
        type: { from: "file", pattern: /^Test<.+>/u },
        to: Immutability.Immutable,
      },
    ];

    it.each(["type Test<G> = { foo: string };"])("Immutable", (code) => {
      runTestImmutability({ code, overrides }, Immutability.Immutable);
    });
  });

  describe("expression by name", () => {
    const overrides: ImmutabilityOverrides = [
      {
        type: "string",
        to: Immutability.Mutable,
      },
      {
        type: { from: "lib", name: "string" },
        to: Immutability.Mutable,
      },
      {
        type: "ReadonlyArray",
        to: Immutability.Mutable,
      },
      {
        type: { from: "lib", name: "ReadonlyArray" },
        to: Immutability.Mutable,
      },
    ];

    it.each(["type Test = string;", "type Test = ReadonlyArray<string>"])(
      "Mutable",
      (code) => {
        runTestImmutability({ code, overrides }, Immutability.Mutable);
      },
    );
  });

  describe("expression by a pattern", () => {
    const overrides: ImmutabilityOverrides = [
      {
        type: /^s.*g$/u,
        to: Immutability.Mutable,
      },
      {
        type: { from: "lib", pattern: /^s.*g$/u },
        to: Immutability.Mutable,
      },
      {
        type: /Readonly/u,
        to: Immutability.Mutable,
      },
      {
        type: { from: "lib", pattern: /Readonly/u },
        to: Immutability.Mutable,
      },
    ];

    it.each(["type Test = string;", "type Test = ReadonlyArray<string>"])(
      "Mutable",
      (code) => {
        runTestImmutability({ code, overrides }, Immutability.Mutable);
      },
    );
  });

  describe("expression from lower by name", () => {
    const overrides: ImmutabilityOverrides = [
      {
        type: "ReadonlyArray",
        to: Immutability.Immutable,
        from: Immutability.ReadonlyDeep,
      },
      {
        type: { from: "lib", name: "ReadonlyArray" },
        to: Immutability.Immutable,
        from: Immutability.ReadonlyDeep,
      },
    ];

    it.each([
      "type Test = ReadonlyArray<Readonly<{ foo: string }>>;",
      "type Test = readonly Readonly<{ foo: string }>[];",
    ])("Immutable", (code) => {
      runTestImmutability({ code, overrides }, Immutability.Immutable);
    });

    it.each([
      "type Test = ReadonlyArray<{ foo: string }>;",
      "type Test = readonly { foo: string }[];",
    ])("ReadonlyShallow", (code) => {
      runTestImmutability({ code, overrides }, Immutability.ReadonlyShallow);
    });
  });

  describe("expression from lower by a pattern", () => {
    const overrides: ImmutabilityOverrides = [
      {
        type: /^Readonly.+<.+>$/u,
        to: Immutability.Immutable,
        from: Immutability.ReadonlyDeep,
      },
      {
        type: { from: "lib", pattern: /^Readonly.+<.+>$/u },
        to: Immutability.Immutable,
        from: Immutability.ReadonlyDeep,
      },
    ];

    it.each(["type Test = ReadonlyArray<Readonly<{ foo: string }>>;"])(
      "Immutable",
      (code) => {
        runTestImmutability({ code, overrides }, Immutability.Immutable);
      },
    );

    it.each(["type Test = ReadonlyArray<{ foo: string }>;"])(
      "ReadonlyShallow",
      (code) => {
        runTestImmutability({ code, overrides }, Immutability.ReadonlyShallow);
      },
    );
  });

  describe("expression from higher by name", () => {
    const overrides: ImmutabilityOverrides = [
      {
        type: "ReadonlyArray",
        to: Immutability.Mutable,
        from: Immutability.ReadonlyShallow,
      },
      {
        type: { from: "lib", name: "ReadonlyArray" },
        to: Immutability.Mutable,
        from: Immutability.ReadonlyShallow,
      },
    ];

    it.each(["type Test = ReadonlyArray<{ foo: string }>;"])(
      "Mutable",
      (code) => {
        runTestImmutability({ code, overrides }, Immutability.Mutable);
      },
    );

    it.each(["type Test = ReadonlyArray<Readonly<{ foo: string }>>;"])(
      "ReadonlyDeep",
      (code) => {
        runTestImmutability({ code, overrides }, Immutability.ReadonlyDeep);
      },
    );
  });

  describe("expression from higher by a pattern", () => {
    const overrides: ImmutabilityOverrides = [
      {
        type: /^Readonly.+<.+>$/u,
        to: Immutability.Mutable,
        from: Immutability.ReadonlyShallow,
      },
      {
        type: { from: "lib", pattern: /^Readonly.+<.+>$/u },
        to: Immutability.Mutable,
        from: Immutability.ReadonlyShallow,
      },
    ];

    it.each(["type Test = ReadonlyArray<{ foo: string }>;"])(
      "Mutable",
      (code) => {
        runTestImmutability({ code, overrides }, Immutability.Mutable);
      },
    );

    it.each(["type Test = ReadonlyArray<Readonly<{ foo: string }>>;"])(
      "ReadonlyDeep",
      (code) => {
        runTestImmutability({ code, overrides }, Immutability.ReadonlyDeep);
      },
    );
  });

  describe("wrapper by name", () => {
    const overrides: ImmutabilityOverrides = [
      {
        type: "ReadonlyDeep",
        to: Immutability.ReadonlyDeep,
      },
      {
        type: { from: "lib", name: "ReadonlyDeep" },
        to: Immutability.ReadonlyDeep,
      },
    ];

    it.each([
      `
      type ReadonlyDeep<T> = T | {};
      type Test = ReadonlyDeep<{ foo: { bar: string; }; }>;
    `,
    ])("ReadonlyDeep", (code) => {
      runTestImmutability({ code, overrides }, Immutability.ReadonlyDeep);
    });
  });

  describe("wrapper by pattern", () => {
    const overrides: ImmutabilityOverrides = [
      {
        type: /^ReadonlyDeep<.+>$/u,
        to: Immutability.ReadonlyDeep,
      },
      {
        type: { from: "file", pattern: /^ReadonlyDeep<.+>$/u },
        to: Immutability.ReadonlyDeep,
      },
    ];

    it.each([
      `
      type ReadonlyDeep<T> = T extends object ? ReadonlyDeepInternal<T> : string;
      type ReadonlyDeepInternal<T> = { [K in keyof T]: Readonly<T[K]> }
      type Test = ReadonlyDeep<{ foo: { bar: string; }; }>;
    `,
    ])("ReadonlyDeep", (code) => {
      runTestImmutability({ code, overrides }, Immutability.ReadonlyDeep);
    });
  });

  describe("rename alias with type parameter", () => {
    const overrides: ImmutabilityOverrides = [
      {
        type: "ImmutableArray",
        to: Immutability.Immutable,
      },
      {
        type: { from: "lib", name: "ImmutableArray" },
        to: Immutability.Immutable,
      },
    ];

    it.each(["type ImmutableArray<T> = ReadonlyArray<T>;"])(
      "Immutable",
      (code) => {
        runTestImmutability({ code, overrides }, Immutability.Immutable);
      },
    );

    it.each([
      `
      type ImmutableArray<T> = ReadonlyArray<T>;
      type Test = ReadonlyArray<string>;
    `,
    ])("ReadonlyDeep", (code) => {
      runTestImmutability({ code, overrides }, Immutability.ReadonlyDeep);
    });
  });

  describe("rename alias of type with type parameter", () => {
    const overrides: ImmutabilityOverrides = [
      {
        type: "A",
        to: Immutability.Mutable,
      },
      {
        type: { from: "lib", name: "A" },
        to: Immutability.Mutable,
      },
    ];

    it.each([
      `
      type B<T> = string | T;
      type A = B<number>;
    `,
    ])("Mutable", (code) => {
      runTestImmutability({ code, overrides }, Immutability.Mutable);
    });
  });

  describe("Primitives", () => {
    const code = `
      type A = string;
      type B = A;
    `;

    it("overrids a primitive", () => {
      runTestImmutability(
        { code, overrides: [{ type: "string", to: Immutability.Mutable }] },
        Immutability.Mutable,
      );
    });

    it("overrids a used alias of a primitive", () => {
      runTestImmutability(
        { code, overrides: [{ type: "A", to: Immutability.Mutable }] },
        Immutability.Mutable,
      );
    });
  });
});
