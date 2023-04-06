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
 * The type data to work with.
 */
export type TypeData = {
  type: ts.Type;
  typeNode: ts.TypeNode | null;
};

/**
 * Get the type data from the given type or type node.
 */
export function getTypeData(
  program: ts.Program,
  typeLike: ts.Type | ts.TypeNode,
): TypeData {
  if (isTypeNode(typeLike)) {
    const checker = program.getTypeChecker();
    const type = isTypeNode(typeLike)
      ? checker.getTypeFromTypeNode(typeLike)
      : typeLike;

    return {
      type,
      typeNode: typeLike,
    };
  }

  return {
    type: typeLike,
    typeNode: null,
  };
}

/**
 * Treat a type as a type data.
 */
export function asTypeData(type: ts.Type): TypeData {
  return {
    type,
    typeNode: null,
  };
}

/**
 * Cache a value by its type
 */
export function cacheData<V>(
  program: ts.Program,
  cache: WeakMap<object, V>,
  typeData: Readonly<TypeData>,
  value: V,
) {
  const checker = program.getTypeChecker();
  const identity = checker.getRecursionIdentity(typeData.type);
  // eslint-disable-next-line functional/no-conditional-statements
  if (typeData.typeNode !== null) {
    cache.set(typeData.typeNode, value);
  }
  cache.set(identity, value);
}

/**
 * Get a value by its cashed type.
 */
export function getCachedData<V>(
  program: ts.Program,
  cache: WeakMap<object, V>,
  typeData: Readonly<TypeData>,
): V | undefined {
  const checker = program.getTypeChecker();
  const identity =
    typeData.typeNode ?? checker.getRecursionIdentity(typeData.type);
  return cache.get(identity);
}

/**
 * Does the given type/typeNode match the given specifier.
 */
export function typeMatchesSpecifier(
  typeData: Readonly<TypeData>,
  specifier: TypeSpecifier,
  program: ts.Program,
): boolean {
  if (
    isIntrinsicType(typeData.type) &&
    typeData.type.intrinsicName === "error"
  ) {
    return false;
  }

  const typeName = typeToString(program, typeData);
  if (typeof specifier === "string" || specifier instanceof RegExp) {
    return typeNameMatchesSpecifier(typeName, specifier);
  }
  if (!typeNameMatchesSpecifier(typeName, specifier)) {
    return false;
  }
  const declarationFiles =
    typeData.type
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
  return patterns.some((pattern) => pattern.test(evaluated));
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
