import { isIntrinsicErrorType, isTypeReference } from "ts-api-utils";
import typeMatchesSpecifier, {
  type TypeDeclarationFileSpecifier,
  type TypeDeclarationLibSpecifier,
  type TypeDeclarationPackageSpecifier,
} from "ts-declaration-location";
import {
  TypeNodeFormatFlags,
  getTypeAliasAsString,
  getTypeNodeAliasAsString,
  getTypeReferenceAsString,
  getTypeReferenceNodeAsString,
  typeNodeAsWritten,
  typeNodeToString,
  typeToString,
} from "type-to-string";
import ts from "typescript";

type PatternSpecifier =
  | {
      name: string | string[];
      pattern?: undefined;
    }
  | {
      name?: undefined;
      pattern: RegExp | RegExp[];
    };

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

const typeFormatFlags =
  TypeNodeFormatFlags.AddUndefined |
  TypeNodeFormatFlags.NoTruncation |
  TypeNodeFormatFlags.OmitParameterModifiers |
  TypeNodeFormatFlags.OmitTypeLiterals |
  TypeNodeFormatFlags.UseFullyQualifiedType |
  TypeNodeFormatFlags.WriteArrayAsGenericType |
  TypeNodeFormatFlags.WriteArrowStyleSignature |
  TypeNodeFormatFlags.WriteTypeArgumentsOfSignature;

/**
 * Does the given type/typeNode match the given specifier.
 */
export function typeDataMatchesSpecifier(
  typeData: Readonly<TypeData>,
  specifier: TypeSpecifier,
  program: ts.Program,
): boolean {
  if (isIntrinsicErrorType(typeData.type)) {
    return false;
  }

  if (typeof specifier === "string" || specifier instanceof RegExp) {
    return typeNameMatchesSpecifier(program, specifier, typeData);
  }

  return (
    typeMatchesSpecifier(program, specifier, typeData.type) &&
    typeNameMatchesSpecifier(program, specifier, typeData)
  );
}

const typeNameCache = new WeakMap<
  Readonly<TypeData>,
  Partial<{
    name: string | null;
    alias: string | null;
    nameWithArguments: string | null;
    aliasWithArguments: string | null;
    asWritten: string | null;
    evaluatedTypeNode: string | null;
    evaluatedType: string;
  }>
>();

/**
 * Test if the given type name matches the given specifier.
 */
function typeNameMatchesSpecifier(
  program: ts.Program,
  specifier: TypeSpecifier,
  typeData: Readonly<TypeData>,
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

  let m_typeNames = typeNameCache.get(typeData);
  if (m_typeNames === undefined) {
    m_typeNames = {};
    typeNameCache.set(typeData, m_typeNames);
  }

  if (m_typeNames.name === undefined) {
    m_typeNames.name =
      typeData.typeNode === null
        ? getTypeReferenceAsString(program, typeData.type, false)
        : getTypeReferenceNodeAsString(program, typeData.typeNode, false);
  }
  if (m_typeNames.name !== null) {
    if (names.includes(m_typeNames.name)) {
      return true;
    }

    if (patterns.some((pattern) => pattern.test(m_typeNames.name!))) {
      return true;
    }
  }

  if (m_typeNames.alias === undefined) {
    m_typeNames.alias =
      typeData.typeNode === null
        ? getTypeAliasAsString(typeData.type, false)
        : getTypeNodeAliasAsString(typeData.typeNode, false);
  }
  if (m_typeNames.alias !== null && names.includes(m_typeNames.alias)) {
    return true;
  }

  if (m_typeNames.nameWithArguments === undefined) {
    m_typeNames.nameWithArguments =
      typeData.typeNode === null
        ? getTypeReferenceAsString(program, typeData.type, true)
        : getTypeReferenceNodeAsString(program, typeData.typeNode, true);
  }
  if (
    m_typeNames.nameWithArguments !== null &&
    m_typeNames.name !== m_typeNames.nameWithArguments
  ) {
    if (names.includes(m_typeNames.nameWithArguments)) {
      return true;
    }

    if (
      patterns.some((pattern) => pattern.test(m_typeNames.nameWithArguments!))
    ) {
      return true;
    }
  }

  if (m_typeNames.aliasWithArguments === undefined) {
    m_typeNames.aliasWithArguments =
      typeData.typeNode === null
        ? getTypeAliasAsString(typeData.type, true)
        : getTypeNodeAliasAsString(typeData.typeNode, true);
  }
  if (
    m_typeNames.aliasWithArguments !== null &&
    m_typeNames.alias !== m_typeNames.aliasWithArguments
  ) {
    if (names.includes(m_typeNames.aliasWithArguments)) {
      return true;
    }

    if (
      patterns.some((pattern) => pattern.test(m_typeNames.aliasWithArguments!))
    ) {
      return true;
    }
  }

  if (m_typeNames.asWritten === undefined) {
    m_typeNames.asWritten =
      typeData.typeNode === null ? null : typeNodeAsWritten(typeData.typeNode);
  }
  if (m_typeNames.asWritten !== null) {
    if (names.includes(m_typeNames.asWritten)) {
      return true;
    }

    if (patterns.some((pattern) => pattern.test(m_typeNames.asWritten!))) {
      return true;
    }
  }

  if (m_typeNames.evaluatedTypeNode === undefined) {
    m_typeNames.evaluatedTypeNode =
      typeData.typeNode === null
        ? null
        : typeNodeToString(program, typeData.typeNode, typeFormatFlags);
  }
  if (m_typeNames.evaluatedTypeNode !== null) {
    if (names.includes(m_typeNames.evaluatedTypeNode)) {
      return true;
    }

    if (
      patterns.some((pattern) => pattern.test(m_typeNames.evaluatedTypeNode!))
    ) {
      return true;
    }
  }

  if (m_typeNames.evaluatedType === undefined) {
    m_typeNames.evaluatedType = typeToString(
      program,
      typeData.type,
      undefined,
      typeFormatFlags,
    );
  }

  if (names.includes(m_typeNames.evaluatedType)) {
    return true;
  }

  return patterns.some((pattern) => pattern.test(m_typeNames.evaluatedType!));
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
