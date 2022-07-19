import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseForESLint } from "@typescript-eslint/parser";
import type { TSESTree } from "@typescript-eslint/utils";
import type { ExecutionContext } from "ava";
import type ts from "typescript";

import {
  getTypeImmutableness,
  Immutableness,
  type ImmutablenessCache,
  type ImmutablenessOverrides,
} from "../src";

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
function getType(code: string): {
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
  const node = esTreeNodeToTSNodeMap.get(declaration.id);
  const type = checker.getTypeAtLocation(node);

  return {
    type,
    checker,
  };
}

/**
 * Run tests against "getTypeImmutableness".
 */
export function runTestForGetTypeImmutableness(
  t: ExecutionContext<unknown>,
  test:
    | string
    | Readonly<{
        code: string;
        overrides?: ImmutablenessOverrides;
        cache?: ImmutablenessCache;
      }>,
  expected: Immutableness,
  message?: string
): void {
  const { code, overrides, cache } =
    typeof test === "string"
      ? { code: test, overrides: undefined, cache: undefined }
      : test;

  const { checker, type } = getType(code);

  const actual = getTypeImmutableness(checker, type, overrides, cache);
  t.is(Immutableness[actual], Immutableness[expected], message);
}
