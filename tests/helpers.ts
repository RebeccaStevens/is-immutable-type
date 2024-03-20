import * as tsvfs from "@typescript/vfs";
import { hasType } from "ts-api-utils";
import ts from "typescript";
import { expect } from "vitest";

import {
  getTypeImmutability,
  Immutability,
  isImmutableType,
  isMutableType,
  isReadonlyDeepType,
  isReadonlyShallowType,
  type ImmutabilityCache,
  type ImmutabilityOverrides,
} from "#is-immutable-type";

import { typeToString } from "../src/type-to-string";
import { getTypeData } from "../src/utils";

/**
 * Create a TS environment to run the tests in.
 *
 * @throws When something goes wrong.
 */
function createTSTestEnvironment(code: string) {
  const compilerOptions: ts.CompilerOptions = {
    lib: ["ES2021"],
    target: ts.ScriptTarget.ES2021,
  };

  const fsMap = tsvfs.createDefaultMapFromNodeModules(compilerOptions, ts);
  fsMap.set("index.ts", code);

  const system = tsvfs.createSystem(fsMap);
  const env = tsvfs.createVirtualTypeScriptEnvironment(
    system,
    ["index.ts"],
    ts,
    compilerOptions,
  );

  const program = env.languageService.getProgram();
  if (program === undefined) {
    throw new Error("Failed to get program.");
  }

  const ast = env.getSourceFile("index.ts");
  if (ast === undefined) {
    throw new Error("Failed to get ast.");
  }

  return { program, ast };
}

/**
 * Get the first type defined in the given code.
 *
 * @throws When failed to find the statement.
 */
function getType(code: string, line?: number) {
  const { ast, program } = createTSTestEnvironment(code);

  if (line !== undefined && line > ast.statements.length) {
    throw new Error(`No statement found.`);
  }

  const statement = ast.statements[(line ?? ast.statements.length) - 1]!;
  const checker = program.getTypeChecker();

  const node = ts.isVariableStatement(statement)
    ? statement.declarationList.declarations[0]!
    : statement;
  const type = checker.getTypeAtLocation(node);

  return {
    type,
    typeNode: hasType(statement) ? statement.type : undefined,
    program,
  };
}

/**
 * Run tests against "getTypeImmutability".
 */
export function runTestImmutability(
  test:
    | string
    | Readonly<{
        code: string;
        line?: number;
        overrides?: ImmutabilityOverrides;
        cache?: ImmutabilityCache;
      }>,
  expected: Immutability,
  message?: string,
): void {
  const { code, line, overrides, cache } =
    typeof test === "string"
      ? { code: test, line: undefined, overrides: undefined, cache: undefined }
      : test;

  const { program, type, typeNode } = getType(code, line);
  const typeLike = typeNode ?? type;

  const actual = getTypeImmutability(program, typeLike, overrides, cache);
  expect(Immutability[actual]).to.be.equal(Immutability[expected], message);

  const immutable = isImmutableType(program, typeLike, overrides, cache);
  expect(expected).to.be[immutable ? "greaterThanOrEqual" : "lessThan"](
    Immutability.Immutable,
  );

  const readonlyDeep = isReadonlyDeepType(program, typeLike, overrides, cache);
  expect(expected).to.be[readonlyDeep ? "greaterThanOrEqual" : "lessThan"](
    Immutability.ReadonlyDeep,
  );

  const readonlyShallow = isReadonlyShallowType(
    program,
    typeLike,
    overrides,
    cache,
  );
  expect(expected).to.be[readonlyShallow ? "greaterThanOrEqual" : "lessThan"](
    Immutability.ReadonlyShallow,
  );

  const mutable = isMutableType(program, typeLike, overrides, cache);
  if (mutable) {
    expect(expected).to.be.equal(Immutability.Mutable);
  } else {
    expect(expected).to.be.not.equal(Immutability.Mutable);
  }
}

/**
 * Run tests against "typeToString".
 */
export function runTestName(
  test:
    | string
    | Readonly<{
        code: string;
        line?: number;
      }>,
  expected: string,
  message?: string,
): void {
  const { code, line } =
    typeof test === "string" ? { code: test, line: undefined } : test;

  const { program, type, typeNode } = getType(code, line);
  const typeData = getTypeData(type, typeNode);

  const actual = typeToString(program, typeData);
  expect([
    actual.getName(),
    actual.getNameWithArguments(),
    actual.getAlias(),
    actual.getAliasWithArguments(),
    actual.getEvaluated(),
  ]).to.include(expected, message);
}
