#!/usr/bin/env node
/**
 * Blocks physical-direction Tailwind utilities so RTL/LTR stay mirrored.
 * Use logical ones instead: ms-/me-/ps-/pe-/start-/end-/text-start/text-end,
 * border-s/border-e, rounded-s/rounded-e.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src"];
const BANNED =
  /(?<![\w-])-?(?:ml|mr|pl|pr|left|right|text-left|text-right|border-l|border-r|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br|scroll-ml|scroll-mr)-[\w[\]./%-]+|(?<![\w-])(?:text-left|text-right|float-left|float-right)(?![\w-])/g;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(tsx|ts|jsx|js|css)$/.test(name)) yield p;
  }
}

let failures = 0;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      // Only inspect class strings.
      const classChunks = line.match(/className=(?:"[^"]*"|\{`[^`]*`\})|class(?:Name)?:\s*"[^"]*"/g) ?? [];
      for (const chunk of classChunks) {
        for (const m of chunk.matchAll(BANNED)) {
          failures++;
          console.error(`${file}:${i + 1}  "${m[0]}" → use a logical utility (ms-/me-/ps-/pe-/start-/end-/text-start/text-end)`);
        }
      }
    });
  }
}
if (failures) {
  console.error(`\n✖ ${failures} physical-direction class(es) found`);
  process.exit(1);
}
console.log("✔ RTL lint: no physical-direction utilities");
