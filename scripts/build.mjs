// Bundles src/tempo-card.js into the single dashboard resource dist/tempo-card.js.
// Usage: node scripts/build.mjs  (dist/ is not committed: CI and the release workflow build it)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { splitDist } from "./i18n-split.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const pkg = JSON.parse(readFileSync(`${root}package.json`, "utf8"));

const out = readFileSync(`${root}src/tempo-card.js`, "utf8").replace("__VERSION__", pkg.version);

mkdirSync(`${root}dist`, { recursive: true });
writeFileSync(`${root}dist/tempo-card.js`, out);
console.log(`Built dist/tempo-card.js (${(out.length / 1024).toFixed(1)} KB)`);

// Translations: English stays in the bundle, each other language goes to dist/tempo-card.i18n.<lang>.js,
// fetched when a card needs it (scripts/i18n-split.mjs).
if (process.argv[1] === fileURLToPath(import.meta.url)) splitDist(`${root}dist`, "tempo-card.js", { version: pkg.version });
