import rollupPluginReplace from "@rollup/plugin-replace";
import rollupPluginTypescript from "@rollup/plugin-typescript";
import { rollupPlugin as rollupPluginDeassert } from "deassert";
import type { RollupOptions } from "rollup";
import generateDtsBundle from "rollup-plugin-dts-bundle-generator-2";

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
      importAttributesKey: "with",
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
    rollupPluginTypescript({
      tsconfig: "tsconfig.build.json",
      outDir: "dist",
      declaration: false,
      declarationMap: false,
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
    generateDtsBundle({
      compilation: {
        preferredConfigPath: "tsconfig.build.json",
      },
      output: {
        exportReferencedTypes: false,
        inlineDeclareExternals: true,
      },
    }),
  ],

  treeshake,
} satisfies RollupOptions;

export default [library];
