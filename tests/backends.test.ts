import { readFileSync } from "node:fs";
import { URL, fileURLToPath } from "node:url";

import { clearCaches, parseForESLint } from "@typescript-eslint/parser-native";
import ts from "typescript";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { Immutability, type ImmutabilityCache, getDefaultOverrides, getTypeImmutability } from "#is-immutable-type";

const filePath = fileURLToPath(new URL("fixtures/checker.ts", import.meta.url));
const code = readFileSync(filePath, "utf8");

afterAll(() => {
  clearCaches();
});

/**
 * Create a fresh checker for each cache-order regression.
 */
function createProgram(backend: string) {
  clearCaches();
  const program =
    backend === "classic"
      ? ts.createProgram([filePath], {
          strict: true,
          target: ts.ScriptTarget.ES2021,
          lib: ["lib.es2021.d.ts"],
          types: [],
        })
      : parseForESLint(code, {
          filePath,
          tsconfigRootDir: fileURLToPath(new URL("fixtures", import.meta.url)),
          projectService: { EXPERIMENTAL_backend: "tsgo" },
        }).services.program!;
  const source = program.getSourceFile(filePath)!;
  const declarations = new Map(
    source.statements.filter(ts.isTypeAliasDeclaration).map((node) => [node.name.text, node]),
  );
  return { program, declarations, checker: program.getTypeChecker() };
}

describe.each(["classic", "native"])("%s checker", (backend) => {
  let environment: ReturnType<typeof createProgram>;
  beforeAll(() => {
    environment = createProgram(backend);
  });

  it.each([true, false, "custom"] as const)("classifies types with cache %s", (cacheMode) => {
    const { program, declarations, checker } = environment;
    const cache: boolean | ImmutabilityCache = cacheMode === "custom" ? new WeakMap() : cacheMode;
    for (const [name, expected] of [
      ["Immutable", Immutability.Immutable],
      ["Mutable", Immutability.Mutable],
      ["Deep", Immutability.ReadonlyDeep],
      ["Shallow", Immutability.ReadonlyShallow],
      ["Recursive", Immutability.Immutable],
      ["First", Immutability.Immutable],
      ["Expanded", Immutability.Immutable],
      ["ExpandedAnonymous", Immutability.Immutable],
      ["Conditional", Immutability.Mutable],
      ["ImmutableConditional", Immutability.Immutable],
      ["RecursiveConditional", Immutability.ReadonlyDeep],
      ["DefaultOverride", Immutability.Mutable],
      ["Tuple", Immutability.ReadonlyDeep],
      ["MutableTuple", Immutability.Mutable],
      ["MutableRecursive", Immutability.Mutable],
      ["ShallowFirst", Immutability.ReadonlyShallow],
      ["ExpandedMutable", Immutability.ReadonlyShallow],
      ["Siblings", Immutability.ReadonlyShallow],
      ["NestedBox", Immutability.ReadonlyShallow],
      ["ShallowContainer", Immutability.ReadonlyShallow],
      ["ShallowLink", Immutability.ReadonlyShallow],
      ["Methods", Immutability.ReadonlyDeep],
      ["FunctionProperty", Immutability.ReadonlyDeep],
      ["ReadonlyIndex", Immutability.Immutable],
      ["MutableIndex", Immutability.Mutable],
      ["ConditionalDeep", Immutability.ReadonlyDeep],
      ["ResolvedConditional", Immutability.ReadonlyDeep],
      ["ReadonlyMapOverride", Immutability.ReadonlyDeep],
    ] as const) {
      const node = declarations.get(name)!;
      for (const input of [checker.getTypeFromTypeNode(node.type), node.type]) {
        expect(getTypeImmutability(program, input, getDefaultOverrides(), cache), name).toBe(expected);
      }
    }
    expect(
      getTypeImmutability(
        program,
        declarations.get("CustomOverride")!.type,
        [
          {
            type: "CustomOverride",
            to: Immutability.Immutable,
            from: Immutability.Mutable,
          },
        ],
        cache,
      ),
    ).toBe(Immutability.Immutable);
  });

  describe.each([
    ["ImmutableRecord", "DeepRecord"],
    ["DeepRecord", "ImmutableRecord"],
    ["ShallowContainer", "ShallowLink"],
    ["ShallowLink", "ShallowContainer"],
  ])("querying %s before %s", (first, second) => {
    let orderedEnvironment: ReturnType<typeof createProgram>;
    beforeEach(() => {
      orderedEnvironment = createProgram(backend);
    });

    it.each([true, false, "custom"] as const)("keeps completed results independent with cache %s", (cacheMode) => {
      const { program, declarations, checker } = orderedEnvironment;
      const cache: boolean | ImmutabilityCache = cacheMode === "custom" ? new WeakMap() : cacheMode;
      for (const name of [first, second]) {
        const node = declarations.get(name)!.type;
        for (const input of [checker.getTypeFromTypeNode(node), node]) {
          const expected =
            name === "ImmutableRecord"
              ? Immutability.Immutable
              : name === "DeepRecord"
                ? Immutability.ReadonlyDeep
                : Immutability.ReadonlyShallow;
          expect(getTypeImmutability(program, input, getDefaultOverrides(), cache)).toBe(expected);
        }
      }
    });
  });
});
