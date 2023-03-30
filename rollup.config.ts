import rollupPluginJSON from "@rollup/plugin-json";
import rollupPluginTypescript from "@rollup/plugin-typescript";
import { defineConfig, type Plugin } from "rollup";
import rollupPluginAutoExternal from "rollup-plugin-auto-external";
import rollupPluginDts from "rollup-plugin-dts";
import rollupPluginUassert from "rollup-plugin-unassert";

import pkg from "./package.json" assert { type: "json" };

const common = defineConfig({
  input: "src/index.ts",

  output: {
    sourcemap: false,
  },

  external: [],

  treeshake: {
    annotations: true,
    moduleSideEffects: [],
    propertyReadSideEffects: false,
    unknownGlobalSideEffects: false,
  },
});

const runtimes = defineConfig({
  ...common,

  output: [
    {
      ...common.output,
      file: pkg.exports.import,
      format: "esm",
    },
    {
      ...common.output,
      file: pkg.exports.require,
      format: "cjs",
    },
  ],

  plugins: [
    rollupPluginAutoExternal(),
    rollupPluginTypescript({
      tsconfig: "tsconfig.build.json",
    }),
    rollupPluginUassert({
      include: ["**/*.ts"],
      importPatterns: [
        'import assert from "node:assert"',
        'import * as assert from "node:assert"',
      ],
    }),
    rollupPluginJSON({
      preferConst: true,
    }),
  ],
});

const types = defineConfig({
  ...common,

  output: [
    {
      ...common.output,
      file: pkg.exports.types.import,
      format: "esm",
    },
    {
      ...common.output,
      file: pkg.exports.types.require,
      format: "cjs",
    },
  ],

  plugins: [
    rollupPluginTypescript({
      tsconfig: "tsconfig.build.json",
    }),
    rollupPluginDts(),
  ] as Plugin[],
});

export default [runtimes, types];
