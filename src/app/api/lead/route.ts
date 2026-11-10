import { NextResponse } from "next/server";
import { clientIp, rateLimit, verifyTurnstile } from "@/lib/server/guards";
import { processLead } from "@/lib/server/process-lead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 32 * 1024;

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const ua = req.headers.get("user-agent") || "";

  // Same-origin check (blocks cross-site form posting)
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ ok: false, error: "Invalid origin" }, { status: 403 });
  }

  if (!(await rateLimit(`lead:${ip}`, 5, 600))) {
    return NextResponse.json({ ok: false, error: "Too many submissions. Please try again in a few minutes." }, { status: 429 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413 });

  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const token = (body as { turnstile_token?: string })?.turnstile_token;
  if (!(await verifyTurnstile(token, ip))) {
    return NextResponse.json({ ok: false, error: "Spam check failed. Please refresh and try again." }, { status: 400 });
  }

  const result = await processLead(body, { ip, userAgent: ua });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, fieldErrors: result.fieldErrors }, { status: result.status });
  }
  // Integration status is returned for debugging; it contains no secrets.
  return NextResponse.json({ ok: true, leadId: result.leadId, tier: result.tier, duplicate: result.duplicate });
}
