import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Get the intended boolean value from the given string.
 */
function getBoolean(value: string | undefined) {
  if (value === undefined) {
    return false;
  }
  const asNumber = Number(value);
  return Number.isNaN(asNumber)
    ? Boolean(String(value).toLowerCase().replace("false", ""))
    : Boolean(asNumber);
}

const testLimitations = getBoolean(process.env["TEST_LIMITATIONS"]);

export default defineConfig({
  plugins: [tsconfigPaths()],

  test: {
    include: ["./**/*.test.ts"],
    exclude: [
      "dist",
      "node_modules",
      ...(testLimitations ? [] : ["tests/limitations.test.ts"]),
    ],
    coverage: {
      all: true,
      include: ["src"],
      exclude: ["dist"],
      reporter: ["lcov", "text"],
      watermarks: {
        lines: [80, 95],
        functions: [80, 95],
        branches: [80, 95],
        statements: [80, 95],
      },
    },
  },
});
