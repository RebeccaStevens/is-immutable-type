import dedent from "dedent";
import { describe, it } from "vitest";

import { Immutability, type ImmutabilityOverrides } from "#is-immutable-type";

import { runTestImmutability } from "./helpers";

type OverrideSet = Array<{ overrides: ImmutabilityOverrides }>;

describe("Overrides", () => {
  describe("root by name", () => {
    describe.each([
      {
        overrides: [
          {
            type: "Test",
            to: Immutability.Immutable,
          },
        ],
      },
    ] as OverrideSet)("%s", ({ overrides }) => {
      it.each(["type Test = { foo: string };"])("Immutable", (code) => {
        runTestImmutability({ code, overrides }, Immutability.Immutable);
      });
    });
  });

  describe("root by pattern", () => {
    describe.each([
      {
        overrides: [
          {
            type: /^T.*/u,
            to: Immutability.Immutable,
          },
        ],
      },
      {
        overrides: [
          {
            type: { from: "file", pattern: /^T.*/u },
            to: Immutability.Immutable,
          },
        ],
      },
    ] as OverrideSet)("%s", ({ overrides }) => {
      it.each(["type Test<G> = { foo: string };"])("Immutable", (code) => {
        runTestImmutability({ code, overrides }, Immutability.Immutable);
      });
    });

    // Test ignoring.
    describe.each([
      {
        overrides: [
          {
            type: { from: "file", pattern: /^T.*/u, ignoreName: "Test" },
            to: Immutability.Immutable,
          },
        ],
      },
      {
        overrides: [
          {
            type: { from: "file", pattern: /^T.*/u, ignorePattern: /^Test$/u },
            to: Immutability.Immutable,
          },
        ],
      },
    ] as OverrideSet)("%s", ({ overrides }) => {
      it.each(["type Test<G> = { foo: string };"])("Immutable", (code) => {
        runTestImmutability({ code, overrides }, Immutability.Mutable);
      });
    });
  });

  describe("expression by name", () => {
    describe.each([
      {
        overrides: [
          {
            type: "string",
            to: Immutability.Mutable,
          },
          {
            type: "ReadonlyArray",
            to: Immutability.Mutable,
          },
        ],
      },
      {
        overrides: [
          {
            type: { from: "lib", name: "string" },
            to: Immutability.Mutable,
          },
          {
            type: { from: "lib", name: "ReadonlyArray" },
            to: Immutability.Mutable,
          },
        ],
      },
    ] as OverrideSet)("%s", ({ overrides }) => {
      it.each(["type Test = string;", "type Test = ReadonlyArray<string>"])(
        "Mutable",
        (code) => {
          runTestImmutability({ code, overrides }, Immutability.Mutable);
        },
      );
    });
  });

  describe("expression by a pattern", () => {
    describe.each([
      {
        overrides: [
          {
            type: /^s.*g$/u,
            to: Immutability.Mutable,
          },
          {
            type: /Readonly/u,
            to: Immutability.Mutable,
          },
        ],
      },
      {
        overrides: [
          {
            type: { from: "lib", pattern: /^s.*g$/u },
            to: Immutability.Mutable,
          },
          {
            type: { from: "lib", pattern: /Readonly/u },
            to: Immutability.Mutable,
          },
        ],
      },
    ] as OverrideSet)("%s", ({ overrides }) => {
      it.each(["type Test = string;", "type Test = ReadonlyArray<string>"])(
        "Mutable",
        (code) => {
          runTestImmutability({ code, overrides }, Immutability.Mutable);
        },
      );
    });
  });

  describe("expression from lower by name", () => {
    describe.each([
      {
        overrides: [
          {
            type: "ReadonlyArray",
            to: Immutability.Immutable,
            from: Immutability.ReadonlyDeep,
          },
        ],
      },
      {
        overrides: [
          {
            type: { from: "lib", name: "ReadonlyArray" },
            to: Immutability.Immutable,
            from: Immutability.ReadonlyDeep,
          },
        ],
      },
    ] as OverrideSet)("%s", ({ overrides }) => {
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
  });

  describe("expression from lower by a pattern", () => {
    describe.each([
      {
        overrides: [
          {
            type: /^Readonly.+<.+>$/u,
            to: Immutability.Immutable,
            from: Immutability.ReadonlyDeep,
          },
        ],
      },
      {
        overrides: [
          {
            type: { from: "lib", pattern: /^Readonly.+<.+>$/u },
            to: Immutability.Immutable,
            from: Immutability.ReadonlyDeep,
          },
        ],
      },
    ] as OverrideSet)("%s", ({ overrides }) => {
      it.each(["type Test = ReadonlyArray<Readonly<{ foo: string }>>;"])(
        "Immutable",
        (code) => {
          runTestImmutability({ code, overrides }, Immutability.Immutable);
        },
      );

      it.each(["type Test = ReadonlyArray<{ foo: string }>;"])(
        "ReadonlyShallow",
        (code) => {
          runTestImmutability(
            { code, overrides },
            Immutability.ReadonlyShallow,
          );
        },
      );
    });
  });

  describe("expression from higher by name", () => {
    describe.each([
      {
        overrides: [
          {
            type: "ReadonlyArray",
            to: Immutability.Mutable,
            from: Immutability.ReadonlyShallow,
          },
        ],
      },
      {
        overrides: [
          {
            type: { from: "lib", name: "ReadonlyArray" },
            to: Immutability.Mutable,
            from: Immutability.ReadonlyShallow,
          },
        ],
      },
    ] as OverrideSet)("%s", ({ overrides }) => {
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
  });

  describe("expression from higher by a pattern", () => {
    describe.each([
      {
        overrides: [
          {
            type: /^Readonly.+<.+>$/u,
            to: Immutability.Mutable,
            from: Immutability.ReadonlyShallow,
          },
        ],
      },
      {
        overrides: [
          {
            type: { from: "lib", pattern: /^Readonly.+<.+>$/u },
            to: Immutability.Mutable,
            from: Immutability.ReadonlyShallow,
          },
        ],
      },
    ] as OverrideSet)("%s", ({ overrides }) => {
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
  });

  describe("wrapper by name", () => {
    describe.each([
      {
        overrides: [
          {
            type: "ReadonlyDeep",
            to: Immutability.ReadonlyDeep,
          },
        ],
      },
      {
        overrides: [
          {
            type: { from: "lib", name: "ReadonlyDeep" },
            to: Immutability.ReadonlyDeep,
          },
        ],
      },
    ] as OverrideSet)("%s", ({ overrides }) => {
      it.each([
        `
      type ReadonlyDeep<T> = T | {};
      type Test = ReadonlyDeep<{ foo: { bar: string; }; }>;
    `,
      ])("ReadonlyDeep", (code) => {
        runTestImmutability({ code, overrides }, Immutability.ReadonlyDeep);
      });
    });
  });

  describe("wrapper by pattern", () => {
    describe.each([
      {
        overrides: [
          {
            type: /^ReadonlyDeep<.+>$/u,
            to: Immutability.ReadonlyDeep,
          },
        ],
      },
      {
        overrides: [
          {
            type: { from: "file", pattern: /^ReadonlyDeep<.+>$/u },
            to: Immutability.ReadonlyDeep,
          },
        ],
      },
    ] as OverrideSet)("%s", ({ overrides }) => {
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
  });

  describe("rename alias with type parameter", () => {
    describe.each([
      {
        overrides: [
          {
            type: "ImmutableArray",
            to: Immutability.Immutable,
          },
        ],
      },
      {
        overrides: [
          {
            type: { from: "lib", name: "ImmutableArray" },
            to: Immutability.Immutable,
          },
        ],
      },
    ] as OverrideSet)("%s", ({ overrides }) => {
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
  });

  describe("rename alias of type with type parameter", () => {
    describe.each([
      {
        overrides: [
          {
            type: "A",
            to: Immutability.Mutable,
          },
        ],
      },
      {
        overrides: [
          {
            type: { from: "lib", name: "A" },
            to: Immutability.Mutable,
          },
        ],
      },
    ] as OverrideSet)("%s", ({ overrides }) => {
      it.each([
        `
      type B<T> = string | T;
      type A = B<number>;
    `,
      ])("Mutable", (code) => {
        runTestImmutability({ code, overrides }, Immutability.Mutable);
      });
    });
  });

  describe("Primitives", () => {
    it("overrids a primitive", () => {
      runTestImmutability(
        {
          code: dedent`
            type A = string;
          `,
          overrides: [{ type: "string", to: Immutability.Mutable }],
        },
        Immutability.Mutable,
      );
    });

    it("overrids a used alias of a primitive", () => {
      runTestImmutability(
        {
          code: dedent`
            type A = string;
            type B = A;
          `,
          overrides: [{ type: "A", to: Immutability.Mutable }],
        },
        Immutability.Mutable,
      );
    });
  });
});
