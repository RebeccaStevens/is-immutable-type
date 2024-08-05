import rollupPluginReplace from "@rollup/plugin-replace";
import { rollupPlugin as rollupPluginDeassert } from "deassert";
import type { RollupOptions } from "rollup";
import rollupPluginTs from "rollup-plugin-ts";

import pkg from "./package.json" with { type: "json" };

const treeshake = {
  annotations: true,
  moduleSideEffects: [],
  propertyReadSideEffects: false,
  unknownGlobalSideEffects: false,
} satisfies RollupOptions["treeshake"];

const library = {
  input: "src/index.ts",

  output: [
    {
      file: pkg.exports.import,
      format: "esm",
      sourcemap: false,
    },
    {
      file: pkg.exports.require,
      format: "cjs",
      sourcemap: false,
    },
  ],

  external: [
    ...Object.keys(pkg.dependencies),
    ...Object.keys(pkg.peerDependencies),
  ],

  plugins: [
    rollupPluginTs({
      transpileOnly: true,
      tsconfig: "tsconfig.build.json",
    }),
    rollupPluginReplace({
      values: {
        "import.meta.vitest": "undefined",
      },
      preventAssignment: true,
    }),
    rollupPluginDeassert({
      include: ["**/*.{js,ts}"],
    }),
  ],

  treeshake,
} satisfies RollupOptions;

export default [library];
