import test from "ava";

import { Immutableness, type ImmutablenessOverrides } from "../src";

import { runTestImmutableness } from "./helpers";

test("root by name", (t) => {
  const overrides: ImmutablenessOverrides = [
    {
      name: "Test",
      to: Immutableness.Immutable,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = { foo: string };"
  ]) {

    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.Immutable,
      "can override a type name from an mutable type to be immutable by name"
    );
  }
});

test("root by pattern", (t) => {
  const overrides: ImmutablenessOverrides = [
    {
      pattern: /^T.*/u,
      to: Immutableness.Immutable,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test<G> = { foo: string };"
  ]) {

    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.Immutable,
      "can override a type name from an mutable type to be immutable by a pattern"
    );
  }
});

test("use type parameters in pattern of root override", (t) => {
  const overrides: ImmutablenessOverrides = [
    {
      pattern: /^Test<.+>/u,
      to: Immutableness.Immutable,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test<G> = { foo: string };"
  ]) {

    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.Immutable,
      "can override a type name using a pattern with type parameters."
    );
  }
});

test("expression by name", (t) => {
  const overrides: ImmutablenessOverrides = [
    {
      name: "string",
      to: Immutableness.Mutable,
    },
    {
      name: "ReadonlyArray",
      to: Immutableness.Mutable,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = string;",
    "type Test = ReadonlyArray<string>",
  ]) {

    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.Mutable,
      "can override a type expression from an immutable type to be mutable by name"
    );
  }
});

test("expression by a pattern", (t) => {
  const overrides: ImmutablenessOverrides = [
    {
      pattern: /^s.*g$/u,
      to: Immutableness.Mutable,
    },
    {
      pattern: /Readonly/u,
      to: Immutableness.Mutable,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = string;",
    "type Test = ReadonlyArray<string>",
  ]) {

    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.Mutable,
      "can override a type expression from an immutable type to be mutable by a pattern"
    );
  }
});

test("expression from lower by name", (t) => {
  const overrides: ImmutablenessOverrides = [
    {
      name: "ReadonlyArray",
      to: Immutableness.Immutable,
      from: Immutableness.ReadonlyDeep,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<Readonly<{ foo: string }>>;"
  ]) {
    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.Immutable,
      "can override a type expression from an deeply readonly type to be immutable by name"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<{ foo: string }>;"
  ]) {
    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.ReadonlyShallow,
      "respects lower immutableness"
    );
  }
});

test("expression from lower by a pattern", (t) => {
  const overrides: ImmutablenessOverrides = [
    {
      pattern: /^Readonly.+<.+>$/u,
      to: Immutableness.Immutable,
      from: Immutableness.ReadonlyDeep,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<Readonly<{ foo: string }>>;"
  ]) {
    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.Immutable,
      "can override a type expression from an deeply readonly type to be immutable by a pattern"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<{ foo: string }>;"
  ]) {
    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.ReadonlyShallow,
      "respects lower immutableness"
    );
  }
});

test("expression from hgiher by name", (t) => {
  const overrides: ImmutablenessOverrides = [
    {
      name: "ReadonlyArray",
      to: Immutableness.Mutable,
      from: Immutableness.ReadonlyShallow,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<{ foo: string }>;"
  ]) {
    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.Mutable,
      "can override a type expression from an shallowly readonly type to be mutable by name"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<Readonly<{ foo: string }>>;"
  ]) {
    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.ReadonlyDeep,
      "respects higher immutableness"
    );
  }
});

test("expression from hgiher by a pattern", (t) => {
  const overrides: ImmutablenessOverrides = [
    {
      pattern: /^Readonly.+<.+>$/u,
      to: Immutableness.Mutable,
      from: Immutableness.ReadonlyShallow,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<{ foo: string }>;"
  ]) {
    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.Mutable,
      "can override a type expression from an shallowly readonly type to be mutable by a pattern"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<Readonly<{ foo: string }>>;"
  ]) {
    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.ReadonlyDeep,
      "respects higher immutableness"
    );
  }
});
