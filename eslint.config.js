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
      "test/prefer-lowercase-title": "off",
    },
  },
);
