import "server-only";

/**
 * Link-only client emails (spec §2 Step D): the email never contains the report or any document —
 * only a link to the authenticated case page. Sent via Resend when RESEND_API_KEY + READINESS_EMAIL_FROM
 * are set; otherwise logged as a no-op so staging never emails real people.
 */
export type ClientEmail = { to: string; subject: string; heading: string; body: string; linkUrl: string; linkLabel: string };

export async function sendClientEmail(m: ClientEmail): Promise<{ status: "ok" | "skipped" | "error"; detail?: string }> {
  const key = process.env.RESEND_API_KEY, from = process.env.READINESS_EMAIL_FROM;
  if (!key || !from) { console.info("[readiness] email noop:", JSON.stringify({ subject: m.subject, link: m.linkUrl.replace(/t=[^&]+/, "t=…") })); return { status: "skipped", detail: "email not configured" }; }
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
  const html = `<div style="font-family:Georgia,serif;max-width:560px;margin:auto;color:#1f2a24"><h2 style="color:#123d2e">${esc(m.heading)}</h2><p style="font-family:Arial,sans-serif;line-height:1.6">${esc(m.body)}</p><p><a href="${esc(m.linkUrl)}" style="display:inline-block;background:#c9a24a;color:#123d2e;padding:12px 20px;border-radius:999px;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold">${esc(m.linkLabel)}</a></p><p style="font-family:Arial,sans-serif;font-size:12px;color:#6b7280">This link is private to you. For your security we never attach reports or documents to email.</p></div>`;
  try {
    const r = await fetch(`${process.env.RESEND_API_BASE || "https://api.resend.com"}/emails`, {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [m.to], subject: m.subject, html, text: `${m.heading}\n\n${m.body}\n\n${m.linkLabel}: ${m.linkUrl}`, reply_to: process.env.READINESS_EMAIL_REPLY_TO || undefined }),
      signal: AbortSignal.timeout(8000),
    });
    return { status: r.ok ? "ok" : "error", detail: r.ok ? undefined : `HTTP ${r.status}` };
  } catch (e) { return { status: "error", detail: String(e).slice(0, 200) }; }
}
