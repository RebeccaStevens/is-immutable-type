const avaConfig = {
  files: ["tests/**/*.test.*", "!tests/limitations.test.ts"],
  timeout: "5m",
  extensions: {
    ts: "module",
  },
  nodeArguments: [
    "--no-warnings=ExperimentalWarning",
    "--loader=ts-paths-esm-loader/transpile-only",
    "--experimental-specifier-resolution=node",
  ],
};

export default avaConfig;
