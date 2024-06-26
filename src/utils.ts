import { isIntrinsicErrorType, isTypeReference } from "ts-api-utils";
import typeMatchesSpecifier, {
  type TypeDeclarationFileSpecifier,
  type TypeDeclarationLibSpecifier,
  type TypeDeclarationPackageSpecifier,
} from "ts-declaration-location";
import ts from "typescript";

type PatternSpecifier = {
  name?: string | string[];
  ignoreName?: string | string[];
  pattern?: RegExp | RegExp[];
  ignorePattern?: RegExp | RegExp[];
} & (
  | {
      name: string | string[];
    }
  | {
      pattern: RegExp | RegExp[];
    }
);

type FileSpecifier = PatternSpecifier & TypeDeclarationFileSpecifier;
type LibSpecifier = PatternSpecifier & TypeDeclarationLibSpecifier;
type PackageSpecifier = PatternSpecifier & TypeDeclarationPackageSpecifier;

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
 * Check if a type matches a specifier.
 */
export type TypeMatchesPatternSpecifier = (
  program: ts.Program,
  type: ts.Type,
  typeNode: ts.TypeNode | null,
  include: ReadonlyArray<string | RegExp>,
  exclude: ReadonlyArray<string | RegExp>,
) => boolean;

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
export function typeDataMatchesSpecifier(
  program: ts.Program,
  specifier: TypeSpecifier,
  typeData: Readonly<TypeData>,
  typeMatchesPatternSpecifier: TypeMatchesPatternSpecifier,
): boolean {
  if (isIntrinsicErrorType(typeData.type)) {
    return false;
  }

  if (typeof specifier === "string" || specifier instanceof RegExp) {
    return typeNameMatchesSpecifier(
      program,
      specifier,
      typeData,
      typeMatchesPatternSpecifier,
    );
  }

  return (
    typeMatchesSpecifier(program, specifier, typeData.type) &&
    typeNameMatchesSpecifier(
      program,
      specifier,
      typeData,
      typeMatchesPatternSpecifier,
    )
  );
}

/**
 * Test if the given type name matches the given specifier.
 */
function typeNameMatchesSpecifier(
  program: ts.Program,
  specifier: TypeSpecifier,
  typeData: Readonly<TypeData>,
  typeMatchesPatternSpecifier: TypeMatchesPatternSpecifier,
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
    specifier instanceof RegExp
      ? [specifier]
      : typeof specifier === "string" || specifier.pattern === undefined
        ? []
        : Array.isArray(specifier.pattern)
          ? specifier.pattern
          : [specifier.pattern];

  const ignoreNames =
    typeof specifier === "string" ||
    specifier instanceof RegExp ||
    specifier.ignoreName === undefined
      ? []
      : Array.isArray(specifier.ignoreName)
        ? specifier.ignoreName
        : [specifier.ignoreName];

  const ignorePatterns =
    typeof specifier === "string" ||
    specifier instanceof RegExp ||
    specifier.ignorePattern === undefined
      ? []
      : Array.isArray(specifier.ignorePattern)
        ? specifier.ignorePattern
        : [specifier.ignorePattern];

  const include = [...names, ...patterns];
  const exclude = [...ignoreNames, ...ignorePatterns];

  return typeMatchesPatternSpecifier(
    program,
    typeData.type,
    typeData.typeNode,
    include,
    exclude,
  );
}

/**
 * The default `TypeMatchesPatternSpecifier`.
 */
export function defaultTypeMatchesPatternSpecifier(
  program: ts.Program,
  type: ts.Type,
  typeNode: ts.TypeNode | null,
  include: ReadonlyArray<string | RegExp>,
  exclude: ReadonlyArray<string | RegExp> = [],
) {
  if (include.length === 0) {
    return false;
  }

  let m_shouldInclude = false;

  const typeNameAlias = getTypeAliasName(type, typeNode);
  if (typeNameAlias !== null) {
    const testTypeNameAlias = (pattern: string | RegExp) =>
      typeof pattern === "string"
        ? pattern === typeNameAlias
        : pattern.test(typeNameAlias);

    if (exclude.some(testTypeNameAlias)) {
      return false;
    }
    m_shouldInclude ||= include.some(testTypeNameAlias);
  }

  const typeValue = getTypeAsString(program, type, typeNode);
  const testTypeValue = (pattern: string | RegExp) =>
    typeof pattern === "string"
      ? pattern === typeValue
      : pattern.test(typeValue);

  if (exclude.some(testTypeValue)) {
    return false;
  }
  m_shouldInclude ||= include.some(testTypeValue);

  const typeNameName = extractTypeName(typeValue);
  if (typeNameName !== null) {
    const testTypeNameName = (pattern: string | RegExp) =>
      typeof pattern === "string"
        ? pattern === typeNameName
        : pattern.test(typeNameName);

    if (exclude.some(testTypeNameName)) {
      return false;
    }
    m_shouldInclude ||= include.some(testTypeNameName);
  }

  // Special handling for arrays not written in generic syntax.
  if (program.getTypeChecker().isArrayType(type) && typeNode !== null) {
    if (
      (ts.isTypeOperatorNode(typeNode) &&
        typeNode.operator === ts.SyntaxKind.ReadonlyKeyword) ||
      (ts.isTypeOperatorNode(typeNode.parent) &&
        typeNode.parent.operator === ts.SyntaxKind.ReadonlyKeyword)
    ) {
      const testIsReadonlyArray = (pattern: string | RegExp) =>
        typeof pattern === "string" && pattern === "ReadonlyArray";

      if (exclude.some(testIsReadonlyArray)) {
        return false;
      }
      m_shouldInclude ||= include.some(testIsReadonlyArray);
    } else {
      const testIsArray = (pattern: string | RegExp) =>
        typeof pattern === "string" && pattern === "Array";

      if (exclude.some(testIsArray)) {
        return false;
      }
      m_shouldInclude ||= include.some(testIsArray);
    }
  }

  return m_shouldInclude;
}

/**
 * Get the type alias name from the given type data.
 *
 * Null will be returned if the type is not a type alias.
 */
function getTypeAliasName(type: ts.Type, typeNode: ts.TypeNode | null) {
  if (typeNode === null) {
    const t = "target" in type ? (type.target as ts.Type) : type;
    return t.aliasSymbol?.getName() ?? null;
  }

  return ts.isTypeAliasDeclaration(typeNode.parent)
    ? typeNode.parent.name.getText()
    : null;
}

/**
 * Get the type as a string.
 */
function getTypeAsString(
  program: ts.Program,
  type: ts.Type,
  typeNode: ts.TypeNode | null,
) {
  return typeNode === null
    ? program
        .getTypeChecker()
        .typeToString(
          type,
          undefined,
          ts.TypeFormatFlags.AddUndefined |
            ts.TypeFormatFlags.NoTruncation |
            ts.TypeFormatFlags.OmitParameterModifiers |
            ts.TypeFormatFlags.UseFullyQualifiedType |
            ts.TypeFormatFlags.WriteArrayAsGenericType |
            ts.TypeFormatFlags.WriteArrowStyleSignature |
            ts.TypeFormatFlags.WriteTypeArgumentsOfSignature,
        )
    : typeNode.getText();
}

/**
 * Get the type name extracted from the the type's string.
 *
 * This only work if the type is a type reference.
 */
function extractTypeName(typeValue: string) {
  const match = /^([^<]+)<.+>$/u.exec(typeValue);
  return match?.[1] ?? null;
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
  return identifier.getText();
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
