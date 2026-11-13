// Regenerates src/content/images.ts from public/images/stock/MANIFEST.json.
// Run: node scripts/gen-image-index.mjs
import { readFileSync, writeFileSync } from "node:fs";
const m = JSON.parse(readFileSync(new URL("../public/images/stock/MANIFEST.json", import.meta.url), "utf8"));
const keep = ["slug", "src", "width", "height", "alt", "author", "license", "licenseUrl", "sourceUrl", "sourceTitle"];
const lines = m.images.map((i) => `  ${i.slug.replace(/-/g, "_")}: ${JSON.stringify(Object.fromEntries(keep.map((k) => [k, i[k]])))},`);
writeFileSync(new URL("../src/content/images.ts", import.meta.url), `// AUTO-GENERATED from public/images/stock/MANIFEST.json by scripts/gen-image-index.mjs — illustrative stock photography.
// None of these images show BuildGhana projects, clients or listed properties. Always render with the illustrative label.

export type StockImage = { slug: string; src: string; width: number; height: number; alt: string; author: string; license: string; licenseUrl: string; sourceUrl: string; sourceTitle: string };

export const stock = {
${lines.join("\n")}
} satisfies Record<string, StockImage>;

export type StockKey = keyof typeof stock;
export const allStock: StockImage[] = Object.values(stock);
`);
console.log(`images.ts: ${m.images.length} images`);
