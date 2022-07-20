import { isTypeReference } from "tsutils";
import type ts from "typescript";

/**
 * Type guard to check if a Node has a Symbol.
 */
export function hasSymbol(
  node: ts.Node
): node is ts.Node & { symbol: ts.Symbol } {
  return Object.hasOwn(node, "symbol");
}

/**
 * Get string representations of the given type.
 */
export function typeToString(
  checker: ts.TypeChecker,
  type: ts.Type
): {
  name: string;
  nameWithArguments: string | undefined;
  alias: string | undefined;
  aliasWithArguments: string | undefined;
} {
  const alias = type.aliasSymbol?.name;
  const aliasType =
    type.aliasSymbol === undefined
      ? undefined
      : checker.getDeclaredTypeOfSymbol(type.aliasSymbol);
  const aliasArguments =
    aliasType?.aliasTypeArguments === undefined
      ? undefined
      : typeArgumentsToString(checker, aliasType.aliasTypeArguments);
  const aliasWithArguments =
    aliasArguments === undefined ? undefined : `${alias}${aliasArguments}`;

  if (type.intrinsicName !== undefined) {
    return {
      name: type.intrinsicName,
      nameWithArguments: undefined,
      alias,
      aliasWithArguments,
    };
  }

  const symbol = type.getSymbol();
  if (symbol === undefined) {
    return {
      name: type.toString(),
      nameWithArguments: undefined,
      alias,
      aliasWithArguments,
    };
  }

  const name = checker.symbolToString(symbol);

  const typeArguments = isTypeReference(type)
    ? checker.getTypeArguments(type)
    : undefined;

  const nameWithArguments =
    typeArguments !== undefined && typeArguments.length > 0
      ? `${name}<${typeArgumentsToString(checker, typeArguments)}>`
      : undefined;

  return {
    name,
    nameWithArguments,
    alias,
    aliasWithArguments,
  };
}

/**
 * Get string representations of the given type arguments.
 */
function typeArgumentsToString(
  checker: ts.TypeChecker,
  typeArguments: ReadonlyArray<ts.Type>
) {
  return `<${typeArguments
    .map((t) => {
      const strings = typeToString(checker, t);
      return strings.nameWithArguments ?? strings.name;
    })
    .join(",")}>`;
}
