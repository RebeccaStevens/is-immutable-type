<div align="center">

# is-immutable-type

[![npm version](https://img.shields.io/npm/v/is-immutable-type.svg)](https://www.npmjs.com/package/is-immutable-type)
[![Release](https://github.com/RebeccaStevens/is-immutable-type/actions/workflows/release.yml/badge.svg)](https://github.com/RebeccaStevens/is-immutable-type/actions/workflows/release.yml)
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

# Install with pnpm
pnpm add is-immutable-type
```

# Usage

```ts
import {
  Immutability,
  getTypeImmutability,
  isReadonlyDeep,
  isUnknown,
} from "is-immutable-type";
import { hasType } from "ts-api-utils";
import type ts from "typescript";

function example(program: ts.Program, node: ts.Node) {
  const typeNodeOrType = hasType(node)
    ? // Use the TypeNode if it's avaliable.
      node.type
    : // Otherwise, get the Type.
      program.getTypeChecker().getTypeAtLocation(node);

  const immutability = getTypeImmutability(program, typeNodeOrType);

  if (isUnknown(immutability)) {
    console.log("`immutability` is `Unknown`");
  } else if (isReadonlyDeep(immutability)) {
    console.log("`immutability` is `ReadonlyDeep` or `Immutable`");
  } else {
    console.log("`immutability` is `ReadonlyShallow` or `Mutable`");
  }
}
```

Tip: You can also use comparator expressions (such as `>` and `<`) to compare
`Immutability`.\
Note: `Immutability.Unknown` will always return `false` when used in a
comparator expression. This includes `===` - use `isUnknown()` if you need to
test if a value is `Unknown`.

# Immutability

## Definitions

- `Immutable`: Everything is deeply read-only and nothing can be modified.
- `ReadonlyDeep`: The data is deeply immutable but methods are not.
- `ReadonlyShallow`: The data is shallowly immutable, but at least one deep value is not.
- `Mutable`: The data is shallowly mutable.
- `Unknown`: We couldn't determine the immutability of the type.

Note: `Calculating` is used internally to mean that we are still calculating the
immutability of the type. You shouldn't ever need to use this value.

## Overrides

Sometimes we cannot correctly tell what a type's immutability is supposed to be
just by analyzing its type makeup. One common reason for this is because methods
may modify internal state and we cannot tell this just by the method's type. For
this reason, we allow types to be overridden.

To override a type, pass an overrides array of all the override objects you want
to use to your function call.\
An override object consists of a `type`, a `to` and optionally a `from`
property. The `type` property specifies the type that will be overridden.\
The `to` property specifies the new immutability value that will be used.\
The `from` property, if given, will limit when the override is applied to when
the calculated immutability is between the `to` value and this value
(inclusively).

The `type` is specified with a `TypeSpecifier`.\
This can either be a `string` that will match against the type's name or a regex
pattern that will match against the type's name and any type arguments.\
Additionally, you can specify where the type needs to come from for it to be
overridden.\
To do this, use an object, with either a `name` or `pattern` value; and a `from`
property. This `from` property specifies where the type needs to come from,
either `lib` (TypeScript's lib), `package` (a node_modules package), or `file`
(a local file).

### Example 1

Always treat TypeScript's `ReadonlyArray`s as `Immutable`.

```ts
[
  {
    type: { from: "lib", name: "ReadonlyArray" },
    to: Immutability.Immutable,
  },
];
```

### Example 2

Treat TypeScript's `ReadonlyArray`s as `Immutable` instead of `ReadonlyDeep`.
But if the instance type was calculated as `ReadonlyShallow`, it will stay as
such.

```ts
[
  {
    type: { from: "lib", name: "ReadonlyArray" },
    to: Immutability.Immutable,
    from: Immutability.ReadonlyDeep,
  },
];
```

### Default Overrides

By default, the following TypeScript lib types are overridden to be `Mutable`:

- `Map`
- `Set`
- `Date`
- `URL`
- `URLSearchParams`

If you know of any other TypeScript lib types that need to be overridden,
please open an issue.

Note: When providing custom overrides, the default ones will not be used. Be
sure to include the default overrides in your custom overrides if you don't want
to lose them. You can obtain them with `getDefaultOverrides()`.

### Another Use for Overrides

Currently, due to limitations in TypeScript, it is impossible to write a utility
type that will transform any given type to an immutable version of it in all
cases. ([See this issue](https://github.com/microsoft/TypeScript/issues/29732))

One popular implementation of such a utility type is
[type-fest](https://www.npmjs.com/package/type-fest)'s
[`ReadonlyDeep`](https://github.com/sindresorhus/type-fest/blob/main/source/readonly-deep.d.ts)
type. If you want this library to treat types wrapped in `ReadonlyDeep` as
immutable regardless, you can provide an override stating as such.

```ts
[
  {
    type: {
      from: "package",
      package: "type-fest",
      pattern: /^ReadonlyDeep<.+>$/u,
    },
    to: Immutability.Immutable,
  },
];
```

## Caching

By default, we use a global cache to speed up the calculation of multiple types'
immutability. This prevents us from needing to calculate the immutability of
the same types over and over again.

However, this cache assumes you are always using the same type checker. If you
need to use multiple (such as in a testing environment), this can lead to
issues. To prevent this, you can provide a custom cache (by passing a `WeakMap`)
to be used or have a temporary cache be used (by passing `false`).

## Making `ReadonlyDeep` types `Immutable`

Many types that you may expect to be immutable (including those defined
internally by TypeScript itself) are not written with immutable methods and thus
are not reported as immutable by this library. Luckily it is quite easy to make
such type immutable. Just simply wrap them in `Readonly`.

### Example

These types are `ReadonlyDeep`:

```ts
type Foo = ReadonlySet<string>;
type Bar = ReadonlyMap<string, number>;
```

While these types are `Immutable`:

```ts
type Foo = Readonly<ReadonlySet<string>>;
type Bar = Readonly<ReadonlyMap<string, number>>;
```

However, it should be noted that this does not work for arrays. TypeScript will
treat `Readonly<Array<T>>` exactly the same as `ReadonlyArray<T>` and
as a consequence `Readonly<ReadonlyArray<T>>` is also treated the same.

In order to get around this, we need to slightly tweak the `Readonly` definition
like so:

```ts
type ImmutableShallow<T extends {}> = {
  readonly [P in keyof T & {}]: T[P];
};
```

Now the following will correctly be marked as `Immutable`.

<!-- eslint-disable ts/array-type -->

```ts
type Foo = ImmutableShallow<readonly string[]>;
type Bar = ImmutableShallow<ReadonlyArray<string>>;
```

Note: `ImmutableShallow<string[]>` will also be marked as immutable but the type
will still have methods such as `push` and `pop`. Be sure to pass a readonly
array to `ImmutableShallow` to prevent this.
