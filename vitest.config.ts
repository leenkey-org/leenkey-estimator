import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  // React 17+ JSX transform, as Next.js compiles it (the email templates are TSX).
  esbuild: { jsx: "automatic" },
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
});
