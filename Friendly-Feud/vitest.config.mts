import { defineConfig } from "vitest/config";

// Unit tests only; Playwright e2e specs live in ./e2e and are run separately.
export default defineConfig({
  // Skip loading the app's PostCSS/Tailwind config; unit tests don't touch CSS.
  css: { postcss: { plugins: [] } },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
