import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/__tests__/**",
        "src/app/layout.tsx",
        "src/app/**/page.tsx",
      ],
      thresholds: {
        // Threshold enforcement starts strict on core layers; relax UI
        // when component tests land in P6.
        "src/domain/**": { lines: 90, branches: 85, functions: 90 },
        "src/data-sources/**": { lines: 85, branches: 80, functions: 85 },
        "src/state/**": { lines: 85, branches: 80, functions: 85 },
      },
    },
  },
});
