import rollupPluginJSON from "@rollup/plugin-json";
import rollupPluginNodeResolve from "@rollup/plugin-node-resolve";
import rollupPluginTypescript from "@rollup/plugin-typescript";
import { defineConfig, type Plugin } from "rollup";
import rollupPluginAutoExternal from "rollup-plugin-auto-external";
import rollupPluginDts from "rollup-plugin-dts";
import rollupPluginUassert from "rollup-plugin-unassert";

import pkg from "./package.json" assert { type: "json" };

/**
 * Get new instances of all the common plugins.
 */
function getPlugins(): Plugin[] {
  return [
    rollupPluginAutoExternal() as unknown as Plugin,
    rollupPluginNodeResolve(),
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
  ];
}

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

const cjs = defineConfig({
  ...common,

  output: {
    ...common.output,
    file: pkg.main,
    format: "cjs",
  },

  plugins: getPlugins(),
});

const esm = defineConfig({
  ...common,

  output: {
    ...common.output,
    file: pkg.module,
    format: "esm",
  },

  plugins: getPlugins(),
});

const dts = defineConfig({
  ...common,

  output: [
    {
      file: pkg.exports.types.import,
      format: "esm",
    },
    {
      file: pkg.exports.types.require,
      format: "cjs",
    },
  ],

  plugins: [
    rollupPluginTypescript({
      tsconfig: "tsconfig.build.json",
    }),
    rollupPluginDts(),
  ],
});

export default [cjs, esm, dts];
