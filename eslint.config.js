// @ts-check
import rsEslint from "@rebeccastevens/eslint-config";

export default rsEslint(
  {
    projectRoot: import.meta.dirname,
    mode: "library",
    typescript: {
      unsafe: "off",
    },
    formatters: true,
    functional: false,
    jsonc: true,
    markdown: true,
    stylistic: true,
    yaml: true,
  },
  {
    rules: {
      "import/extensions": "off", // Not releasing to JSR.
      "unicorn/no-instanceof-builtins": "off", // TODO: Look into whether we should change use of instanceof checks.
      "test/prefer-lowercase-title": "off",
    },
  },
);
