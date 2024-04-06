# Changelog
All notable changes to this project will be documented in this file. Dates are displayed in UTC.

## [2.0.6](https://github.com/RebeccaStevens/is-immutable-type/compare/v2.0.5...v2.0.6) (2024-04-06)


### Bug Fixes

* update type-to-string ([8d4d9ce](https://github.com/RebeccaStevens/is-immutable-type/commit/8d4d9ce1e8a603145ddd66c6e6af9ec99dc6fe2d))

## [2.0.5](https://github.com/RebeccaStevens/is-immutable-type/compare/v2.0.4...v2.0.5) (2024-04-04)


### Bug Fixes

* improve comparison of file paths ([ce76598](https://github.com/RebeccaStevens/is-immutable-type/commit/ce7659890323c68ba748e2aeb6e4b1df432dc054))

## [2.0.4](https://github.com/RebeccaStevens/is-immutable-type/compare/v2.0.3...v2.0.4) (2024-03-22)


### Bug Fixes

* regression in getting a type's name ([3864987](https://github.com/RebeccaStevens/is-immutable-type/commit/386498737a43a61102f66f12001db844de22d115))

## [2.0.3](https://github.com/RebeccaStevens/is-immutable-type/compare/v2.0.2...v2.0.3) (2024-03-22)


### Bug Fixes

* infinite loop in typeToString ([4f87951](https://github.com/RebeccaStevens/is-immutable-type/commit/4f87951d31b2cdd88437ded094390b0c95fff217))
* remove another infinate loop ([c36259c](https://github.com/RebeccaStevens/is-immutable-type/commit/c36259ce0e7410da4b92b5c2608dfe73003f341d))

## [2.0.2](https://github.com/RebeccaStevens/is-immutable-type/compare/v2.0.1...v2.0.2) (2024-03-19)


### Performance Improvements

* switch to using an iterative stack ([#394](https://github.com/RebeccaStevens/is-immutable-type/issues/394)) ([2858ad3](https://github.com/RebeccaStevens/is-immutable-type/commit/2858ad3e7432cac5db02287c3eaaf1c3fa299441))

## [2.0.1](https://github.com/RebeccaStevens/is-immutable-type/compare/v2.0.0...v2.0.1) (2023-07-15)


### Bug Fixes

* type name not matching specifier when it needs to be evaluated ([c42bb73](https://github.com/RebeccaStevens/is-immutable-type/commit/c42bb73dd6c1a15ba15fbd9dc6594db413d44162))

# [2.0.0](https://github.com/RebeccaStevens/is-immutable-type/compare/v1.2.9...v2.0.0) (2023-07-15)


* Next Major (#128) ([b76b2b7](https://github.com/RebeccaStevens/is-immutable-type/commit/b76b2b7e5b48e37e77b55608b4e3fa1bea168e9d)), closes [#128](https://github.com/RebeccaStevens/is-immutable-type/issues/128) [#47](https://github.com/RebeccaStevens/is-immutable-type/issues/47)


### BREAKING CHANGES

* compatibility with typescript-eslint v6 is now required

## [1.2.9](https://github.com/RebeccaStevens/is-immutable-type/compare/v1.2.8...v1.2.9) (2023-03-20)


### Bug Fixes

* add eslint peer dependency ([#113](https://github.com/RebeccaStevens/is-immutable-type/issues/113)) ([05af716](https://github.com/RebeccaStevens/is-immutable-type/commit/05af7161fb7a58cd89a071a05ae77d439950362c))

## [1.2.8](https://github.com/RebeccaStevens/is-immutable-type/compare/v1.2.7...v1.2.8) (2023-03-14)


### Bug Fixes

* @typescript-eslint/type-utils is no longer a peer dependency ([#103](https://github.com/RebeccaStevens/is-immutable-type/issues/103)) ([c1793cc](https://github.com/RebeccaStevens/is-immutable-type/commit/c1793cc2e3f83ee13d1b56b70f0bf62285382ae1))

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
