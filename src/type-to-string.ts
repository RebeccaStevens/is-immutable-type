/* eslint-disable functional/no-conditional-statements */

import { isSymbolFlagSet, isTypeReference } from "ts-api-utils";
import ts from "typescript";

import {
  getTypeData,
  asTypeData,
  type TypeData,
  cacheData,
  getCachedData,
} from "./utils";

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
  };

  private m_wrapperType: ts.TypeReferenceNode | undefined;
  private readonly checker: ts.TypeChecker;

  public constructor(
    private readonly program: ts.Program,
    private readonly typeData: Readonly<TypeData>
  ) {
    this.m_data = {};
    this.checker = program.getTypeChecker();
  }

  public getName(): string | null {
    if (this.m_data.name === undefined) {
      if (this.typeData.type.intrinsicName === undefined) {
        const symbol = this.typeData.type.getSymbol();
        if (symbol === undefined) {
          const wrapperDeclarations =
            this.typeData.type.aliasSymbol?.declarations;
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
          this.m_data.name =
            this.m_wrapperType === undefined
              ? null
              : entityNameToString(this.m_wrapperType.typeName);
        } else if (isSymbolFlagSet(symbol, ts.SymbolFlags.TypeLiteral)) {
          this.m_data.name = null;
        } else {
          this.m_data.name = this.checker.symbolToString(symbol);
        }
      } else {
        this.m_data.name = this.typeData.type.intrinsicName;
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
      } else if (this.typeData.type.intrinsicName === undefined) {
        const symbol = this.typeData.type.getSymbol();
        if (symbol === undefined) {
          if (this.m_wrapperType?.typeArguments === undefined) {
            this.m_data.nameWithArguments = null;
          } else {
            const wrapperArguments = typeArgumentsToString(
              this.program,
              getTypeData(this.program, this.m_wrapperType),
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
          const typeArguments = isTypeReference(this.typeData.type)
            ? this.checker.getTypeArguments(this.typeData.type)
            : undefined;

          this.m_data.nameWithArguments =
            typeArguments !== undefined && typeArguments.length > 0
              ? `${this.m_data.name}<${typeArgumentsToString(
                  this.program,
                  this.typeData,
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
      this.m_data.alias = this.typeData.type.aliasSymbol?.escapedName ?? null;
    }
    return this.m_data.alias;
  }

  public getAliasWithArguments(): string | null {
    if (this.m_data.aliasWithArguments === undefined) {
      if (this.typeData.type.aliasSymbol === undefined) {
        this.m_data.aliasWithArguments = null;
      } else {
        if (this.m_data.alias === undefined) {
          this.m_data.alias = this.getAlias();
        }
        if (this.m_data.alias === null) {
          this.m_data.aliasWithArguments = null;
        } else {
          const aliasType = this.checker.getDeclaredTypeOfSymbol(
            this.typeData.type.aliasSymbol
          );
          if (aliasType.aliasTypeArguments === undefined) {
            this.m_data.aliasWithArguments = null;
          } else {
            const aliasArguments = typeArgumentsToString(
              this.program,
              asTypeData(aliasType),
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
      if (
        this.typeData.typeNode !== null &&
        ts.isTypeReferenceNode(this.typeData.typeNode)
      ) {
        const name = entityNameToString(this.typeData.typeNode.typeName);

        if (this.typeData.typeNode.typeArguments === undefined) {
          this.m_data.evaluated = name;
        } else {
          const typeArguments = typeArgumentsToString(
            this.program,
            this.typeData,
            undefined,
            this.typeData.typeNode.typeArguments
          );

          this.m_data.evaluated =
            typeArguments === undefined ? name : `${name}<${typeArguments}>`;
        }
      } else {
        this.m_data.evaluated = this.checker.typeToString(this.typeData.type);
      }
    }
    return this.m_data.evaluated;
  }
}

/**
 * Get string representations of the given type arguments.
 */
function typeArgumentsToString(
  program: ts.Program,
  typeData: TypeData,
  name: string | undefined,
  typeArguments: ReadonlyArray<ts.Type> | ts.NodeArray<ts.TypeNode>
) {
  const typeArgumentStrings = typeArguments.map((t) => {
    const typeArgument = getTypeData(program, t);
    if (typeData.type === typeArgument.type) {
      return name;
    }
    const typeName = typeToString(program, typeArgument);
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

/**
 * Get string representations of the given entity name.
 */
function entityNameToString(entityName: ts.EntityName): string {
  return ts.isIdentifier(entityName)
    ? identifierToString(entityName)
    : qualifiedNameToString(entityName);
}

/**
 * Get string representations of the given identifier.
 */
function identifierToString(identifier: ts.Identifier): string {
  return identifier.escapedText as string;
}

/**
 * Get string representations of the given qualified name.
 */
function qualifiedNameToString(qualifiedName: ts.QualifiedName): string {
  return `${entityNameToString(qualifiedName.left)}.${identifierToString(
    qualifiedName.right
  )}`;
}

const cache = new WeakMap<ts.Type, TypeName>();

/**
 * Get string representations of the given type.
 */
export function typeToString(
  program: ts.Program,
  typeData: Readonly<TypeData>
): TypeName {
  const cached = getCachedData(program, cache, typeData);
  if (cached !== undefined) {
    return cached;
  }
  const typeName = new TypeName(program, typeData);
  cacheData(program, cache, typeData, typeName);
  return typeName;
}

export { type TypeName };
