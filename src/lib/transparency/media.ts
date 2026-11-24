/**
 * Upload validation + synthetic placeholder evidence. File type comes from magic bytes, never the
 * filename or the browser's claimed MIME. No malware scanner is connected: uploads are marked `not_scanned`.
 */
export const CHUNK_BYTES = 256 * 1024;
export const LIMITS = { image: 12 * 1024 * 1024, video: 40 * 1024 * 1024 } as const;
export const MAX_MEDIA_PER_REPORT = 12;

export type Sniffed = { mime: string; kind: "image" | "video" } | null;

export function sniff(head: Uint8Array): Sniffed {
  const b = head;
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x);
  if (b.length >= 3 && at(0, 0xff, 0xd8, 0xff)) return { mime: "image/jpeg", kind: "image" };
  if (b.length >= 8 && at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { mime: "image/png", kind: "image" };
  if (b.length >= 12 && at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return { mime: "image/webp", kind: "image" };
  if (b.length >= 12 && at(4, 0x66, 0x74, 0x79, 0x70)) {
    const brand = String.fromCharCode(...b.slice(8, 12));
    if (["heic", "heix", "mif1", "msf1", "hevc"].includes(brand)) return { mime: "image/heic", kind: "image" };
    if (brand === "qt  ") return { mime: "video/quicktime", kind: "video" };
    return { mime: "video/mp4", kind: "video" };
  }
  if (b.length >= 4 && at(0, 0x1a, 0x45, 0xdf, 0xa3)) return { mime: "video/webm", kind: "video" };
  return null;
}

export function declaredKind(mime: string): "image" | "video" | null {
  if (/^image\/(jpeg|png|webp|heic|heif)$/.test(mime)) return "image";
  if (/^video\/(mp4|quicktime|webm)$/.test(mime)) return "video";
  return null;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/**
 * Synthetic evidence tile. Deliberately a diagram, not a photograph: the demo never presents fabricated
 * site photography as proof. Every tile carries the words "SYNTHETIC DEMO".
 */
export function placeholderSvg(o: { title: string; stage: string; reportCode: string; tone: number }): string {
  const tones = ["#2c4d3a", "#203b2c", "#3d5a45", "#4a5f3a", "#5b4a2c", "#2f4a52"];
  const bg = tones[o.tone % tones.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" role="img" aria-label="Synthetic demo evidence placeholder: ${esc(o.title)}">
<rect width="800" height="600" fill="${bg}"/>
<g stroke="#d6aa64" stroke-opacity=".35" fill="none" stroke-width="2">
<path d="M80 470h640M120 470V250h240v220M360 330h240v140M150 250l90-80 90 80"/>
<path d="M160 300h40v40h-40zM260 300h40v40h-40zM400 370h40v40h-40zM500 370h40v40h-40z"/>
</g>
<rect x="0" y="0" width="800" height="64" fill="#12291f" fill-opacity=".85"/>
<text x="24" y="41" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#d6aa64">SYNTHETIC DEMO · not a site photograph</text>
<text x="24" y="530" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#f7f3eb">${esc(o.title)}</text>
<text x="24" y="566" font-family="Arial, sans-serif" font-size="18" fill="#f7f3eb" fill-opacity=".8">${esc(o.reportCode)} · ${esc(o.stage)}</text>
</svg>`;
}
