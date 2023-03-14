# Changelog
All notable changes to this project will be documented in this file. Dates are displayed in UTC.

## [1.2.7](https://github.com/RebeccaStevens/is-immutable-type/compare/v1.2.6...v1.2.7) (2023-03-14)


### Bug Fixes

* **typeArgumentsToString:** use evaluated type if its name isn't available ([#101](https://github.com/RebeccaStevens/is-immutable-type/issues/101)) ([988f34a](https://github.com/RebeccaStevens/is-immutable-type/commit/988f34a8cf1676590805ed91c65eb8c6238affa4))
* use a recursion identity to test if a type has already been looked at ([#100](https://github.com/RebeccaStevens/is-immutable-type/issues/100)) ([fb2aaa5](https://github.com/RebeccaStevens/is-immutable-type/commit/fb2aaa59b8482c7b10501218f23a2dac049df449))

## [1.2.6](https://github.com/RebeccaStevens/is-immutable-type/compare/v1.2.5...v1.2.6) (2023-03-14)


### Bug Fixes

* remove @typescript-eslint/utils peerdep ([#99](https://github.com/RebeccaStevens/is-immutable-type/issues/99)) ([cbf0b7a](https://github.com/RebeccaStevens/is-immutable-type/commit/cbf0b7aeda2d421f946f6b0863e645a3f602639d))

## [1.2.5](https://github.com/RebeccaStevens/is-immutable-type/compare/v1.2.4...v1.2.5) (2023-03-11)


### Bug Fixes

* support for recursive types in the form `type Foo = ReadonlyArray<Foo>` ([#88](https://github.com/RebeccaStevens/is-immutable-type/issues/88)) ([a2582a7](https://github.com/RebeccaStevens/is-immutable-type/commit/a2582a74dd916df0f2241d482d1d673c06bdc502))

## [1.2.4](https://github.com/RebeccaStevens/is-immutable-type/compare/v1.2.3...v1.2.4) (2023-02-02)


### Bug Fixes

* improve calculation of immutability involving intersections ([2d86f3d](https://github.com/RebeccaStevens/is-immutable-type/commit/2d86f3dae7ef3540b3ad42c08e45c67b4aa4ab33)), closes [#40](https://github.com/RebeccaStevens/is-immutable-type/issues/40)
* increase the list of default overrides ([7dacc68](https://github.com/RebeccaStevens/is-immutable-type/commit/7dacc681eb2435cd9b36b24cae4df1366c3d0e0a)), closes [#41](https://github.com/RebeccaStevens/is-immutable-type/issues/41)

## [1.2.3](https://github.com/RebeccaStevens/is-immutable-type/compare/v1.2.2...v1.2.3) (2022-11-11)


### Bug Fixes

* support for circular index signatures ([8e13105](https://github.com/RebeccaStevens/is-immutable-type/commit/8e1310586a446b04d49fa552773aaa0fd34929df))

## [1.2.2](https://github.com/RebeccaStevens/is-immutable-type/compare/v1.2.1...v1.2.2) (2022-10-20)


### Bug Fixes

* detection of readonly modifier ([18070a8](https://github.com/RebeccaStevens/is-immutable-type/commit/18070a8319b2dd2cca7945e98e034f4decbe54ad))

## [1.2.1](https://github.com/RebeccaStevens/is-immutable-type/compare/v1.2.0...v1.2.1) (2022-10-19)


### Bug Fixes

* remove reliance on tsutils as it no longer seems to be maintained ([c759e91](https://github.com/RebeccaStevens/is-immutable-type/commit/c759e918144d23b4103a639afbd1623fdda1870b))

# [1.2.0](https://github.com/RebeccaStevens/is-immutable-type/compare/v1.1.0...v1.2.0) (2022-10-13)


### Features

* allow passing a TypeNode instead of a Type ([46160e8](https://github.com/RebeccaStevens/is-immutable-type/commit/46160e84c610cc02ebfcfb885aa23c6647b24d75))

# [1.1.0](https://github.com/RebeccaStevens/is-immutable-type/compare/v1.0.2...v1.1.0) (2022-10-12)


### Features

* add option `maxImmutability` to `getTypeImmutability` ([00449da](https://github.com/RebeccaStevens/is-immutable-type/commit/00449da9e9a528c787d1361068227e7b5fa7fa45))

## [1.0.2](https://github.com/RebeccaStevens/is-immutable-type/compare/v1.0.1...v1.0.2) (2022-10-04)


### Bug Fixes

* allow for overrides to test against the evaluated type ([21f8fa8](https://github.com/RebeccaStevens/is-immutable-type/commit/21f8fa8ef6441fd59bf53bbd0ce3df8a4c90a450))

## [1.0.1](https://github.com/RebeccaStevens/is-immutable-type/compare/v1.0.0...v1.0.1) (2022-10-04)


### Bug Fixes

* arguments as string sometimes being wrapped in double brackets <> ([32e69fb](https://github.com/RebeccaStevens/is-immutable-type/commit/32e69fbb86391a53c48f62c8f4dccee4fbaaa461))

# [1.0.0](https://github.com/RebeccaStevens/is-immutable-type/compare/v0.0.7...v1.0.0) (2022-09-24)

## [0.0.7](https://github.com/RebeccaStevens/is-immutable-type/compare/v0.0.6...v0.0.7) (2022-09-15)


### Bug Fixes

* improve ImmutablenessOverrides XOR typings ([175a0fc](https://github.com/RebeccaStevens/is-immutable-type/commit/175a0fce1da0893731e5843c3d473b857af8f9d3))
* simplify early escape of override ([f28ac12](https://github.com/RebeccaStevens/is-immutable-type/commit/f28ac1270d19ef7918f03fa52807a939b3270838))
