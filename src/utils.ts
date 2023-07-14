import { isTypeReference } from "ts-api-utils";
import ts from "typescript";

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
 * Get string representations of the given type.
 */
export function typeToString(
  program: ts.Program,
  typeOrTypeNode: ts.Type | ts.TypeNode,
): {
  name: string | undefined;
  nameWithArguments: string | undefined;
  alias: string | undefined;
  aliasWithArguments: string | undefined;
  evaluated: string;
  written: string | undefined;
} {
  const checker = program.getTypeChecker();
  const typeIsTypeNode = isTypeNode(typeOrTypeNode);
  const type = typeIsTypeNode
    ? checker.getTypeFromTypeNode(typeOrTypeNode)
    : typeOrTypeNode;
  const typeNode = typeIsTypeNode ? typeOrTypeNode : undefined;

  const written = typeNode?.getText();

  const evaluated = checker.typeToString(type);

  const alias = type.aliasSymbol?.name;
  const aliasType =
    type.aliasSymbol === undefined
      ? undefined
      : checker.getDeclaredTypeOfSymbol(type.aliasSymbol);
  const aliasArguments =
    aliasType?.aliasTypeArguments === undefined
      ? undefined
      : typeArgumentsToString(
          program,
          aliasType,
          alias,
          aliasType.aliasTypeArguments,
        );
  const aliasWithArguments =
    aliasArguments === undefined ? undefined : `${alias}<${aliasArguments}>`;

  if (type.intrinsicName !== undefined) {
    return {
      name: type.intrinsicName,
      nameWithArguments: undefined,
      alias,
      aliasWithArguments,
      evaluated,
      written,
    };
  }

  const symbol = type.getSymbol();
  if (symbol === undefined) {
    const wrapperDeclarations = type.aliasSymbol?.declarations;
    const wrapperDeclaration =
      wrapperDeclarations?.length === 1 ? wrapperDeclarations[0] : undefined;
    const wrapperType =
      wrapperDeclaration !== undefined &&
      ts.isTypeAliasDeclaration(wrapperDeclaration) &&
      ts.isTypeReferenceNode(wrapperDeclaration.type)
        ? wrapperDeclaration.type
        : undefined;
    const wrapperName = wrapperType?.typeName.getText();
    const wrapperArguments =
      wrapperType?.typeArguments === undefined
        ? undefined
        : typeArgumentsToString(
            program,
            checker.getTypeFromTypeNode(wrapperType),
            wrapperName,
            wrapperType.typeArguments.map((node) =>
              checker.getTypeFromTypeNode(node),
            ),
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
      written,
    };
  }

  const name = checker.symbolToString(symbol);

  const typeArguments = isTypeReference(type)
    ? checker.getTypeArguments(type)
    : undefined;

  const nameWithArguments =
    typeArguments !== undefined && typeArguments.length > 0
      ? `${name}<${typeArgumentsToString(program, type, name, typeArguments)}>`
      : undefined;

  return {
    name,
    nameWithArguments,
    alias,
    aliasWithArguments,
    evaluated,
    written,
  };
}

/**
 * Get string representations of the given type arguments.
 */
function typeArgumentsToString(
  program: ts.Program,
  type: ts.Type,
  typeName: string | undefined,
  typeArguments: ReadonlyArray<ts.Type>,
) {
  const typeArgumentStrings = typeArguments.map((t) => {
    if (type === t) {
      return typeName;
    }
    const strings = typeToString(program, t);
    return strings.nameWithArguments ?? strings.name ?? strings.evaluated;
  });

  if (typeArgumentStrings.includes(undefined)) {
    console.warn(
      "type argument strings contains `undefined`, this is likely a bug in `is-immutable-type`",
    );
    return undefined;
  }

  return `${typeArgumentStrings.join(",")}`;
}
