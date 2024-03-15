import { describe, it } from "vitest";

import { Immutability } from "#is-immutable-type";

import { runTestImmutability } from "./helpers";

describe("Call Signatures", () => {
  it.each([
    "type Test = { (): void; readonly bar: number };",
    "type Test = Readonly<{ (): void; bar: number }>;",
    "type Test = { (foo: number): string; readonly bar: number };",
    "type Test = Readonly<{ (foo: number): string; bar: number }>;",
    "type Test = { (foo: { baz: number }): string; readonly bar: number };",
    "type Test = Readonly<{ (foo: { baz: number }): string; bar: number }>;",
  ])("works for Immutable namespaces", (code) => {
    runTestImmutability(code, Immutability.Immutable);
  });

  it.each(["type Test = { (): void; readonly bar: readonly number[] };"])(
    "works for ReadonlyDeep namespaces",
    (code) => {
      runTestImmutability(code, Immutability.ReadonlyDeep);
    },
  );

  it.each([
    "type Test = { (): void; readonly bar: readonly ({ foo: number })[] };",
  ])("works for ReadonlyShallow namespaces", (code) => {
    runTestImmutability(code, Immutability.ReadonlyShallow);
  });

  it.each([
    "type Test = { (): void; bar: number };",
    "type Test = { (): string; bar: number };",
    "type Test = { (foo: string): void; bar: number };",
    "type Test = { (foo: { baz: number }): string; bar: number };",
  ])("works for Mutable namespaces", (code) => {
    runTestImmutability(code, Immutability.Mutable);
  });
});
