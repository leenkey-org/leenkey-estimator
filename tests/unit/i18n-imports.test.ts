import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// P-06: the texts are imported by part (lib/i18n/sections). The whole of
// them (lib/i18n/fr.ts, lib/i18n/site.ts, about 250 kB with the legal
// texts) reaches the browser as soon as one module of the browser imports
// it, directly or through a shared module: no module of the site does, only
// the tests. The legal texts stay out of the modules of the browser.

const ROOTS = ["app", "components", "core", "emails", "leenkey", "lib"];
const WHOLE = /from "@\/lib\/i18n\/(fr|site)"/;
const LEGAL = /from "@\/lib\/i18n\/sections\/legal"/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("imports of the texts", () => {
  const sources = ROOTS.flatMap(files).map((path) => ({
    path,
    text: readFileSync(path, "utf8"),
  }));

  it("no module of the site imports all the texts", () => {
    expect(sources.filter(({ text }) => WHOLE.test(text)).map(({ path }) => path)).toEqual([]);
  });

  it("no module of the browser imports the legal texts", () => {
    const client = sources.filter(({ text }) => /^["']use client["'];/m.test(text));
    expect(client.filter(({ text }) => LEGAL.test(text)).map(({ path }) => path)).toEqual([]);
  });
});
