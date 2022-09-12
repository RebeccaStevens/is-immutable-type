<div align="center">

# is-immutable-type

[![npm version](https://img.shields.io/npm/v/is-immutable-type.svg)](https://www.npmjs.com/package/is-immutable-type)
[![CI](https://github.com/RebeccaStevens/is-immutable-type/actions/workflows/ci.yml/badge.svg)](https://github.com/RebeccaStevens/is-immutable-type/actions/workflows/ci.yml)
[![Coverage Status](https://codecov.io/gh/RebeccaStevens/is-immutable-type/branch/main/graph/badge.svg?token=MVpR1oAbIT)](https://codecov.io/gh/RebeccaStevens/is-immutable-type)\
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![GitHub Discussions](https://img.shields.io/github/discussions/RebeccaStevens/is-immutable-type?style=flat-square)](https://github.com/RebeccaStevens/is-immutable-type/discussions)
[![BSD 3 Clause license](https://img.shields.io/github/license/RebeccaStevens/is-immutable-type.svg?style=flat-square)](https://opensource.org/licenses/BSD-3-Clause)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square)](https://commitizen.github.io/cz-cli/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)

</div>

Test the immutability of TypeScript types.

## Donate

[Any donations would be much appreciated](./DONATIONS.md). 😄

# Installation

```sh
# Install with npm
npm install is-immutable-type

# Install with yarn
yarn add is-immutable-type
```

# Usage

```ts
import { getTypeImmutableness, Immutableness, isReadonlyDeep, isUnknown } from "is-immutable-type";
import type ts from "typescript";

function foo(checker: ts.TypeChecker, node: ts.Node) {
  const nodeType = checker.getTypeAtLocation(node);
  const constrainedNodeType = checker.getBaseConstraintOfType(nodeType);
  const immutableness = getTypeImmutableness(checker, constrainedNodeType);

  if (isUnknown(immutableness)) {
    console.log("`immutableness` is `Unknown`").
  } else if (isReadonlyDeep(immutableness)) {
    console.log("`immutableness` is `ReadonlyDeep` or `Immutable`").
  } else {
    console.log("`immutableness` is `ReadonlyShallow` or `Mutable`").
  }
}
```

Tip: You can also use comparator expression (such as `>` and `<`) to compare
`Immutableness`.
Note: `Immutableness.Unknown` will always return `false` when used in a
comparator expression. This includes `===` - use `isUnknown()` if you need to
test if a value is `Unknown`.

# Immutableness

## Definitions

- `Immutable`: Fully, deeply readonly. Everything is read only and nothing can be modified.
- `ReadonlyDeep`: The data is deeply immutable but methods are not.
- `ReadonlyShallow`: The data is shallowly immutable, but at least one deep value is not.
- `Mutable`: The data is shallowly mutable.
- `Unknown`: We couldn't determine the immutableness of the type.

Note: Internally `Unknown` may also be used to mean that we are still
calculating the immutableness of the type. This shouldn't be exposed to the
outside world though.

## Overrides

Sometimes we cannot correctly tell what a type's immutableness is supposed to be
just by analyzing its type makeup. One common reason for this is because methods
may modify internal state and we cannot tell this just by the method's type. For
this reason, we allow types to be overridden.

To override a type, pass an `overrides` array of all the `override` objects you
want to use to your function call. You can either override a type by `name` or
by a regex `pattern`. Specify a `to` property with the new immutableness value
that should be used. Additionally you may also only override a type if it is
calculated to have a certain immutableness by specifying a `from` property.

### Example 1

Always treat `ReadonlyArray`s as Immutable

```ts
[{ name: "ReadonlyArray", to: Immutableness.Immutable }]
```

### Example 2

Treat `ReadonlyArray`s as `Immutable` instead of `ReadonlyDeep`. But if the
instance type was calculated as `ReadonlyShallow`, it will stay as such.

```ts
[{ name: "ReadonlyArray", to: Immutableness.Immutable, from: Immutableness.ReadonlyDeep }]
```

### Default Overrides

By default the types `Map` and `Set` are overridden to be `Mutable`.

If you know of any other internally defined TypeScript types that need to be
overridden, please open an issue.

Note: When providing custom overrides, the default ones will not be used. Be
sure to include the default overrides in your custom overrides if you don't want
to lose them. You can obtain them with `getDefaultOverrides()`.

### Another Use of Overrides

Currently due to limitations in TypeScript, it is impossible to write a utility
type that will transform any given type to an immutable version of it in all
cases. ([See this issue](https://github.com/microsoft/TypeScript/issues/29732))

One popular implementation of such a utility type is
[type-fest](https://www.npmjs.com/package/type-fest)'s
[`ReadonlyDeep`](https://github.com/sindresorhus/type-fest/blob/main/source/readonly-deep.d.ts)
type. If you want this library to treat types wrapped in `ReadonlyDeep` as
immutable regardless, you can provide an override stating as such.

```ts
[{ pattern: /^ReadonlyDeep<.+>$/u, to: Immutableness.Immutable }]
```

### Limitations (when it comes to overrides)

#### "Rename" aliases

Currently we cannot process alias types that simply rename one alias to another.

For example, if we have the following code:

```ts
type A = { foo: "bar" };
type B = A; // This is a "rename" alias.
```

We cannot override `B` to be treated differently to `A`.

This is because, internally, TypeScript discards `B` and just uses `A`.

## Caching

By default we use a global cache to speed up the calculation of multiple types'
immutableness. This prevents us from needing to calculate the immutableness of
the same types over and over again.

However, this cache assumes you are always using the same type checker. If you
need to use multiple (such as in a testing environment), this can lead to
issues. To prevent this, you can provide us with a custom cache (by passing a
`WeakMap`) to use or tell us to use a temporary cache (by passing `false`).
