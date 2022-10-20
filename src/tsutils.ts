/**
 * Need functions from tsutils.
 * Copied here so they can be patched.
 * Should in future be removed and replaced with a new lib.
 * @see https://github.com/typescript-eslint/typescript-eslint/pull/4436
 */

import ts from "typescript";

export const isNodeFlagSet: (node: ts.Node, flag: ts.NodeFlags) => boolean =
  isFlagSet;

export const isTypeFlagSet: (type: ts.Type, flag: ts.TypeFlags) => boolean =
  isFlagSet;

export const isSymbolFlagSet: (
  symbol: ts.Symbol,
  flag: ts.SymbolFlags
) => boolean = isFlagSet;

export function isFunctionTypeNode(node: ts.Node): node is ts.FunctionTypeNode {
  return node.kind === ts.SyntaxKind.FunctionType;
}

export function isTypeReferenceNode(
  node: ts.Node
): node is ts.TypeReferenceNode {
  return node.kind === ts.SyntaxKind.TypeReference;
}

export function isTypeAliasDeclaration(
  node: ts.Node
): node is ts.TypeAliasDeclaration {
  return node.kind === ts.SyntaxKind.TypeAliasDeclaration;
}

export function isConditionalType(type: ts.Type): type is ts.ConditionalType {
  return (type.flags & ts.TypeFlags.Conditional) !== 0;
}

export function isIntersectionType(type: ts.Type): type is ts.IntersectionType {
  return (type.flags & ts.TypeFlags.Intersection) !== 0;
}

export function isObjectType(type: ts.Type): type is ts.ObjectType {
  return (type.flags & ts.TypeFlags.Object) !== 0;
}

export function isTypeReference(type: ts.Type): type is ts.TypeReference {
  return (
    (type.flags & ts.TypeFlags.Object) !== 0 &&
    ((<ts.ObjectType>type).objectFlags & ts.ObjectFlags.Reference) !== 0
  );
}

export function isUnionType(type: ts.Type): type is ts.UnionType {
  return (type.flags & ts.TypeFlags.Union) !== 0;
}

export function isTupleType(type: ts.Type): type is ts.TupleType {
  return (
    (type.flags & ts.TypeFlags.Object &&
      (<ts.ObjectType>type).objectFlags & ts.ObjectFlags.Tuple) !== 0
  );
}

export function isTupleTypeReference(
  type: ts.Type
): type is ts.TypeReference & { target: ts.TupleType } {
  return isTypeReference(type) && isTupleType(type.target);
}

export function isPropertyReadonlyInType(
  type: ts.Type,
  name: ts.__String,
  checker: ts.TypeChecker
): boolean {
  let seenProperty = false;
  let seenReadonlySignature = false;
  for (const t of unionTypeParts(type)) {
    if (getPropertyOfType(t, name) === undefined) {
      // property is not present in this part of the union -> check for readonly index signature
      const index =
        (isNumericPropertyName(name)
          ? checker.getIndexInfoOfType(t, ts.IndexKind.Number)
          : undefined) || checker.getIndexInfoOfType(t, ts.IndexKind.String);
      if (index !== undefined && index.isReadonly) {
        if (seenProperty) return true;
        seenReadonlySignature = true;
      }
    } else if (
      seenReadonlySignature ||
      isReadonlyPropertyIntersection(t, name, checker)
    ) {
      return true;
    } else {
      seenProperty = true;
    }
  }
  return false;
}

export function getPropertyOfType(type: ts.Type, name: ts.__String) {
  if (!(<string>name).startsWith("__")) return type.getProperty(<string>name);
  return type.getProperties().find((s) => s.escapedName === name);
}

export function isNumericPropertyName(name: string | ts.__String): boolean {
  return String(+name) === name;
}

function isReadonlyPropertyIntersection(
  type: ts.Type,
  name: ts.__String,
  checker: ts.TypeChecker
) {
  return someTypePart(type, isIntersectionType, (t) => {
    const prop = getPropertyOfType(t, name);
    if (prop === undefined) return false;
    if (prop.flags & ts.SymbolFlags.Transient) {
      if (/^(?:[1-9]\d*|0)$/.test(<string>name) && isTupleTypeReference(t))
        return t.target.readonly;
      switch (isReadonlyPropertyFromMappedType(t, name, checker)) {
        case true:
          return true;
        case false:
          return false;
        default:
        // `undefined` falls through
      }
    }
    const result =
      // members of namespace import
      isSymbolFlagSet(prop, ts.SymbolFlags.ValueModule) ||
      // we unwrapped every mapped type, now we can check the actual declarations
      symbolHasReadonlyDeclaration(prop, checker);
    return result;
  });
}

export function someTypePart(
  type: ts.Type,
  predicate: (t: ts.Type) => t is ts.UnionOrIntersectionType,
  cb: (t: ts.Type) => boolean
) {
  return predicate(type) ? type.types.some(cb) : cb(type);
}

function hasModifiersType(
  type: ts.Type
): type is ts.Type & { modifiersType: ts.Type } {
  return "modifiersType" in type;
}

function isReadonlyPropertyFromMappedType(
  type: ts.Type,
  name: ts.__String,
  checker: ts.TypeChecker
): boolean | undefined {
  if (!isObjectType(type) || !isObjectFlagSet(type, ts.ObjectFlags.Mapped))
    return;
  const declaration = <ts.MappedTypeNode>type.symbol!.declarations![0];
  // well-known symbols are not affected by mapped types
  if (
    declaration.readonlyToken !== undefined &&
    !/^__@[^@]+$/.test(<string>name)
  )
    return declaration.readonlyToken.kind !== ts.SyntaxKind.MinusToken;
  if (!hasModifiersType(type)) return;
  return isPropertyReadonlyInType(
    (<{ modifiersType: ts.Type }>(<unknown>type)).modifiersType,
    name,
    checker
  );
}

export function symbolHasReadonlyDeclaration(
  symbol: ts.Symbol,
  checker: ts.TypeChecker
) {
  return (
    (symbol.flags & ts.SymbolFlags.Accessor) === ts.SymbolFlags.GetAccessor ||
    (symbol.declarations !== undefined &&
      symbol.declarations.some(
        (node) =>
          isModifierFlagSet(node, ts.ModifierFlags.Readonly) ||
          (isVariableDeclaration(node) &&
            isNodeFlagSet(node.parent!, ts.NodeFlags.Const)) ||
          (isCallExpression(node) &&
            isReadonlyAssignmentDeclaration(node, checker)) ||
          isEnumMember(node) ||
          ((isPropertyAssignment(node) ||
            isShorthandPropertyAssignment(node)) &&
            isInConstContext(node.parent!))
      ))
  );
}

export function unionTypeParts(type: ts.Type): ts.Type[] {
  return isUnionType(type) ? type.types : [type];
}

export function isPropertySignature(
  node: ts.Node
): node is ts.PropertySignature {
  return node.kind === ts.SyntaxKind.PropertySignature;
}

function isFlagSet(obj: { flags: number }, flag: number) {
  return (obj.flags & flag) !== 0;
}

export function isObjectFlagSet(
  objectType: ts.ObjectType,
  flag: ts.ObjectFlags
) {
  return (objectType.objectFlags & flag) !== 0;
}

export function isModifierFlagSet(node: ts.Node, flag: ts.ModifierFlags) {
  return (ts.getCombinedModifierFlags(<ts.Declaration>node) & flag) !== 0;
}

export function isVariableDeclaration(
  node: ts.Node
): node is ts.VariableDeclaration {
  return node.kind === ts.SyntaxKind.VariableDeclaration;
}

export function isCallExpression(node: ts.Node): node is ts.CallExpression {
  return node.kind === ts.SyntaxKind.CallExpression;
}

export function isEnumMember(node: ts.Node): node is ts.EnumMember {
  return node.kind === ts.SyntaxKind.EnumMember;
}

export function isPropertyAssignment(
  node: ts.Node
): node is ts.PropertyAssignment {
  return node.kind === ts.SyntaxKind.PropertyAssignment;
}
export function isShorthandPropertyAssignment(
  node: ts.Node
): node is ts.ShorthandPropertyAssignment {
  return node.kind === ts.SyntaxKind.ShorthandPropertyAssignment;
}

export function isInConstContext(node: ts.Expression) {
  let current: ts.Node = node;
  while (true) {
    const parent = current.parent!;
    outer: switch (parent.kind) {
      case ts.SyntaxKind.TypeAssertionExpression:
      case ts.SyntaxKind.AsExpression:
        return isConstAssertion(<ts.AssertionExpression>parent);
      case ts.SyntaxKind.PrefixUnaryExpression:
        if (current.kind !== ts.SyntaxKind.NumericLiteral) return false;
        switch ((<ts.PrefixUnaryExpression>parent).operator) {
          case ts.SyntaxKind.PlusToken:
          case ts.SyntaxKind.MinusToken:
            current = parent;
            break outer;
          default:
            return false;
        }
      case ts.SyntaxKind.PropertyAssignment:
        if ((<ts.PropertyAssignment>parent).initializer !== current)
          return false;
        current = parent.parent!;
        break;
      case ts.SyntaxKind.ShorthandPropertyAssignment:
        current = parent.parent!;
        break;
      case ts.SyntaxKind.ParenthesizedExpression:
      case ts.SyntaxKind.ArrayLiteralExpression:
      case ts.SyntaxKind.ObjectLiteralExpression:
      case ts.SyntaxKind.TemplateExpression:
        current = parent;
        break;
      default:
        return false;
    }
  }
}

export function isConstAssertion(node: ts.AssertionExpression) {
  return (
    isTypeReferenceNode(node.type) &&
    node.type.typeName.kind === ts.SyntaxKind.Identifier &&
    node.type.typeName.escapedText === "const"
  );
}

export function isReadonlyAssignmentDeclaration(
  node: ts.CallExpression,
  checker: ts.TypeChecker
) {
  if (!isBindableObjectDefinePropertyCall(node)) return false;
  const descriptorType = checker.getTypeAtLocation(node.arguments[2]);
  if (descriptorType.getProperty("value") === undefined)
    return descriptorType.getProperty("set") === undefined;
  const writableProp = descriptorType.getProperty("writable");
  if (writableProp === undefined) return false;
  const writableType =
    writableProp.valueDeclaration !== undefined &&
    isPropertyAssignment(writableProp.valueDeclaration)
      ? checker.getTypeAtLocation(writableProp.valueDeclaration.initializer)
      : checker.getTypeOfSymbolAtLocation(writableProp, node.arguments[2]);
  return isBooleanLiteralType(writableType, false);
}

export function isBindableObjectDefinePropertyCall(node: ts.CallExpression) {
  return (
    node.arguments.length === 3 &&
    isEntityNameExpression(node.arguments[0]) &&
    isNumericOrStringLikeLiteral(node.arguments[1]) &&
    isPropertyAccessExpression(node.expression) &&
    node.expression.name.escapedText === "defineProperty" &&
    isIdentifier(node.expression.expression) &&
    node.expression.expression.escapedText === "Object"
  );
}

export function isBooleanLiteralType(type: ts.Type, literal: boolean) {
  return (
    isTypeFlagSet(type, ts.TypeFlags.BooleanLiteral) &&
    (<{ intrinsicName: string }>(<{}>type)).intrinsicName ===
      (literal ? "true" : "false")
  );
}

export function isEntityNameExpression(
  node: ts.Node
): node is ts.EntityNameExpression {
  return (
    node.kind === ts.SyntaxKind.Identifier ||
    (isPropertyAccessExpression(node) &&
      isEntityNameExpression(node.expression))
  );
}

export function isNumericOrStringLikeLiteral(
  node: ts.Node
): node is
  | ts.NumericLiteral
  | ts.StringLiteral
  | ts.NoSubstitutionTemplateLiteral {
  switch (node.kind) {
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NumericLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
      return true;
    default:
      return false;
  }
}

export function isPropertyAccessExpression(
  node: ts.Node
): node is ts.PropertyAccessExpression {
  return node.kind === ts.SyntaxKind.PropertyAccessExpression;
}

export function isIdentifier(node: ts.Node): node is ts.Identifier {
  return node.kind === ts.SyntaxKind.Identifier;
}
