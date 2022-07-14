import test from "ava";

import { Immutableness, type ImmutablenessOverrides } from "../src";

import { runTestForGetTypeImmutableness } from "./helpers";

test("simple", (t) => {
  // prettier-ignore
  for (const code of [
    "type Test = string;",
    "type Test = ReadonlyArray<string>",
  ]) {
    const overrides: ImmutablenessOverrides = [
      {
        name: "string",
        to: Immutableness.Mutable,
      },
      {
        name: "ReadonlyArray",
        to: Immutableness.Mutable,
      }
    ];

    runTestForGetTypeImmutableness(
      t,
      { code, overrides },
      Immutableness.Mutable,
      "can override an immutable type to be mutable"
    );
  }
});

test("from lower", (t) => {
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
    runTestForGetTypeImmutableness(
      t,
      { code, overrides },
      Immutableness.Immutable,
      "can override an deeply readonly type to be immutable"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<{foo: string}>;"
  ]) {
    runTestForGetTypeImmutableness(
      t,
      { code, overrides },
      Immutableness.ReadonlyShallow,
      "respects lower immutableness"
    );
  }
});

test("from hgiher", (t) => {
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
    runTestForGetTypeImmutableness(
      t,
      { code, overrides },
      Immutableness.Mutable,
      "can override an shallowly readonly type to be mutable"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<Readonly<{foo: string}>>;"
  ]) {
    runTestForGetTypeImmutableness(
      t,
      { code, overrides },
      Immutableness.ReadonlyDeep,
      "respects higher immutableness"
    );
  }
});
