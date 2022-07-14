import { isTypeReference } from "tsutils";
import type ts from "typescript";

/**
 * Type guard to check if a Node has a Symbol.
 */
export function hasSymbol(
  node: ts.Node
): node is ts.Node & { symbol: ts.Symbol } {
  return Object.prototype.hasOwnProperty.call(node, "symbol");
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
} {
  if (type.intrinsicName !== undefined) {
    return {
      name: type.intrinsicName,
      nameWithArguments: undefined,
    };
  }

  const symbol = type.getSymbol();
  if (symbol === undefined) {
    return {
      name: type.toString(),
      nameWithArguments: undefined,
    };
  }

  const name = checker.symbolToString(symbol);

  const typeArguments = isTypeReference(type)
    ? checker.getTypeArguments(type)
    : undefined;

  const nameWithArguments =
    typeArguments !== undefined && typeArguments.length > 0
      ? `${name}<${typeArguments
          .map((t) => {
            const strings = typeToString(checker, t);
            return strings.nameWithArguments ?? strings.name;
          })
          .join(",")}>`
      : undefined;

  return {
    name,
    nameWithArguments,
  };
}
