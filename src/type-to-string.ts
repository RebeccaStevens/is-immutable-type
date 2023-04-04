/* eslint-disable functional/no-conditional-statements */

import { isTypeReference } from "ts-api-utils";
import ts from "typescript";

import { isTypeNode } from "./utils";

/*
 * A class is used to store state and only calculate the data on demand.
 * This is more efficient than the functional approach.
 */

class TypeName {
  private readonly m_data: {
    name?: string | null;
    nameWithArguments?: string | null;
    alias?: string | null;
    aliasWithArguments?: string | null;
    evaluated?: string;
    written?: string | null;
  };

  private m_wrapperType: ts.TypeReferenceNode | undefined;
  private readonly type: ts.Type;
  private readonly typeNode: ts.TypeNode | undefined;
  private readonly checker: ts.TypeChecker;

  public constructor(
    private readonly program: ts.Program,
    typeOrTypeNode: ts.Type | ts.TypeNode
  ) {
    this.m_data = {};

    this.checker = program.getTypeChecker();
    const typeIsTypeNode = isTypeNode(typeOrTypeNode);

    this.type = typeIsTypeNode
      ? this.checker.getTypeFromTypeNode(typeOrTypeNode)
      : typeOrTypeNode;
    this.typeNode = typeIsTypeNode ? typeOrTypeNode : undefined;
  }

  public getName(): string | null {
    if (this.m_data.name === undefined) {
      if (this.type.intrinsicName === undefined) {
        const symbol = this.type.getSymbol();
        if (symbol === undefined) {
          const wrapperDeclarations = this.type.aliasSymbol?.declarations;
          const wrapperDeclaration =
            wrapperDeclarations?.length === 1
              ? wrapperDeclarations[0]
              : undefined;
          this.m_wrapperType =
            wrapperDeclaration !== undefined &&
            ts.isTypeAliasDeclaration(wrapperDeclaration) &&
            ts.isTypeReferenceNode(wrapperDeclaration.type)
              ? wrapperDeclaration.type
              : undefined;
          this.m_data.name = this.m_wrapperType?.typeName.getText() ?? null;
        } else {
          this.m_data.name = this.checker.symbolToString(symbol);
        }
      } else {
        this.m_data.name = this.type.intrinsicName;
      }
    }
    return this.m_data.name;
  }

  public getNameWithArguments(): string | null {
    if (this.m_data.nameWithArguments === undefined) {
      if (this.m_data.name === undefined) {
        this.m_data.name = this.getName();
      }
      if (this.m_data.name === null) {
        this.m_data.nameWithArguments = null;
      } else if (this.type.intrinsicName === undefined) {
        const symbol = this.type.getSymbol();
        if (symbol === undefined) {
          if (this.m_wrapperType?.typeArguments === undefined) {
            this.m_data.nameWithArguments = null;
          } else {
            const wrapperArguments = typeArgumentsToString(
              this.program,
              this.checker.getTypeFromTypeNode(this.m_wrapperType),
              this.m_data.name,
              this.m_wrapperType.typeArguments.map((node) =>
                this.checker.getTypeFromTypeNode(node)
              )
            );
            this.m_data.nameWithArguments =
              wrapperArguments === undefined
                ? null
                : `${this.m_data.name}<${wrapperArguments}>`;
          }
        } else {
          const typeArguments = isTypeReference(this.type)
            ? this.checker.getTypeArguments(this.type)
            : undefined;

          this.m_data.nameWithArguments =
            typeArguments !== undefined && typeArguments.length > 0
              ? `${this.m_data.name}<${typeArgumentsToString(
                  this.program,
                  this.type,
                  this.m_data.name,
                  typeArguments
                )}>`
              : null;
        }
      } else {
        this.m_data.nameWithArguments = null;
      }
    }
    return this.m_data.nameWithArguments;
  }

  public getAlias(): string | null {
    if (this.m_data.alias === undefined) {
      this.m_data.alias = this.type.aliasSymbol?.name ?? null;
    }
    return this.m_data.alias;
  }

  public getAliasWithArguments(): string | null {
    if (this.m_data.aliasWithArguments === undefined) {
      if (this.type.aliasSymbol === undefined) {
        this.m_data.aliasWithArguments = null;
      } else {
        if (this.m_data.alias === undefined) {
          this.m_data.alias = this.getAlias();
        }
        if (this.m_data.alias === null) {
          this.m_data.aliasWithArguments = null;
        } else {
          const aliasType = this.checker.getDeclaredTypeOfSymbol(
            this.type.aliasSymbol
          );
          if (aliasType.aliasTypeArguments === undefined) {
            this.m_data.aliasWithArguments = null;
          } else {
            const aliasArguments = typeArgumentsToString(
              this.program,
              aliasType,
              this.m_data.alias,
              aliasType.aliasTypeArguments
            );
            this.m_data.aliasWithArguments =
              aliasArguments === undefined
                ? null
                : `${this.m_data.alias}<${aliasArguments}>`;
          }
        }
      }
    }
    return this.m_data.aliasWithArguments;
  }

  public getEvaluated(): string {
    if (this.m_data.evaluated === undefined) {
      this.m_data.evaluated = this.checker.typeToString(this.type);
    }
    return this.m_data.evaluated;
  }

  public getWritten(): string | null {
    if (this.m_data.written === undefined) {
      this.m_data.written = this.typeNode?.getText() ?? null;
    }
    return this.m_data.written;
  }
}

/**
 * Get string representations of the given type arguments.
 */
function typeArgumentsToString(
  program: ts.Program,
  type: Readonly<ts.Type>,
  name: string | undefined,
  typeArguments: ReadonlyArray<ts.Type>
) {
  const typeArgumentStrings = typeArguments.map((t) => {
    if (type === t) {
      return name;
    }
    const typeName = new TypeName(program, t);
    return (
      typeName.getNameWithArguments() ??
      typeName.getName() ??
      typeName.getEvaluated()
    );
  });

  if (typeArgumentStrings.includes(undefined)) {
    console.warn(
      "`typeArgumentStrings` contains `undefined`, this is likely a bug in `is-immutable-type`"
    );
    return undefined;
  }

  return `${typeArgumentStrings.join(",")}`;
}

const cache = new WeakMap<ts.Type | ts.TypeNode, TypeName>();

/**
 * Get string representations of the given type.
 */
export function typeToString(
  program: ts.Program,
  typeOrTypeNode: ts.Type | ts.TypeNode
): TypeName {
  const cached = cache.get(typeOrTypeNode);
  if (cached !== undefined) {
    return cached;
  }
  const typeName = new TypeName(program, typeOrTypeNode);
  cache.set(typeOrTypeNode, typeName);
  return typeName;
}

export { type TypeName };
