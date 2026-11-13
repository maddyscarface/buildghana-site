import "server-only";
import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage } from "pdf-lib";
import { readiness, documentInventory, docAvailabilityLabel, intendedUses, areaUnits, landControllers, acquiredStatuses, siteAccess, finishLevels, budgetBands, designStatuses, fundsStatuses } from "@/config/readiness";
import { labelFor, ghanaRegions } from "@/lib/lead/options";
import {
  counselOutcomes, permitStatusLabel, recommendationLabel, siteChecks, siteVisitDocumented, titleStatement, titleStatusLabel, titleBand, titleBandLabel, type ReadinessCase, type Rating,
} from "./model";
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
export const RATING: Record<Rating, { label: string; color: ReturnType<typeof rgb> }> = {
  ready: { label: "READY", color: rgb(0.18, 0.45, 0.3) },
  attention: { label: "NEEDS ATTENTION", color: rgb(0.72, 0.52, 0.18) },
  not_ready: { label: "NOT READY", color: rgb(0.64, 0.25, 0.17) },
  not_assessed: { label: "NOT ASSESSED", color: rgb(0.45, 0.48, 0.46) },
};

// pdf-lib standard fonts are WinAnsi: strip characters they can't encode.
const clean = (s: string) => s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/\u2026/g, "...").replace(/[\u00B7\u2022]/g, "-").replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

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

export async function renderReportPdf(c: ReadinessCase, opts: { final: boolean; version: number }): Promise<Uint8Array> {
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
    p.drawText(clean(`${site.name} - ${readiness.name} - ${c.caseNumber} - v${opts.version}${opts.final ? "" : " - DRAFT, not for reliance"}${c.sandbox ? " - SANDBOX TEST" : ""}`), { x: M, y: 30, size: 7.5, font: sans, color: MUTED });
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
    ["Parcel", [c.parcel.locality, c.parcel.district, labelFor(ghanaRegions, c.parcel.region)].filter(Boolean).join(", ") + ", Ghana"],
    ["Case number", c.caseNumber],
    ["Report version", `v${opts.version}${opts.final ? " (final)" : " (draft)"}`],
    ["Date", new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })],
    ["Site visit", siteVisitDocumented(c.siteVisit) ? `Completed ${fmtDate(c.siteVisit.completedAt!)}` : "PENDING"],
    ["Title (counsel)", `${titleBandLabel[titleBand(c.titleStatus)]} — ${titleStatusLabel[c.titleStatus]}`],
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
  const kv = (k: string, v?: string) => text(`${k}: ${v || "-"}`, { gap: 2, size: 10 });
  const pending = (msg: string) => { ensure(40); page.drawRectangle({ x: M, y: y - 30, width: CW, height: 30, color: rgb(0.98, 0.94, 0.86) }); page.drawText(clean(msg), { x: M + 10, y: y - 19, size: 9.5, font: sansB, color: rgb(0.55, 0.36, 0.1) }); y -= 40; };
  newPage();
  heading("1. Parcel and project");
  kv("Region / district", `${labelFor(ghanaRegions, c.parcel.region)} / ${c.parcel.district}`);
  kv("Locality", c.parcel.locality);
  kv("GPS / GhanaPost", c.parcel.gps || (c.parcel.mapPin ? `${c.parcel.mapPin.lat.toFixed(5)}, ${c.parcel.mapPin.lng.toFixed(5)} (map pin)` : "not provided"));
  kv("Plot number", c.parcel.plotNumber || "not provided");
  kv("Area", c.parcel.area ? `${c.parcel.area} ${labelFor(areaUnits, c.parcel.areaUnit)}` : "not provided");
  kv("Access (as reported)", labelFor(siteAccess, c.parcel.access));
  kv("Who controls the land (as reported)", labelFor(landControllers, c.parcel.controller));
  kv("Acquired", labelFor(acquiredStatuses, c.parcel.acquired));
  kv("Intended use", labelFor(intendedUses, c.project.use) + (c.project.useOther ? ` - ${c.project.useOther}` : ""));
  kv("Floor area / units / floors", [c.project.floorArea, c.project.units && `${c.project.units} units`, c.project.floors && `${c.project.floors} floors`].filter(Boolean).join(" - ") || "not provided");
  kv("Finish level", labelFor(finishLevels, c.project.finish));
  kv("Budget band", `${labelFor(budgetBands, c.project.budgetBand)} ${c.project.budgetCurrency}${c.project.landIncluded ? " (incl. land)" : ""} - ${labelFor(fundsStatuses, c.project.funds)}`);
  kv("Design status", labelFor(designStatuses, c.project.designStatus));
  if (c.summary) { y -= 4; text("Reviewer's summary", { font: sansB, size: 11, gap: 2 }); text(c.summary); }
  text("Parcel details above are as reported by the client unless confirmed in sections 2 and 3.", { size: 8.5, color: MUTED });

  heading("2. Site visit summary");
  if (!siteVisitDocumented(c.siteVisit)) {
    pending(c.siteVisit?.scheduledFor ? `SITE VISIT PENDING - scheduled ${fmtDate(c.siteVisit.scheduledFor)}. This report cannot be final.` : "SITE VISIT PENDING - not yet conducted. This report cannot be final.");
  } else {
    kv("Visit date", fmtDate(c.siteVisit.completedAt!));
    kv("Carried out by", c.siteVisit.completedBy);
    const photos = c.documents.filter((d) => d.docKey === "site_photo" && d.status === "uploaded").length;
    kv("Photos on file", String(photos));
    for (const k of siteChecks) if (c.siteVisit.checklist[k.key]) { text(k.label, { font: sansB, size: 10, gap: 1 }); text(c.siteVisit.checklist[k.key]!, { size: 10, gap: 5 }); }
    text("Observations are visual and from the date of the visit. This is not a legal boundary certification or a geotechnical investigation.", { size: 8.5, color: MUTED });
  }

  heading("3. Land and title (counsel-owned section)");
  text(titleStatement(c));
  if (counselOutcomes.includes(c.titleStatus) && c.counsel) {
    if (c.counsel.searchReference) kv("Official search reference", c.counsel.searchReference);
    if (c.counsel.summary) text(`Counsel's findings: ${c.counsel.summary}`, { font: serifIt, size: 11 });
    if (c.counsel.limitations) text(`Limitations stated by counsel: ${c.counsel.limitations}`, { size: 10, color: MUTED });
    if (c.counsel.signedOffAt) kv("Recorded", fmtDate(c.counsel.signedOffAt));
  }
  text("Documents supplied by the client (an upload is not a verified title):", { font: sansB, size: 10, gap: 2 });
  for (const d of documentInventory) {
    const st = c.inventory[d.key] as keyof typeof docAvailabilityLabel | undefined;
    const uploaded = c.documents.filter((x) => x.docKey === d.key && x.status === "uploaded").length;
    text(`${d.label}: ${st ? docAvailabilityLabel[st].toLowerCase() : "-"}${uploaded ? ` - ${uploaded} file(s) received` : ""}`, { gap: 1, size: 9.5, indent: 10 });
  }
  y -= 6;

  heading("4. Permit checklist");
  if (!c.permits.length) pending("Permit checklist not yet prepared.");
  if (c.ops.jurisdiction) kv("Jurisdiction", c.ops.jurisdiction);
  for (const p of c.permits) {
    ensure(40);
    text(`${p.item} - ${permitStatusLabel[p.status]}`, { font: sansB, size: 10, gap: 1 });
    text(`Authority: ${p.authority}${p.lastChecked ? ` - last checked ${p.lastChecked}` : ""}${p.sourceUrl ? ` - source: ${p.sourceUrl}` : ""}`, { size: 9, color: MUTED, gap: 1 });
    if (p.notes) text(p.notes, { size: 9.5, gap: 4 });
  }
  text("Requirements vary by assembly and change over time. This checklist does not promise that any permit will be granted.", { size: 8.5, color: MUTED });

  heading("5. Preliminary cost range");
  if (!c.cost) pending("Cost range not yet prepared.");
  else {
    const n = (v: number, cur: string) => `${cur} ${v.toLocaleString("en-US")}`;
    const rows: [string, number, number][] = [["Low", c.cost.ghs.low, c.cost.usd.low], ["Base", c.cost.ghs.base, c.cost.usd.base], ["High", c.cost.ghs.high, c.cost.usd.high]];
    for (const [k, g, u] of rows) {
      ensure(18);
      page.drawText(k, { x: M, y: y - 11, size: 10.5, font: sansB, color: INK });
      page.drawText(clean(n(g, "GHS")), { x: M + 90, y: y - 11, size: 10.5, font: sans, color: INK });
      page.drawText(clean(`approx. ${n(u, "USD")}`), { x: M + 260, y: y - 11, size: 10.5, font: sans, color: MUTED });
      y -= 18;
    }
    y -= 4;
    kv("Exchange rate", `1 USD = ${c.cost.fxRate} GHS (${c.cost.fxSource}, ${c.cost.fxDate})`);
    kv("Cost assumptions version", c.cost.assumptionsVersion);
    kv("Confidence", c.cost.confidence);
    text(`Assumptions: ${c.cost.assumptions || "-"}`, { size: 10 });
    text("This is a planning range, not a quote, tender or fixed price. Market prices and exchange rates move; re-check before committing funds.", { size: 9, font: sansB, color: rgb(0.55, 0.36, 0.1) });
  }

  heading("6. Recommendation");
  if (!c.recommendation) pending("Recommendation not yet drafted.");
  else {
    text(recommendationLabel[c.recommendation.decision], { font: serif, size: 15, color: FOREST, gap: 4 });
    text(c.recommendation.rationale);
    if (c.recommendation.conditions) { text("Conditions / open issues", { font: sansB, size: 10, gap: 1 }); text(c.recommendation.conditions); }
    if (c.recommendation.nextSteps) { text("Next steps", { font: sansB, size: 10, gap: 1 }); text(c.recommendation.nextSteps); }
    text(c.recommendation.approvedBy ? `Approved by ${c.recommendation.approvedBy} on ${fmtDate(c.recommendation.approvedAt!)}.` : "Awaiting human reviewer approval - not for reliance.", { size: 9, color: MUTED });
  }

  heading("7. Optional next step");
  text("If you'd like help moving forward, we can propose design coordination, procurement and site oversight as a separate engagement. There is no obligation, and nothing in this report depends on it.", { size: 10 });

  heading("Scope and limits");
  text("This review is an evidence-based assessment of the site visit and the documents and information supplied. It is not a legal opinion, a boundary certification, a structural engineering report, a valuation or a quote. Title findings are solely those of the Ghana-qualified counsel named in section 3 and are subject to counsel's own engagement terms.", { size: 9.5, color: MUTED });
  text(`${site.name} - ${site.url}`, { size: 9, color: MUTED });

  return pdf.save();
}
