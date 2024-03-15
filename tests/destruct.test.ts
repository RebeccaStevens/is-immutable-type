import { describe, it } from "vitest";

import { Immutability } from "#is-immutable-type";

import { runTestImmutability } from "./helpers";

describe("destructuring arrays", () => {
  it.each([
    `
      const [a, b, ...c] = [1, 2, 3, 4];"
      type Test = typeof a;
    `,
    `
      const [a, b, ...c] = [1, 2, 3, 4];"
      type Test = typeof b;
    `,
  ])("Immutable", (code) => {
    runTestImmutability(code, Immutability.Immutable);
  });

  it.each([
    `
      const [a, b, ...c] = [1, 2, 3, 4];
      type Test = typeof c;
    `,
  ])("Mutable", (code) => {
    runTestImmutability(code, Immutability.Mutable);
  });
});

describe("destructuring objects", () => {
  it.each([
    `
      const { a, b, ...c } = { a: 1, b: 2, d: 4, e: 5 };"
      type Test = typeof a;
    `,
    `
      const { a, b, ...c } = { a: 1, b: 2, d: 4, e: 5 };"
      type Test = typeof b;
    `,
  ])("Immutable", (code) => {
    runTestImmutability(code, Immutability.Immutable);
  });

  it.each([
    `
      const { a, b, ...c } = { a: 1, b: 2, d: 4, e: 5 };
      type Test = typeof c;
    `,
  ])("Mutable", (code) => {
    runTestImmutability(code, Immutability.Mutable);
  });
});
