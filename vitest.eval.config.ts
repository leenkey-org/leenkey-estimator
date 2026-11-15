import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Evaluations against the real model (`npm run ai:eval-search`, L2-06): never
// part of `npm run test` nor of the CI, they need ANTHROPIC_API_KEY and are
// billed. One at a time: the requests of an evaluation share the cached prompt.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: {
    include: ["tests/eval/**/*.eval.test.ts"],
    environment: "node",
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
