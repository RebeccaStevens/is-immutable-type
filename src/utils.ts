import path from "node:path";

import { isIntrinsicType } from "ts-api-utils";
import type ts from "typescript";

import { typeToString, type TypeName } from "./type-to-string";

type PatternSpecifier =
  | {
      name: string | string[];
      pattern?: undefined;
    }
  | {
      name?: undefined;
      pattern: RegExp | RegExp[];
    };

type FileSpecifier = PatternSpecifier & {
  from: "file";
  path?: string;
};

type LibSpecifier = PatternSpecifier & {
  from: "lib";
};

type PackageSpecifier = PatternSpecifier & {
  from: "package";
  package: string;
};

/**
 * How a type can be specified.
 */
export type TypeSpecifier =
  | string
  | RegExp
  | FileSpecifier
  | LibSpecifier
  | PackageSpecifier;

/**
 * Type guard to check if a Node has a Symbol.
 */
export function hasSymbol(
  node: ts.Node,
): node is ts.Node & { symbol: ts.Symbol } {
  return Object.hasOwn(node, "symbol");
}

/**
 * Type guard to check if a Type is TypeNode.
 */
export function isTypeNode(
  typeLike: ts.Type | ts.TypeNode,
): typeLike is ts.TypeNode {
  return Object.hasOwn(typeLike, "kind");
}

/**
 * Does the given type/typeNode match the given specifier.
 */
export function typeMatchesSpecifier(
  typeOrTypeNode: ts.Type | ts.TypeNode,
  specifier: TypeSpecifier,
  program: ts.Program,
): boolean {
  const type = isTypeNode(typeOrTypeNode)
    ? program.getTypeChecker().getTypeFromTypeNode(typeOrTypeNode)
    : typeOrTypeNode;

  if (isIntrinsicType(type) && type.intrinsicName === "error") {
    return false;
  }

  const typeName = typeToString(program, typeOrTypeNode);
  if (typeof specifier === "string" || specifier instanceof RegExp) {
    return typeNameMatchesSpecifier(typeName, specifier);
  }
  if (!typeNameMatchesSpecifier(typeName, specifier)) {
    return false;
  }
  const declarationFiles =
    type
      .getSymbol()
      ?.getDeclarations()
      ?.map((declaration) => declaration.getSourceFile()) ?? [];
  switch (specifier.from) {
    case "file": {
      return isTypeDeclaredLocal(specifier.path, declarationFiles, program);
    }
    case "lib": {
      // Built in type (i.e string, number, boolean, etc)
      if (declarationFiles.length === 0) {
        return true;
      }
      return declarationFiles.some((declaration) =>
        program.isSourceFileDefaultLibrary(declaration),
      );
    }
    case "package": {
      return declarationFiles.some(
        (declaration) =>
          declaration.fileName.includes(`node_modules/${specifier.package}/`) ||
          declaration.fileName.includes(
            `node_modules/@types/${specifier.package}/`,
          ),
      );
    }
  }
}

/**
 * Test if the given type name matches the given specifier.
 */
function typeNameMatchesSpecifier(
  typeName: TypeName,
  specifier: TypeSpecifier,
): boolean {
  const names =
    typeof specifier === "string"
      ? [specifier]
      : specifier instanceof RegExp || specifier.name === undefined
      ? []
      : Array.isArray(specifier.name)
      ? specifier.name
      : [specifier.name];
  const patterns =
    typeof specifier === "string"
      ? []
      : specifier instanceof RegExp
      ? [specifier]
      : specifier.pattern === undefined
      ? []
      : Array.isArray(specifier.pattern)
      ? specifier.pattern
      : [specifier.pattern];

  const name = typeName.getName();
  if (name !== null) {
    if (names.includes(name)) {
      return true;
    }
    const nameWithArguments = typeName.getNameWithArguments();
    if (patterns.some((pattern) => pattern.test(nameWithArguments ?? name))) {
      return true;
    }
  }

  const alias = typeName.getAlias();
  if (alias !== null) {
    if (names.includes(alias)) {
      return true;
    }
    if (patterns.some((pattern) => pattern.test(alias))) {
      return true;
    }
  }

  const aliasWithArguments = typeName.getAliasWithArguments();
  if (
    aliasWithArguments !== null &&
    patterns.some((pattern) => pattern.test(aliasWithArguments))
  ) {
    return true;
  }

  const evaluated = typeName.getEvaluated();
  if (patterns.some((pattern) => pattern.test(evaluated))) {
    return true;
  }

  const written = typeName.getWritten();
  return written !== null && patterns.some((pattern) => pattern.test(written));
}

/**
 * Test if the type is declared locally.
 */
function isTypeDeclaredLocal(
  relativePath: string | undefined,
  declarationFiles: ts.SourceFile[],
  program: ts.Program,
): boolean {
  if (relativePath === undefined) {
    const cwd = program.getCurrentDirectory().toLowerCase();
    return declarationFiles.some((declaration) =>
      declaration.fileName.toLowerCase().startsWith(cwd),
    );
  }
  const absolutePath = path
    .join(program.getCurrentDirectory(), relativePath)
    .toLowerCase();
  return declarationFiles.some(
    (declaration) => declaration.fileName.toLowerCase() === absolutePath,
  );
}
