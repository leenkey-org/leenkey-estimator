// Single source for the runtime environment. The code reads NEXT_PUBLIC_ENV,
// never NODE_ENV (CLAUDE.md section 4): a preview build is still NODE_ENV=production.
export type AppEnv = "local" | "staging" | "production";

export function appEnv(): AppEnv {
  const value = process.env.NEXT_PUBLIC_ENV;
  if (value === "staging" || value === "production") return value;
  return "local";
}

export const isProduction = (): boolean => appEnv() === "production";
export const isStaging = (): boolean => appEnv() === "staging";
