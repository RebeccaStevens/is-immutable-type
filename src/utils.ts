import path from "node:path";

import { isIntrinsicErrorType, isTypeReference } from "ts-api-utils";
import ts from "typescript";

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

  /**
   * The path to look in for the type, relative to project directory.
   */
  path?: string;
};

type LibSpecifier = PatternSpecifier & {
  from: "lib";
};

type PackageSpecifier = PatternSpecifier & {
  from: "package";

  /**
   * The package to look in.
   */
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
 * Check if a type node is anonymous;
 */
export function isAnonymousTypeNode(typeNode: ts.TypeNode): boolean {
  return typeNode.pos < 0;
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
 *
 * @throws if the type is an error type.
 */
export function getTypeData(
  type: ts.Type,
  typeNode: ts.TypeNode | null | undefined,
): TypeData {
  if (isIntrinsicErrorType(type)) {
    throw new Error("ErrorType encountered.");
  }

  return {
    type,
    typeNode:
      typeNode === undefined ||
      typeNode === null ||
      isAnonymousTypeNode(typeNode)
        ? null
        : typeNode,
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
  if (isIntrinsicErrorType(typeData.type)) {
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
      return isTypeDeclaredFromLocal(specifier.path, declarationFiles, program);
    }
    case "lib": {
      return isTypeDeclaredFromLib(declarationFiles, program);
    }
    case "package": {
      return isTypeDeclaredInPackage(
        specifier.package,
        declarationFiles,
        program,
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
  return (
    names.includes(evaluated) ||
    patterns.some((pattern) => pattern.test(evaluated))
  );
}

/**
 * Test if the type is declared in a TypeScript lib.
 */
function isTypeDeclaredFromLib(
  declarationFiles: ReadonlyArray<ts.SourceFile>,
  program: ts.Program,
): boolean {
  // Intrinsic type (i.e. string, number, boolean, etc).
  if (declarationFiles.length === 0) {
    return true;
  }
  return declarationFiles.some((declaration) =>
    program.isSourceFileDefaultLibrary(declaration),
  );
}

/**
 * Test if the type is declared in a TypeScript package.
 */
function isTypeDeclaredInPackage(
  packageName: string,
  declarationFiles: ReadonlyArray<ts.SourceFile>,
  program: ts.Program,
): boolean {
  // Handle scoped packages - if the name starts with @, remove it and replace / with __
  const typesPackageName = packageName.replace(/^@([^/]+)\//u, "$1__");

  const matcher = new RegExp(`${packageName}|${typesPackageName}`, "u");
  return declarationFiles.some((declaration) => {
    const packageIdName = program.sourceFileToPackageName.get(declaration.path);
    return (
      packageIdName !== undefined &&
      matcher.test(packageIdName) &&
      program.isSourceFileFromExternalLibrary(declaration)
    );
  });
}

/**
 * Test if the type is declared in a local file.
 */
function isTypeDeclaredFromLocal(
  relativePath: string | undefined,
  declarationFiles: ReadonlyArray<ts.SourceFile>,
  program: ts.Program,
): boolean {
  if (relativePath === undefined) {
    const cwd = program.getCurrentDirectory().toLowerCase();
    const typeRoots = ts.getEffectiveTypeRoots(
      program.getCompilerOptions(),
      program,
    );

    return declarationFiles.some((declaration) => {
      if (program.isSourceFileFromExternalLibrary(declaration)) {
        return false;
      }
      const fileName = declaration.fileName.toLowerCase();
      if (!fileName.startsWith(cwd)) {
        return false;
      }
      return (
        typeRoots?.some((typeRoot) => fileName.startsWith(typeRoot)) !== true
      );
    });
  }
  const absolutePath = path
    .join(program.getCurrentDirectory(), relativePath)
    .toLowerCase();
  return declarationFiles.some(
    (declaration) => declaration.fileName.toLowerCase() === absolutePath,
  );
}

/**
 * Get string representations of the given property name.
 */
export function propertyNameToString(propertyName: ts.PropertyName): string {
  return ts.isIdentifier(propertyName) || ts.isPrivateIdentifier(propertyName)
    ? identifierToString(propertyName)
    : propertyName.getText();
}

/**
 * Get string representations of the given entity name.
 */
export function entityNameToString(entityName: ts.EntityName): string {
  return ts.isIdentifier(entityName)
    ? identifierToString(entityName)
    : qualifiedNameToString(entityName);
}

/**
 * Get string representations of the given identifier.
 */
export function identifierToString(
  identifier: ts.Identifier | ts.PrivateIdentifier,
): string {
  return identifier.escapedText as string;
}

/**
 * Get string representations of the given qualified name.
 */
function qualifiedNameToString(qualifiedName: ts.QualifiedName): string {
  return `${entityNameToString(qualifiedName.left)}.${identifierToString(
    qualifiedName.right,
  )}`;
}

/**
 * Is type a (non-namespace) function?
 */
export function isFunction(type: ts.Type) {
  return (
    type.getCallSignatures().length > 0 && type.getProperties().length === 0
  );
}

/**
 * Is type a type reference with type arguments?
 */
export function isTypeReferenceWithTypeArguments(
  type: ts.Type,
): type is ts.TypeReference & {
  typeArguments: NonNullable<ts.TypeReference["typeArguments"]>;
} {
  return (
    isTypeReference(type) &&
    type.typeArguments !== undefined &&
    type.typeArguments.length > 0
  );
}
