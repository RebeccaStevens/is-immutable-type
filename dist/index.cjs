'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var typeUtils = require('@typescript-eslint/type-utils');
var utils = require('@typescript-eslint/utils');
var tsutils = require('tsutils');
var ts = require('typescript');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var ts__default = /*#__PURE__*/_interopDefaultLegacy(ts);

/**
 * The immutability sorted ascendently.
 */
exports.Immutability = void 0;
(function (Immutability) {
    Immutability[Immutability['Unknown'] = Number.NaN] = 'Unknown';
    // MutableDeep = 1,
    Immutability[Immutability['Mutable'] = 2] = 'Mutable';
    // MutableShallow = 2,
    // Readonly = 3,
    Immutability[Immutability['ReadonlyShallow'] = 3] = 'ReadonlyShallow';
    Immutability[Immutability['ReadonlyDeep'] = 4] = 'ReadonlyDeep';
    Immutability[Immutability['Immutable'] = 5] = 'Immutable';
}(exports.Immutability || (exports.Immutability = {})));

/**
 * Get the minimum immutability from the given values.
 *
 * Note: Unknown immutability will be ignore; thus Unknown will be return if
 * and only if all values are Unknown.
 */
function min(a, b) {
    if (isUnknown(a)) {
        return b;
    }
    if (isUnknown(b)) {
        return a;
    }
    return Math.min(a, b);
}
/**
 * Get the maximum immutability from the given values.
 *
 * Note: Unknown immutability will be ignore; thus Unknown will be return if
 * and only if all values are Unknown.
 */
function max(a, b) {
    if (isUnknown(a)) {
        return b;
    }
    if (isUnknown(b)) {
        return a;
    }
    return Math.max(a, b);
}
/**
 * Clamp the immutability between min and max.
 */
function clamp(minValue, value, maxValue) {
    return Math.max(minValue, Math.min(maxValue, value));
}
/**
 * Is the given immutability immutable?
 */
function isImmutable(immutability) {
    return immutability >= exports.Immutability.Immutable;
}
/**
 * Is the given immutability at least ReadonlyDeep?
 */
function isReadonlyDeep(immutability) {
    return immutability >= exports.Immutability.ReadonlyDeep;
}
/**
 * Is the given immutability at least ReadonlyShallow?
 */
function isReadonlyShallow(immutability) {
    return immutability >= exports.Immutability.ReadonlyShallow;
}
/**
 * Is the given immutability Mutable?
 */
function isMutable(immutability) {
    return immutability <= exports.Immutability.Mutable;
}
/**
 * Is the given immutability unknown?
 */
function isUnknown(value) {
    return Number.isNaN(value);
}

/**
 * Type guard to check if a Node has a Symbol.
 */
function hasSymbol(node) {
    return Object.hasOwn(node, 'symbol');
}
/**
 * Get string representations of the given type.
 */
function typeToString(checker, type) {
    var _a, _b;
    const alias = (_a = type.aliasSymbol) === null || _a === void 0 ? void 0 : _a.name;
    const aliasType = type.aliasSymbol === undefined ? undefined : checker.getDeclaredTypeOfSymbol(type.aliasSymbol);
    const aliasArguments = (aliasType === null || aliasType === void 0 ? void 0 : aliasType.aliasTypeArguments) === undefined ? undefined : typeArgumentsToString(checker, aliasType.aliasTypeArguments);
    const aliasWithArguments = aliasArguments === undefined ? undefined : `${ alias }${ aliasArguments }`;
    if (type.intrinsicName !== undefined) {
        return {
            name: type.intrinsicName,
            nameWithArguments: undefined,
            alias,
            aliasWithArguments
        };
    }
    const symbol = type.getSymbol();
    if (symbol === undefined) {
        const wrapperDeclarations = (_b = type.aliasSymbol) === null || _b === void 0 ? void 0 : _b.declarations;
        const wrapperDeclaration = (wrapperDeclarations === null || wrapperDeclarations === void 0 ? void 0 : wrapperDeclarations.length) === 1 ? wrapperDeclarations[0] : undefined;
        const wrapperType = wrapperDeclaration !== undefined && tsutils.isTypeAliasDeclaration(wrapperDeclaration) && tsutils.isTypeReferenceNode(wrapperDeclaration.type) ? wrapperDeclaration.type : undefined;
        const wrapperName = wrapperType === null || wrapperType === void 0 ? void 0 : wrapperType.typeName.getText();
        const wrapperArguments = (wrapperType === null || wrapperType === void 0 ? void 0 : wrapperType.typeArguments) === undefined ? undefined : typeArgumentsToString(checker, wrapperType.typeArguments.map(node => checker.getTypeFromTypeNode(node)));
        const wrapperWithArguments = wrapperArguments === undefined ? undefined : `${ wrapperName }${ wrapperArguments }`;
        return {
            name: wrapperName,
            nameWithArguments: wrapperWithArguments,
            alias,
            aliasWithArguments
        };
    }
    const name = checker.symbolToString(symbol);
    const typeArguments = tsutils.isTypeReference(type) ? checker.getTypeArguments(type) : undefined;
    const nameWithArguments = typeArguments !== undefined && typeArguments.length > 0 ? `${ name }<${ typeArgumentsToString(checker, typeArguments) }>` : undefined;
    return {
        name,
        nameWithArguments,
        alias,
        aliasWithArguments
    };
}
/**
 * Get string representations of the given type arguments.
 */
function typeArgumentsToString(checker, typeArguments) {
    return `<${ typeArguments.map(t => {
        var _a;
        const strings = typeToString(checker, t);
        return (_a = strings.nameWithArguments) !== null && _a !== void 0 ? _a : strings.name;
    }).join(',') }>`;
}

/**
 * Get the default overrides that are applied.
 */
function getDefaultOverrides() {
    return [
        {
            name: 'Map',
            to: exports.Immutability.Mutable
        },
        {
            name: 'Set',
            to: exports.Immutability.Mutable
        }
    ];
}
/**
 * A global cache that can be used between consumers.
 */
const globalCache = new WeakMap();
/**
 * Get the immutability of the given type.
 *
 * @param checker - The TypeScript Type Checker to use.
 * @param type - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
function getTypeImmutability(checker, type, overrides = getDefaultOverrides(), useCache = true) {
    const cache = useCache === true ? globalCache : useCache === false ? new WeakMap() : useCache;
    const cached = cache.get(type);
    if (cached !== undefined) {
        return cached;
    }
    const override = getOverride(checker, type, overrides);
    const overrideTo = override === null || override === void 0 ? void 0 : override.to;
    const overrideFrom = override === null || override === void 0 ? void 0 : override.from;
    // Early escape if we don't need to check the override from.
    if (overrideTo !== undefined && overrideFrom === undefined) {
        cache.set(type, overrideTo);
        return overrideTo;
    }
    cache.set(type, exports.Immutability.Unknown);
    const immutability = calculateTypeImmutability(checker, type, overrides, cache);
    if (overrideTo !== undefined) {
        if (overrideFrom <= immutability && immutability <= overrideTo || overrideFrom >= immutability && immutability >= overrideTo) {
            cache.set(type, overrideTo);
            return overrideTo;
        }
    }
    cache.set(type, immutability);
    return immutability;
}
/**
 * Get the override for the type if it has one.
 */
function getOverride(checker, type, overrides) {
    var _a, _b, _c;
    const {name, nameWithArguments, alias, aliasWithArguments} = typeToString(checker, type);
    for (const potentialOverride of overrides) {
        if (name !== undefined && (potentialOverride.name === name || ((_a = potentialOverride.pattern) === null || _a === void 0 ? void 0 : _a.test(nameWithArguments !== null && nameWithArguments !== void 0 ? nameWithArguments : name)) === true) || alias !== undefined && (potentialOverride.name === alias || ((_b = potentialOverride.pattern) === null || _b === void 0 ? void 0 : _b.test(alias)) === true) || aliasWithArguments !== undefined && ((_c = potentialOverride.pattern) === null || _c === void 0 ? void 0 : _c.test(aliasWithArguments)) === true) {
            return potentialOverride;
        }
    }
    return undefined;
}
/**
 * Calculated the immutability of the given type.
 */
function calculateTypeImmutability(checker, type, overrides, cache) {
    // Union?
    if (tsutils.isUnionType(type)) {
        return tsutils.unionTypeParts(type).map(t => getTypeImmutability(checker, t, overrides, cache)).reduce(min);
    }
    // Intersection?
    if (tsutils.isIntersectionType(type)) {
        return objectImmutability(checker, type, overrides, cache);
    }
    // Conditional?
    if (tsutils.isConditionalType(type)) {
        return [
            type.root.node.trueType,
            type.root.node.falseType
        ].map(tn => {
            const t = checker.getTypeFromTypeNode(tn);
            return getTypeImmutability(checker, t, overrides, cache);
        }).reduce(min);
    }
    // (Non-namespace) Function?
    if (type.getCallSignatures().length > 0 && type.getProperties().length === 0) {
        return exports.Immutability.Immutable;
    }
    // Tuple?
    if (checker.isTupleType(type)) {
        if (!type.target.readonly) {
            return exports.Immutability.Mutable;
        }
        return arrayImmutability(checker, type, overrides, cache);
    }
    // Array?
    if (checker.isArrayType(type)) {
        return arrayImmutability(checker, type, overrides, cache);
    }
    // Other type of object?
    if (tsutils.isObjectType(type)) {
        return objectImmutability(checker, type, overrides, cache);
    }
    // Must be a primitive.
    return exports.Immutability.Immutable;
}
/**
 * Get the immutability of the given array.
 */
function arrayImmutability(checker, type, overrides, cache) {
    const shallowImmutability = objectImmutability(checker, type, overrides, cache);
    if (shallowImmutability === exports.Immutability.Mutable) {
        return shallowImmutability;
    }
    const deepImmutability = typeArgumentsImmutability(checker, type, overrides, cache);
    return clamp(shallowImmutability, deepImmutability, exports.Immutability.ReadonlyShallow);
}
/**
 * Get the immutability of the given object.
 */
function objectImmutability(checker, type, overrides, cache) {
    var _a;
    let m_maxImmutability = exports.Immutability.Immutable;
    let m_minImmutability = exports.Immutability.Mutable;
    const properties = type.getProperties();
    if (properties.length > 0) {
        for (const property of properties) {
            if (tsutils.isPropertyReadonlyInType(type, property.getEscapedName(), checker) || property.escapedName === 'length' && checker.isTupleType(type)) {
                continue;
            }
            const name = ts__default["default"].getNameOfDeclaration(property.valueDeclaration);
            if (name !== undefined && ts__default["default"].isPrivateIdentifier(name)) {
                continue;
            }
            if (property.valueDeclaration !== undefined && hasSymbol(property.valueDeclaration) && tsutils.isSymbolFlagSet(property.valueDeclaration.symbol, ts__default["default"].SymbolFlags.Method)) {
                m_maxImmutability = min(m_maxImmutability, exports.Immutability.ReadonlyDeep);
                continue;
            }
            const lastDeclaration = (_a = property.getDeclarations()) === null || _a === void 0 ? void 0 : _a.at(-1);
            if (lastDeclaration !== undefined && tsutils.isPropertySignature(lastDeclaration) && lastDeclaration.type !== undefined && tsutils.isFunctionTypeNode(lastDeclaration.type)) {
                m_maxImmutability = min(m_maxImmutability, exports.Immutability.ReadonlyDeep);
                continue;
            }
            return exports.Immutability.Mutable;
        }
        m_minImmutability = exports.Immutability.ReadonlyShallow;
        for (const property of properties) {
            const propertyType = utils.ESLintUtils.nullThrows(typeUtils.getTypeOfPropertyOfType(checker, type, property), utils.ESLintUtils.NullThrowsReasons.MissingToken(`property "${ property.name }"`, 'type'));
            const result = getTypeImmutability(checker, propertyType, overrides, cache);
            m_maxImmutability = min(m_maxImmutability, result);
            if (m_minImmutability >= m_maxImmutability) {
                return m_minImmutability;
            }
        }
    }
    if (tsutils.isTypeReference(type)) {
        const result = typeArgumentsImmutability(checker, type, overrides, cache);
        m_maxImmutability = min(m_maxImmutability, result);
        if (m_minImmutability >= m_maxImmutability) {
            return m_minImmutability;
        }
    }
    const stringIndexSigImmutability = indexSignatureImmutability(checker, type, ts__default["default"].IndexKind.String, overrides, cache);
    m_maxImmutability = min(stringIndexSigImmutability, m_maxImmutability);
    if (m_minImmutability >= m_maxImmutability) {
        return m_minImmutability;
    }
    const numberIndexSigImmutability = indexSignatureImmutability(checker, type, ts__default["default"].IndexKind.Number, overrides, cache);
    m_maxImmutability = min(numberIndexSigImmutability, m_maxImmutability);
    if (m_minImmutability >= m_maxImmutability) {
        return m_minImmutability;
    }
    return max(m_minImmutability, m_maxImmutability);
}
/**
 * Get the immutability of the given type arguments.
 */
function typeArgumentsImmutability(checker, type, overrides, cache) {
    const typeArguments = checker.getTypeArguments(type);
    if (typeArguments.length > 0) {
        return typeArguments.map(t => getTypeImmutability(checker, t, overrides, cache)).reduce(min);
    }
    return exports.Immutability.Unknown;
}
/**
 * Get the immutability of the given index signature.
 */
function indexSignatureImmutability(checker, type, kind, overrides, cache) {
    const indexInfo = checker.getIndexInfoOfType(type, kind);
    if (indexInfo === undefined) {
        return exports.Immutability.Unknown;
    }
    if (indexInfo.isReadonly) {
        return max(exports.Immutability.ReadonlyShallow, getTypeImmutability(checker, indexInfo.type, overrides, cache));
    }
    return exports.Immutability.Mutable;
}

/**
 * Is the immutability of the given type immutable.
 *
 * @param checker - The TypeScript Type Checker to use.
 * @param type - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
function isImmutableType(checker, type, overrides = getDefaultOverrides(), useCache = true) {
    const immutability = getTypeImmutability(checker, type, overrides, useCache);
    return isImmutable(immutability);
}
/**
 * Is the immutability of the given type at least readonly deep.
 *
 * @param checker - The TypeScript Type Checker to use.
 * @param type - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
function isReadonlyDeepType(checker, type, overrides = getDefaultOverrides(), useCache = true) {
    const immutability = getTypeImmutability(checker, type, overrides, useCache);
    return isReadonlyDeep(immutability);
}
/**
 * Is the immutability of the given type at least readonly shallow.
 *
 * @param checker - The TypeScript Type Checker to use.
 * @param type - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
function isReadonlyShallowType(checker, type, overrides = getDefaultOverrides(), useCache = true) {
    const immutability = getTypeImmutability(checker, type, overrides, useCache);
    return isReadonlyShallow(immutability);
}
/**
 * Is the immutability of the given type mutable.
 *
 * @param checker - The TypeScript Type Checker to use.
 * @param type - The type to test the immutability of.
 * @param overrides - The overrides to use when calculating the immutability.
 * @param useCache - Either a custom cache to use, `true` to use the global
 * cache, or `false` to not use any predefined cache.
 */
function isMutableType(checker, type, overrides = getDefaultOverrides(), useCache = true) {
    const immutability = getTypeImmutability(checker, type, overrides, useCache);
    return isMutable(immutability);
}

exports.clamp = clamp;
exports.getDefaultOverrides = getDefaultOverrides;
exports.getTypeImmutability = getTypeImmutability;
exports.isImmutable = isImmutable;
exports.isImmutableType = isImmutableType;
exports.isMutable = isMutable;
exports.isMutableType = isMutableType;
exports.isReadonlyDeep = isReadonlyDeep;
exports.isReadonlyDeepType = isReadonlyDeepType;
exports.isReadonlyShallow = isReadonlyShallow;
exports.isReadonlyShallowType = isReadonlyShallowType;
exports.isUnknown = isUnknown;
exports.max = max;
exports.min = min;
