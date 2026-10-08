import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".next",
      "node_modules",
      "public",
      "docs",
      "playwright-report",
      "test-results",
      "next-env.d.ts",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "react-hooks": reactHooks,
      "@next/next": nextPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@typescript-eslint/no-unused-vars": "off",
      // Service role client: only webhooks, crons and admin actions (CLAUDE.md section 14).
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/admin",
              message: "Service role: webhooks, cron and leenkey/admin/actions.ts only.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["app/api/webhooks/**", "app/api/cron/**", "leenkey/admin/actions.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  eslintPluginPrettier,
);
