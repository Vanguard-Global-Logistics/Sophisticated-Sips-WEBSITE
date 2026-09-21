import { defineConfig } from "vitest/config";

/**
 * The site's own suite is the three files in `tests/`. Without this config
 * vitest's default glob also walks `tools/`, which carries its own self-
 * contained package and test suite, and the site's run would report a test
 * count that has nothing to do with the site.
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
