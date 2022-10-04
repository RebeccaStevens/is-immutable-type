import {
  isTypeAliasDeclaration,
  isTypeReference,
  isTypeReferenceNode,
} from "tsutils";
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
  name: string | undefined;
  nameWithArguments: string | undefined;
  alias: string | undefined;
  aliasWithArguments: string | undefined;
  evaluated: string;
} {
  const evaluated = checker.typeToString(type);

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
    aliasArguments === undefined ? undefined : `${alias}<${aliasArguments}>`;

  if (type.intrinsicName !== undefined) {
    return {
      name: type.intrinsicName,
      nameWithArguments: undefined,
      alias,
      aliasWithArguments,
      evaluated,
    };
  }

  const symbol = type.getSymbol();
  if (symbol === undefined) {
    const wrapperDeclarations = type.aliasSymbol?.declarations;
    const wrapperDeclaration =
      wrapperDeclarations?.length === 1 ? wrapperDeclarations[0] : undefined;
    const wrapperType =
      wrapperDeclaration !== undefined &&
      isTypeAliasDeclaration(wrapperDeclaration) &&
      isTypeReferenceNode(wrapperDeclaration.type)
        ? wrapperDeclaration.type
        : undefined;
    const wrapperName = wrapperType?.typeName.getText();
    const wrapperArguments =
      wrapperType?.typeArguments === undefined
        ? undefined
        : typeArgumentsToString(
            checker,
            wrapperType.typeArguments.map((node) =>
              checker.getTypeFromTypeNode(node)
            )
          );
    const wrapperWithArguments =
      wrapperArguments === undefined
        ? undefined
        : `${wrapperName}<${wrapperArguments}>`;

    return {
      name: wrapperName,
      nameWithArguments: wrapperWithArguments,
      alias,
      aliasWithArguments,
      evaluated,
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
    evaluated,
  };
}

/**
 * Get string representations of the given type arguments.
 */
function typeArgumentsToString(
  checker: ts.TypeChecker,
  typeArguments: ReadonlyArray<ts.Type>
) {
  return `${typeArguments
    .map((t) => {
      const strings = typeToString(checker, t);
      return strings.nameWithArguments ?? strings.name;
    })
    .join(",")}`;
}
