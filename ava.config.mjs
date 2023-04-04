const avaConfig = {
  files: ["tests/**/*.test.*", "!tests/limitations.test.ts"],
  timeout: "5m",
  extensions: {
    ts: "module",
  },
  nodeArguments: [
    "--no-warnings",
    "--loader=ts-node/esm/transpile-only",
    "--experimental-specifier-resolution=node",
  ],
};

export default avaConfig;
