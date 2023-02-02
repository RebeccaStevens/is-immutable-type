import test from "ava";

import { Immutability } from "../src";

import { runTestImmutability } from "./helpers";

test("simple", (t) => {
  // prettier-ignore
  for (const code of [
    "type Test = Readonly<{ foo: string; }> & Readonly<{ bar: string; }>;",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "handles simple intersections of immutable types"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = readonly (number | string)[] & readonly (number | boolean)[];",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyDeep,
      "handles simple intersections of deeply readonly types"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = { foo: string; } & { bar: string; };",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Mutable,
      "handles simple intersections of mutable types"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = Readonly<{ foo: string; } & { bar: string; }>;",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "handles immutable intersections of mutable types"
    );
  }
});

test("same props", (t) => {
  // prettier-ignore
  for (const code of [
    "type Test = { readonly foo: ReadonlyArray<string>; } & { readonly foo: Array<string>; };",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyDeep,
      "handles intersections of deeply readonly prop with shallowly readonly prop"
    );
  }
});

test("arrays", (t) => {
  // prettier-ignore
  for (const code of [
    "type Test = ReadonlyArray<number> & { readonly 0: number; };",
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.ReadonlyDeep,
      "handles intersections involving readonly arrays"
    );
  }
});
