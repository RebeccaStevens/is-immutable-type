/**
 * This file contains test that currently fail due to limitations in the implementation.
 *
 * Ideally we would like to get these tests to pass but so far that has proven to be very challenging.
 */

import test from "ava";

import { Immutableness } from "../src";

import { runTestImmutableness } from "./helpers";

test("override primitive", (t) => {
  const overrides = [
    {
      name: "string",
      to: Immutableness.Mutable,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = string;"
  ]) {
    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.Immutable,
      "can override a primitive"
    );
  }
});

// Both `A` and `B` get discarded - TypeScript directly use `string`.
test("alias of type primitive", (t) => {
  const code = "type A = B; type B = string;";

  // prettier-ignore
  for (const overrides of [
    [{ name: "A", to: Immutableness.Mutable }],
    [{ name: "B", to: Immutableness.Mutable }]
  ]) {
    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.Mutable
    );
  }
});
