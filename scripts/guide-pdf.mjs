#!/usr/bin/env node
// docs/GUIDE-BACK-OFFICE.md printed to docs/GUIDE-BACK-OFFICE.pdf (P-04):
// the Markdown turned into a printable page (charte D, Sora with an Arial
// fallback), then printed by the Chromium of Playwright, already installed
// for the E2E tests. No Markdown library in the project: the converter below
// covers what the guide uses, and nothing else (headings, paragraphs, bold,
// links, ordered and unordered lists, tables, blockquotes).
// Usage: npm run guide:pdf [-- source.md target.pdf]
// PLAYWRIGHT_CHROMIUM_PATH: another Chromium than the one of Playwright (as
// playwright.config.ts).
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, process.argv[2] ?? "docs/GUIDE-BACK-OFFICE.md");
const target = resolve(root, process.argv[3] ?? "docs/GUIDE-BACK-OFFICE.pdf");
const fonts = join(root, "leenkey/offers/fonts");

const escapeHtml = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** French punctuation never starts or ends a line alone: « mot », mot : mot. */
const typography = (text) => text.replace(/« /g, "«\u00A0").replace(/ ([»:;?!%])/g, "\u00A0$1");

/** Bold and links of a line; a web address written bare stays text. */
function inline(text) {
  return escapeHtml(typography(text))
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

/** The anchor GitHub gives a heading: the table of contents links to it. */
function slug(heading) {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
}

const cells = (row) =>
  row
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());

const BLOCK_START = /^(#{1,3} |> ?|\| |[-*] |\d+\. )/;

function toHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let i = 0;
  /** The lines of a block, its marker removed. */
  const take = (marker) => {
    const taken = [];
    while (i < lines.length && marker.test(lines[i])) taken.push(lines[i++].replace(marker, ""));
    return taken;
  };
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i += 1;
      continue;
    }
    const heading = /^(#{1,3}) (.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level} id="${slug(heading[2])}">${inline(heading[2])}</h${level}>`);
      i += 1;
    } else if (/^> ?/.test(line)) {
      html.push(`<blockquote><p>${inline(take(/^> ?/).join(" "))}</p></blockquote>`);
    } else if (/^\| /.test(line)) {
      const [head, , ...body] = take(/^(?=\|)/).map(cells);
      html.push(
        `<table><thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead>`,
        `<tbody>${body
          .map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table>`,
      );
    } else if (/^[-*] /.test(line) || /^\d+\. /.test(line)) {
      const ordered = /^\d/.test(line);
      const items = take(ordered ? /^\d+\. / : /^[-*] /);
      const tag = ordered ? "ol" : "ul";
      html.push(`<${tag}>${items.map((item) => `<li>${inline(item)}</li>`).join("")}</${tag}>`);
    } else {
      const text = [];
      while (i < lines.length && lines[i].trim() !== "" && !BLOCK_START.test(lines[i])) {
        text.push(lines[i++]);
      }
      html.push(`<p>${inline(text.join(" "))}</p>`);
    }
  }
  return html.join("\n");
}

const font = (weight) =>
  `@font-face { font-family: "Sora"; font-weight: ${weight}; src: url("${pathToFileURL(join(fonts, `Sora-${weight}.ttf`)).href}"); }`;

const page = (title, body) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
${[400, 600, 700].map(font).join("\n")}
:root { --night: #020D21; --blue: #2563EB; --ink: #1E293B; --muted: #64748B; --line: #E2E8F0; --tint: #EFF4FF; }
* { box-sizing: border-box; }
html { font-family: "Sora", Arial, sans-serif; font-size: 10pt; line-height: 1.55; color: var(--ink); }
body { margin: 0; }
h1, h2, h3 { color: var(--night); line-height: 1.25; break-after: avoid; }
h1 { font-size: 24pt; font-weight: 700; margin: 0 0 4pt; }
h1 + p { color: var(--muted); margin: 0 0 18pt; padding-bottom: 14pt; border-bottom: 2pt solid var(--blue); }
h2 { font-size: 15pt; font-weight: 700; margin: 24pt 0 8pt; padding-top: 10pt; border-top: 1pt solid var(--line); }
h1 + p + h2 { margin-top: 0; padding-top: 0; border-top: 0; }
h3 + p { break-after: avoid; }
h3 { font-size: 11pt; font-weight: 600; color: var(--blue); margin: 14pt 0 4pt; }
p { margin: 0 0 7pt; }
strong { font-weight: 600; color: var(--night); }
a { color: var(--blue); text-decoration: none; }
ul, ol { margin: 0 0 8pt; padding-left: 16pt; }
li { margin-bottom: 3pt; break-inside: avoid; }
ol > li::marker { font-weight: 600; color: var(--blue); }
ul > li::marker { color: var(--blue); }
blockquote { margin: 8pt 0 10pt; padding: 8pt 12pt; background: var(--tint); border-left: 3pt solid var(--blue); border-radius: 0 6pt 6pt 0; break-inside: avoid; }
blockquote p { margin: 0; }
table { width: 100%; border-collapse: collapse; margin: 6pt 0 12pt; font-size: 9.5pt; }
th { text-align: left; font-weight: 600; color: #fff; background: var(--night); padding: 6pt 8pt; }
td { padding: 6pt 8pt; border-bottom: 1pt solid var(--line); vertical-align: top; }
td:first-child { font-weight: 600; color: var(--night); white-space: nowrap; }
tr { break-inside: avoid; }
</style>
</head>
<body>
${body}
</body>
</html>`;

const markdown = await readFile(source, "utf8");
const title = /^# (.+)$/m.exec(markdown)?.[1] ?? "Guide";
const folder = await mkdtemp(join(tmpdir(), "guide-pdf-"));
const htmlFile = join(folder, "guide.html");
await writeFile(htmlFile, page(title, toHtml(markdown)));

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
try {
  const tab = await browser.newPage();
  await tab.goto(pathToFileURL(htmlFile).href);
  await tab.evaluate(() => document.fonts.ready);
  await tab.pdf({
    path: target,
    format: "A4",
    printBackground: true,
    margin: { top: "18mm", right: "18mm", bottom: "20mm", left: "18mm" },
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="width:100%;padding:0 18mm;font-family:Arial,sans-serif;font-size:8pt;color:#64748B;display:flex;justify-content:space-between;"><span>${escapeHtml(title)}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  });
} finally {
  await browser.close();
  await rm(folder, { recursive: true, force: true });
}
console.log(`${target} written.`);
