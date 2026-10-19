// Add missing keys to a locale file without touching existing ones.
// Usage: node scripts/i18n-merge.mjs <lang> <path-to-json-with-new-keys>
import { readFileSync, writeFileSync } from "node:fs";

const [lang, incomingPath] = process.argv.slice(2);
if (!lang || !incomingPath) {
  console.error("usage: node scripts/i18n-merge.mjs <lang> <incoming.json>");
  process.exit(1);
}
const file = new URL(`../public/locales/${lang}/translation.json`, import.meta.url);
const current = JSON.parse(readFileSync(file, "utf8"));
const incoming = JSON.parse(readFileSync(incomingPath, "utf8"));
let added = 0;
for (const [key, value] of Object.entries(incoming)) {
  if (!(key in current)) {
    current[key] = value;
    added++;
  }
}
writeFileSync(file, JSON.stringify(current, null, 2) + "\n");
console.log(`${lang}: added ${added} key(s)`);
