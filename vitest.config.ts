import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vitest 4 bundles with Rolldown/oxc (esbuild options no longer apply)
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    include: ["lib/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      exclude: ["lib/**/*.test.ts"],
    },
  },
});
