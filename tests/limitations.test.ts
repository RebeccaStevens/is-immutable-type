/**
 * This file contains test that currently fail due to limitations in the implementation.
 *
 * Ideally we would like to get these tests to pass but so far that has proven to be very challenging.
 */

import { describe, it } from "vitest";

import { Immutability } from "#is-immutable-type";

import { runTestImmutability } from "./helpers";

describe("Limitations", () => {
  it("overrids an unused alias of a primitive", () => {
    runTestImmutability(
      {
        code: `type A = string;`,
        overrides: [{ type: "A", to: Immutability.Mutable }],
      },
      Immutability.Mutable,
    );
  });
});
