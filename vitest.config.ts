import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    server: {
      deps: {
        inline: [
          "react-native",
          "@testing-library/react-native",
          "expo",
          "expo-router",
          "expo-constants",
          "react-native-safe-area-context",
        ],
      },
    },
  },
});

