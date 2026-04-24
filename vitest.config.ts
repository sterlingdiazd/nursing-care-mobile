import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, ".") },
      {
        find: "@/assets/images/icon.png",
        replacement: path.resolve(__dirname, "test/mocks/static-asset.ts"),
      },
      { find: "react-native", replacement: path.resolve(__dirname, "test/mocks/react-native.ts") },
      {
        find: /^react-native\/.+$/,
        replacement: path.resolve(__dirname, "test/mocks/react-native-subpath.ts"),
      },
    ],
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  optimizeDeps: {
    exclude: ["src/services/payrollService", "src/services/adminShiftsService", "src/services/adminPortalService"],
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
          "@testing-library/react-native",
          "@react-native-picker/picker",
          "react-native-worklets",
          "@react-navigation",
          "expo",
          "expo-router",
          "expo-constants",
          "expo-linking",
          "expo-web-browser",
          "react-native-safe-area-context",
          "src/services/payrollService",
          "src/services/payrollTypes",
          "src/services/adminShiftsService",
          "src/services/adminPortalService",
          "@/src/services/adminShiftsService",
          "@/src/services/adminPortalService",
        ],
      },
    },
  },
});
