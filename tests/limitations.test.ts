/**
 * This file contains test that currently fail due to limitations in the implementation.
 *
 * Ideally we would like to get these tests to pass but so far that has proven to be very challenging.
 */

import test from "ava";

import { Immutability } from "../src";

import { runTestImmutability } from "./helpers";

test("override primitive", (t) => {
  const overrides = [
    {
      name: "string",
      to: Immutability.Mutable,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type Test = string;"
  ]) {
    runTestImmutability(
      t,
      { code, overrides },
      Immutability.Immutable,
      "can override a primitive"
    );
  }
});

// Both `A` and `B` get discarded - TypeScript directly use `string`.
test("alias of type primitive", (t) => {
  const code = `
    type A = string;
    type B = A;
  `;

  // prettier-ignore
  for (const overrides of [
    [{ name: "A", to: Immutability.Mutable }],
    [{ name: "B", to: Immutability.Mutable }]
  ]) {
    runTestImmutability(
      t,
      { code, overrides },
      Immutability.Mutable
    );
  }
});
