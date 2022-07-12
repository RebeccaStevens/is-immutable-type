import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseForESLint } from "@typescript-eslint/parser";
import type { TSESTree } from "@typescript-eslint/utils";
import type { ExecutionContext } from "ava";
import type ts from "typescript";

import { getTypeImmutableness, Immutableness } from "../src";

/**
 * The root dir to "fixtures".
 */
const rootDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures"
);

/**
 * Get the first type defined in the given code.
 */
export function getType(code: string): {
  type: ts.Type;
  checker: ts.TypeChecker;
} {
  const { ast, services } = parseForESLint(code, {
    project: "./tsconfig.json",
    filePath: path.join(rootDir, "file.ts"),
    tsconfigRootDir: rootDir,
  });
  const checker = services.program.getTypeChecker();
  const { esTreeNodeToTSNodeMap } = services;

  const declaration = ast.body[0] as TSESTree.TSTypeAliasDeclaration;
  return {
    type: checker.getTypeAtLocation(esTreeNodeToTSNodeMap.get(declaration.id)),
    checker,
  };
}

/**
 * Convert a immutableness value as a string.
 */
function immutablenessToString(immutableness: Immutableness) {
  switch (immutableness) {
    case Immutableness.Immutable:
      return "Immutable";
    case Immutableness.ReadonlyDeep:
      return "Readonly Deep";
    case Immutableness.ReadonlyShallow:
      return "Readonly Shallow";
    case Immutableness.Mutable:
      return "Mutable";
    default:
      return "Unknown";
  }
}

/**
 * Run tests against "getTypeImmutableness".
 */
export function runTestForGetTypeImmutableness(
  t: ExecutionContext<unknown>,
  code: string,
  expected: Immutableness,
  message?: string
): void {
  const { checker, type } = getType(code);

  const actual = getTypeImmutableness(checker, type);
  t.is(immutablenessToString(actual), immutablenessToString(expected), message);
}
