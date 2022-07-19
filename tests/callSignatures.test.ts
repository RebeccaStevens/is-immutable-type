import test from "ava";

import { Immutableness } from "../src";

import { runTestImmutableness } from "./helpers";

test("simple", (t) => {
  for (const code of [
    "type Test = { (): void; readonly bar: number };",
    "type Test = Readonly<{ (): void; bar: number }>;",
    "type Test = { (foo: number): string; readonly bar: number };",
    "type Test = Readonly<{ (foo: number): string; bar: number }>;",
    "type Test = { (foo: { baz: number }): string; readonly bar: number };",
    "type Test = Readonly<{ (foo: { baz: number }): string; bar: number }>;",
  ]) {
    runTestImmutableness(
      t,
      code,
      Immutableness.Immutable,
      "handles immutable namespaces"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = { (): void; readonly bar: readonly number[] };",
  ]) {
    runTestImmutableness(
      t,
      code,
      Immutableness.ReadonlyDeep,
      "handles mutable namespaces"
    );
  }

  // prettier-ignore
  for (const code of [
    "type Test = { (): void; readonly bar: readonly ({ foo: number })[] };",
  ]) {
    runTestImmutableness(
      t,
      code,
      Immutableness.ReadonlyShallow,
      "handles mutable namespaces"
    );
  }

  for (const code of [
    "type Test = { (): void; bar: number };",
    "type Test = { (): string; bar: number };",
    "type Test = { (foo: string): void; bar: number };",
    "type Test = { (foo: { baz: number }): string; bar: number };",
  ]) {
    runTestImmutableness(
      t,
      code,
      Immutableness.Mutable,
      "handles mutable namespaces"
    );
  }
});
