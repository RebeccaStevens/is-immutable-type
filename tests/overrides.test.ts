import test from "ava";

import { Immutableness, type ImmutablenessOverrides } from "../src";

import { runTestImmutableness } from "./helpers";

test("simple by name", (t) => {
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
      "can override an immutable type to be mutable by name"
    );
  }
});

test("simple by a pattern", (t) => {
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
      "can override an immutable type to be mutable by a pattern"
    );
  }
});

test("from lower by name", (t) => {
  const overrides: ImmutablenessOverrides = [
    {
      name: "ReadonlyArray",
      to: Immutableness.Immutable,
      from: Immutableness.ReadonlyDeep,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<Readonly<{foo: string}>>;"
  ]) {
    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.Immutable,
      "can override an deeply readonly type to be immutable by name"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<{foo: string}>;"
  ]) {
    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.ReadonlyShallow,
      "respects lower immutableness"
    );
  }
});

test("from lower by a pattern", (t) => {
  const overrides: ImmutablenessOverrides = [
    {
      pattern: /^Readonly.+<.+>$/u,
      to: Immutableness.Immutable,
      from: Immutableness.ReadonlyDeep,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<Readonly<{foo: string}>>;"
  ]) {
    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.Immutable,
      "can override an deeply readonly type to be immutable by a pattern"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<{foo: string}>;"
  ]) {
    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.ReadonlyShallow,
      "respects lower immutableness"
    );
  }
});

test("from hgiher by name", (t) => {
  const overrides: ImmutablenessOverrides = [
    {
      name: "ReadonlyArray",
      to: Immutableness.Mutable,
      from: Immutableness.ReadonlyShallow,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<{foo: string}>;"
  ]) {
    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.Mutable,
      "can override an shallowly readonly type to be mutable by name"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<Readonly<{foo: string}>>;"
  ]) {
    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.ReadonlyDeep,
      "respects higher immutableness"
    );
  }
});

test("from hgiher by a pattern", (t) => {
  const overrides: ImmutablenessOverrides = [
    {
      pattern: /^Readonly.+<.+>$/u,
      to: Immutableness.Mutable,
      from: Immutableness.ReadonlyShallow,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<{foo: string}>;"
  ]) {
    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.Mutable,
      "can override an shallowly readonly type to be mutable by a pattern"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<Readonly<{foo: string}>>;"
  ]) {
    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.ReadonlyDeep,
      "respects higher immutableness"
    );
  }
});
