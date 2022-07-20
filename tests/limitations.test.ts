/**
 * This file contains test that currently fail due to limitations in the implementation.
 *
 * Ideally we would like to get these tests to pass but so far that has proven to be very challenging.
 */

import test from "ava";

import type { ImmutablenessOverrides } from "../src";
import { Immutableness } from "../src";

import { runTestImmutableness } from "./helpers";

test("override an expression of alias to primitive", (t) => {
  const overrides: ImmutablenessOverrides = [
    {
      name: "B",
      to: Immutableness.Mutable,
    },
  ];

  // prettier-ignore
  for (const code of [
    "type A = B; type B = string;",
  ]) {
    runTestImmutableness(
      t,
      { code, overrides },
      Immutableness.Mutable
    );
  }
});
