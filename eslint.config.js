// @ts-check
import rsEslint from "@rebeccastevens/eslint-config";

export default rsEslint(
  {
    mode: "library",
    typescript: {
      tsconfig: "tsconfig.eslint.json",
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
