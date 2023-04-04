import test from "ava";

import { Immutability, type ImmutabilityOverrides } from "../src";

import { runTestImmutability } from "./helpers";

test("root by name", (t) => {
  const overrides: ImmutabilityOverrides = [
    {
      name: "Test",
      to: Immutability.Immutable,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = { foo: string };"
  ]) {

    runTestImmutability(
      t,
      { code, overrides },
      Immutability.Immutable,
      "can override a type name from an mutable type to be immutable by name"
    );
  }
});

test("root by pattern", (t) => {
  const overrides: ImmutabilityOverrides = [
    {
      pattern: /^T.*/u,
      to: Immutability.Immutable,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test<G> = { foo: string };"
  ]) {

    runTestImmutability(
      t,
      { code, overrides },
      Immutability.Immutable,
      "can override a type name from an mutable type to be immutable by a pattern"
    );
  }
});

test("use type parameters in pattern of root override", (t) => {
  const overrides: ImmutabilityOverrides = [
    {
      pattern: /^Test<.+>/u,
      to: Immutability.Immutable,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test<G> = { foo: string };"
  ]) {

    runTestImmutability(
      t,
      { code, overrides },
      Immutability.Immutable,
      "can override a type name using a pattern with type parameters."
    );
  }
});

test("expression by name", (t) => {
  const overrides: ImmutabilityOverrides = [
    {
      name: "string",
      to: Immutability.Mutable,
    },
    {
      name: "ReadonlyArray",
      to: Immutability.Mutable,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = string;",
    "type Test = ReadonlyArray<string>",
  ]) {

    runTestImmutability(
      t,
      { code, overrides },
      Immutability.Mutable,
      "can override a type expression from an immutable type to be mutable by name"
    );
  }
});

test("expression by a pattern", (t) => {
  const overrides: ImmutabilityOverrides = [
    {
      pattern: /^s.*g$/u,
      to: Immutability.Mutable,
    },
    {
      pattern: /Readonly/u,
      to: Immutability.Mutable,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = string;",
    "type Test = ReadonlyArray<string>",
  ]) {
    runTestImmutability(
      t,
      { code, overrides },
      Immutability.Mutable,
      "can override a type expression from an immutable type to be mutable by a pattern"
    );
  }
});

test("expression from lower by name", (t) => {
  const overrides: ImmutabilityOverrides = [
    {
      name: "ReadonlyArray",
      to: Immutability.Immutable,
      from: Immutability.ReadonlyDeep,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<Readonly<{ foo: string }>>;",
    "type Test = readonly Readonly<{ foo: string }>[];"
  ]) {
    runTestImmutability(
      t,
      { code, overrides },
      Immutability.Immutable,
      "can override a type expression from an deeply readonly type to be immutable by name"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<{ foo: string }>;",
    "type Test = readonly { foo: string }[];"
  ]) {
    runTestImmutability(
      t,
      { code, overrides },
      Immutability.ReadonlyShallow,
      "respects lower immutability"
    );
  }
});

test("expression from lower by a pattern", (t) => {
  const overrides: ImmutabilityOverrides = [
    {
      pattern: /^Readonly.+<.+>$/u,
      to: Immutability.Immutable,
      from: Immutability.ReadonlyDeep,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<Readonly<{ foo: string }>>;"
  ]) {
    runTestImmutability(
      t,
      { code, overrides },
      Immutability.Immutable,
      "can override a type expression from an deeply readonly type to be immutable by a pattern"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<{ foo: string }>;"
  ]) {
    runTestImmutability(
      t,
      { code, overrides },
      Immutability.ReadonlyShallow,
      "respects lower immutability"
    );
  }
});

test("expression from higher by name", (t) => {
  const overrides: ImmutabilityOverrides = [
    {
      name: "ReadonlyArray",
      to: Immutability.Mutable,
      from: Immutability.ReadonlyShallow,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<{ foo: string }>;"
  ]) {
    runTestImmutability(
      t,
      { code, overrides },
      Immutability.Mutable,
      "can override a type expression from an shallowly readonly type to be mutable by name"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<Readonly<{ foo: string }>>;"
  ]) {
    runTestImmutability(
      t,
      { code, overrides },
      Immutability.ReadonlyDeep,
      "respects higher immutability"
    );
  }
});

test("expression from higher by a pattern", (t) => {
  const overrides: ImmutabilityOverrides = [
    {
      pattern: /^Readonly.+<.+>$/u,
      to: Immutability.Mutable,
      from: Immutability.ReadonlyShallow,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<{ foo: string }>;"
  ]) {
    runTestImmutability(
      t,
      { code, overrides },
      Immutability.Mutable,
      "can override a type expression from an shallowly readonly type to be mutable by a pattern"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<Readonly<{ foo: string }>>;"
  ]) {
    runTestImmutability(
      t,
      { code, overrides },
      Immutability.ReadonlyDeep,
      "respects higher immutability"
    );
  }
});

test("wrapper by name", (t) => {
  const overrides: ImmutabilityOverrides = [
    {
      name: "ReadonlyDeep",
      to: Immutability.ReadonlyDeep,
    },
  ];

  // prettier-ignore
  for (const code of [
    `
      type ReadonlyDeep<T> = T | {};
      type Test = ReadonlyDeep<{ foo: { bar: string; }; }>;
    `
  ]) {
    runTestImmutability(
      t,
      { code, overrides },
      Immutability.ReadonlyDeep,
      "can override a type expression from an shallowly readonly type to be mutable by a pattern"
    );
  }
});

test("wrapper by pattern", (t) => {
  const overrides: ImmutabilityOverrides = [
    {
      pattern: /^ReadonlyDeep<.+>$/u,
      to: Immutability.ReadonlyDeep,
    },
  ];

  // prettier-ignore
  for (const code of [
    `
      type ReadonlyDeep<T> = T extends object ? ReadonlyDeepInternal<T> : string;
      type ReadonlyDeepInternal<T> = { [K in keyof T]: Readonly<T[K]> }
      type Test = ReadonlyDeep<{ foo: { bar: string; }; }>;
    `
  ]) {
    runTestImmutability(
      t,
      { code, overrides },
      Immutability.ReadonlyDeep,
      "can override a type expression from an shallowly readonly type to be mutable by a pattern"
    );
  }
});

test("rename alias with type parameter", (t) => {
  const overrides: ImmutabilityOverrides = [
    {
      name: "ImmutableArray",
      to: Immutability.Immutable,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type ImmutableArray<T> = ReadonlyArray<T>;"
  ]) {
    runTestImmutability(
      t,
      { code, overrides },
      Immutability.Immutable,
      "can treat a rename alias with an type parameter differently to the original."
    );
  }

  /* prettier-ignore */
  for (const code of [
    `
      type ImmutableArray<T> = ReadonlyArray<T>;
      type Test = ReadonlyArray<string>;
    `,
  ]) {
    runTestImmutability(
      t,
      { code, overrides },
      Immutability.ReadonlyDeep,
      "ReadonlyArray is still treaded as `ReadonlyDeep`."
    );
  }
});

test("rename alias of type with type parameter", (t) => {
  const overrides: ImmutabilityOverrides = [
    {
      name: "A",
      to: Immutability.Mutable,
    },
  ];

  // prettier-ignore
  for (const code of [
    `
      type B<T> = string | T;
      type A = B<number>;
    `
  ]) {
  runTestImmutability(
    t,
    { code, overrides },
    Immutability.Mutable,
    "can treat a rename alias differently to the original with a type parameter."
  );
  }
});
