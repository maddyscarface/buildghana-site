import { createHash } from "node:crypto";

/** SHA-256 hex of a normalised value, as required by Meta CAPI and Google enhanced conversions. */
export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export const normEmail = (e: string) => e.trim().toLowerCase();
/** E.164 digits only, no "+" (Meta format). */
export const normPhone = (p: string) => p.replace(/[^0-9]/g, "").replace(/^0+/, "");
export const normName = (n: string) => n.trim().toLowerCase().replace(/[^\p{L}]/gu, "");
