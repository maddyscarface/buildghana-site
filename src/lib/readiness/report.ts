import "server-only";
import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage } from "pdf-lib";
import { readiness, reviewAreas, documentInventory } from "@/config/readiness";
import { labelFor, ghanaRegions, projectStages, budgetRanges } from "@/lib/lead/options";
import { acquisitionRoutes, titleStatuses as titleDocStatuses, intendedUses } from "@/config/readiness";
import { titleStatement, titleStatusLabel, type ReadinessCase, type Rating } from "./model";
import { site } from "@/config/site";

/**
 * Branded Readiness Review report (server-side PDF). Draft until the case is delivered:
 * drafts carry a DRAFT watermark and "not for reliance" footer. Only counsel-recorded facts are
 * stated about title (see titleStatement).
 */
const FOREST = rgb(0x12 / 255, 0x29 / 255, 0x1f / 255);
const GOLD = rgb(0xd6 / 255, 0xaa / 255, 0x64 / 255);
const IVORY = rgb(0xf7 / 255, 0xf3 / 255, 0xeb / 255);
const INK = rgb(0x18 / 255, 0x24 / 255, 0x1c / 255);
const MUTED = rgb(0x5b / 255, 0x6a / 255, 0x5f / 255);
const RATING: Record<Rating, { label: string; color: ReturnType<typeof rgb> }> = {
  ready: { label: "READY", color: rgb(0.18, 0.45, 0.3) },
  attention: { label: "NEEDS ATTENTION", color: rgb(0.72, 0.52, 0.18) },
  not_ready: { label: "NOT READY", color: rgb(0.64, 0.25, 0.17) },
  not_assessed: { label: "NOT ASSESSED", color: rgb(0.45, 0.48, 0.46) },
};

// pdf-lib standard fonts are WinAnsi: strip characters they can't encode.
const clean = (s: string) => s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/\u2026/g, "...").replace(/[\u00B7\u2022]/g, "-").replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of clean(text).split("\n")) {
    let line = "";
    for (const w of para.split(/\s+/)) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > width && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
}

export async function renderReportPdf(c: ReadinessCase, opts: { final: boolean }): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${readiness.name} — ${c.contact.firstName} ${c.contact.lastName}`);
  pdf.setAuthor(site.name); pdf.setSubject(readiness.name); pdf.setCreator(site.name);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifIt = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 54, CW = W - 2 * M;
  let page: PDFPage; let y = 0; let pageNo = 0;

  const footer = (p: PDFPage) => {
    p.drawLine({ start: { x: M, y: 44 }, end: { x: W - M, y: 44 }, thickness: 0.5, color: GOLD });
    p.drawText(clean(`${site.name} - ${readiness.name} - Case ${c.id.slice(0, 8).toUpperCase()}${opts.final ? "" : " - DRAFT, not for reliance"}${c.sandbox ? " - SANDBOX TEST" : ""}`), { x: M, y: 30, size: 7.5, font: sans, color: MUTED });
    p.drawText(String(pageNo), { x: W - M - 8, y: 30, size: 7.5, font: sans, color: MUTED });
    if (!opts.final) p.drawText("DRAFT", { x: 150, y: 330, size: 120, font: sansB, color: GOLD, opacity: 0.09, rotate: degrees(35) });
  };
  const newPage = () => { page = pdf.addPage([W, H]); pageNo++; y = H - M; footer(page); };
  const ensure = (h: number) => { if (y - h < 64) newPage(); };
  const text = (s: string, o: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number; indent?: number } = {}) => {
    const size = o.size ?? 10.5, font = o.font ?? sans, lh = size * 1.45;
    for (const ln of wrap(s, font, size, CW - (o.indent ?? 0))) { ensure(lh); page.drawText(ln, { x: M + (o.indent ?? 0), y: y - size, size, font, color: o.color ?? INK }); y -= lh; }
    y -= o.gap ?? 6;
  };
  const heading = (s: string) => { ensure(48); y -= 10; page.drawText(clean(s), { x: M, y: y - 17, size: 17, font: serif, color: FOREST }); y -= 24; page.drawLine({ start: { x: M, y }, end: { x: M + 36, y }, thickness: 1.5, color: GOLD }); y -= 12; };

  // Cover
  page = pdf.addPage([W, H]); pageNo = 1;
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: FOREST });
  page.drawRectangle({ x: M, y: H - 128, width: 30, height: 30, color: IVORY });
  page.drawText("BuildGhana", { x: M + 42, y: H - 120, size: 19, font: serif, color: IVORY });
  page.drawText("Abroad", { x: M + 42 + serif.widthOfTextAtSize("BuildGhana ", 19), y: H - 120, size: 19, font: serifIt, color: GOLD });
  page.drawText("GHANA BUILD", { x: M, y: H - 330, size: 12, font: sansB, color: GOLD });
  page.drawText("Readiness Review", { x: M, y: H - 380, size: 46, font: serif, color: IVORY });
  page.drawText(opts.final ? "Final report" : "Draft report - not for reliance", { x: M, y: H - 412, size: 14, font: serifIt, color: IVORY });
  const meta: [string, string][] = [
    ["Prepared for", `${c.contact.firstName} ${c.contact.lastName}`],
    ["Property", [c.property.city, labelFor(ghanaRegions, c.property.region)].filter(Boolean).join(", ") + ", Ghana"],
    ["Case reference", c.id.slice(0, 8).toUpperCase()],
    ["Date", new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })],
    ["Title verification", titleStatusLabel[c.titleStatus]],
  ];
  let my = 260;
  for (const [k, v] of meta) {
    page.drawText(k.toUpperCase(), { x: M, y: my, size: 7.5, font: sansB, color: GOLD });
    page.drawText(clean(v), { x: M + 120, y: my, size: 11, font: sans, color: IVORY });
    my -= 24;
  }
  page.drawLine({ start: { x: M, y: 110 }, end: { x: W - M, y: 110 }, thickness: 0.6, color: GOLD });
  page.drawText(clean("Confidential. Prepared for the named client only."), { x: M, y: 92, size: 8, font: sans, color: IVORY, opacity: 0.7 });
  if (c.sandbox) page.drawText("SANDBOX TEST CASE - NOT A REAL ENGAGEMENT", { x: M, y: 76, size: 8, font: sansB, color: GOLD });
  if (!opts.final) page.drawText("DRAFT", { x: 170, y: 520, size: 120, font: sansB, color: GOLD, opacity: 0.07, rotate: degrees(35) });

  // Body
  newPage();
  heading("1. Summary");
  text(c.summary || "Summary to be written by the reviewer once all areas are assessed.", { color: c.summary ? INK : MUTED });
  const ratings = reviewAreas.map((a) => ({ a, f: c.findings[a.key] ?? { rating: "not_assessed" as Rating, notes: "" } }));
  for (const { a, f } of ratings) {
    ensure(22);
    const r = RATING[f.rating];
    page.drawRectangle({ x: M, y: y - 14, width: 4, height: 14, color: r.color });
    page.drawText(clean(a.title), { x: M + 12, y: y - 11, size: 10.5, font: sansB, color: INK });
    page.drawText(r.label, { x: W - M - sansB.widthOfTextAtSize(r.label, 8.5), y: y - 11, size: 8.5, font: sansB, color: r.color });
    y -= 22;
  }

  heading("2. Title verification (Ghanaian counsel)");
  text(titleStatement(c));
  if (c.titleStatus === "counsel_signed_off" && c.counsel?.summary) text(`Counsel's summary: ${c.counsel.summary}`, { font: serifIt, size: 11 });

  heading("3. Findings by area");
  for (const { a, f } of ratings) {
    ensure(40);
    text(a.title, { font: sansB, size: 11, gap: 2 });
    text(`Rating: ${RATING[f.rating].label.toLowerCase()}`, { size: 9, color: RATING[f.rating].color, gap: 2 });
    text(f.notes || "Not yet assessed.", { color: f.notes ? INK : MUTED, gap: 10 });
  }

  heading("4. What you told us");
  const facts: [string, string][] = [
    ["Land acquired", labelFor(acquisitionRoutes, c.property.acquisition)],
    ["Documents held", labelFor(titleDocStatuses, c.property.titleStatus)],
    ["Intended use", labelFor(intendedUses, c.property.intendedUse)],
    ["Project stage", labelFor(projectStages, c.property.projectStage)],
    ["Budget range", labelFor(budgetRanges, c.property.budgetRange)],
  ];
  for (const [k, v] of facts) text(`${k}: ${v}`, { gap: 2 });
  y -= 6;
  heading("5. Document inventory");
  for (const d of documentInventory) {
    const have = c.inventory[d.key];
    const uploaded = c.documents.filter((x) => x.docKey === d.key && x.status === "uploaded").length;
    text(`${d.label}: ${have === "have" ? "held" : have === "dont_have" ? "not held" : "unsure"}${uploaded ? ` - ${uploaded} file(s) received` : ""}`, { gap: 2, size: 10 });
  }
  y -= 6;
  heading("6. Scope and limits");
  text("This review is an evidence-based assessment of the documents and information supplied. It is not a legal opinion, a structural engineering report or a valuation. Title findings are those of the Ghana-qualified counsel named in section 2 and are subject to counsel's own engagement terms. Regulatory requirements vary by Assembly and change over time.", { size: 9.5, color: MUTED });
  text(`${site.name} - ${site.url}`, { size: 9, color: MUTED });

  return pdf.save();
}
