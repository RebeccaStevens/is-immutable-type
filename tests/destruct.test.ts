import test from "ava";

import { Immutability } from "../src";

import { runTestImmutability } from "./helpers";

test("destructuring arrays", (t) => {
  for (const code of [
    `
      const [a, b, ...c] = [1, 2, 3, 4];"
      type Test = typeof a;
    `,
    `
      const [a, b, ...c] = [1, 2, 3, 4];"
      type Test = typeof b;
    `,
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "immutable elements in mutable destructed array are detected as immutable",
    );
  }

  for (const code of [
    `
      const [a, b, ...c] = [1, 2, 3, 4];
      type Test = typeof c;
    `,
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Mutable,
      "rest property is detected as a mutable array",
    );
  }
});

test("destructuring objects", (t) => {
  for (const code of [
    `
      const { a, b, ...c } = { a: 1, b: 2, d: 4, e: 5 };"
      type Test = typeof a;
    `,
    `
      const { a, b, ...c } = { a: 1, b: 2, d: 4, e: 5 };"
      type Test = typeof b;
    `,
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Immutable,
      "immutable elements in mutable destructed object are detected as immutable",
    );
  }

  for (const code of [
    `
      const { a, b, ...c } = { a: 1, b: 2, d: 4, e: 5 };
      type Test = typeof c;
    `,
  ]) {
    runTestImmutability(
      t,
      code,
      Immutability.Mutable,
      "rest property is detected as a mutable object",
    );
  }
});
