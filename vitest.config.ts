import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  optimizeDeps: {
    exclude: ["src/services/payrollService"],
  },
  esbuild: {
    target: "es2022",
    jsx: "automatic",
  },
  test: {
    globals: true,
    setupFiles: ["./setupTests.ts"],
    environmentMatchGlobs: [
      ["**/*.test.ts", "node"],
      ["**/*.{test,spec}.{ts,tsx}", "jsdom"],
      ["**/components/**/*.{test,spec}.{js,jsx}", "jsdom"],
    ],
    server: {
      deps: {
        inline: [
          "react-native",
          "@testing-library/react-native",
          "expo",
          "expo-router",
          "expo-constants",
          "expo-linking",
          "react-native-safe-area-context",
          "src/services/payrollService",
          "src/services/payrollTypes",
        ],
      },
    },
  },
});
