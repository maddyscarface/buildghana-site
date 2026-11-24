import { body, json, match, withUser, PRIVATE_HEADERS } from "@/lib/transparency/http";
import { checkAccessCode, issueSession, loginThrottle, recordLoginFailure, sessionCookieHeader, verifyMediaSig, ipHash } from "@/lib/transparency/auth";
import { tpConfig } from "@/lib/transparency/config";
import { demoPersonas } from "@/lib/transparency/seed";
import { exportPdf } from "@/lib/transparency/export";
import { addComment, getStore, grantViewer, mediaAccess, ownerAuthorizePayment, projectCtx, raiseDispute, respondDecision, revokeAccess, setScopes, ServiceError } from "@/lib/transparency/service";
import type { Scope } from "@/lib/transparency/types";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ path: string[] }> };

async function login(req: Request) {
  if (!tpConfig().enabled) return json({ ok: false, error: "Not available" }, 404);
  const origin = req.headers.get("origin"), host = req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) return json({ ok: false, error: "Cross-site request blocked" }, 403);
  if (!loginThrottle(`login:${ipHash(req)}`)) return json({ ok: false, error: "Too many attempts. Try again later." }, 429);
  const b = await body<{ code?: string; persona?: string }>(req).catch(() => ({} as { code?: string; persona?: string }));
  if (!checkAccessCode(String(b.code || ""))) { recordLoginFailure(`login:${ipHash(req)}`); return json({ ok: false, error: "That access code isn't right." }, 401); }
  const persona = demoPersonas.find((p) => p.userId === b.persona);
  if (!persona) return json({ ok: false, error: "Choose a demo persona." }, 400);
  const s = issueSession(persona.userId);
  await getStore().insert("audit_events", { id: `ae-login-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, tenantId: (await getStore().get("users", persona.userId))!.tenantId, actorId: persona.userId, actorRole: "session", action: "session.login", objectType: "user", objectId: persona.userId, ipHash: ipHash(req), occurredAt: new Date().toISOString() });
  return json({ ok: true, next: persona.lands }, 200, { "Set-Cookie": sessionCookieHeader(req, s.value, s.maxAge) });
}

export async function POST(req: Request, { params }: P) {
  const { path } = await params;
  if (path.join("/") === "session") return login(req);
  return withUser(req, path, async ({ user, parts }) => {
    let m: string[] | null;
    if ((m = match(parts, "decisions/:id/respond"))) { const b = await body<{ action: "approve" | "reject" | "clarify"; comments?: string; confirmation: string; payloadVersion: number }>(req); return json({ ok: true, decision: await respondDecision(user, m[0], b) }); }
    if ((m = match(parts, "reports/:id/dispute"))) { const b = await body<{ reason: string }>(req); return json({ ok: true, dispute: await raiseDispute(user, m[0], b.reason) }); }
    if ((m = match(parts, "projects/:id/comments"))) { const b = await body<{ parentRef: string; text: string }>(req); return json({ ok: true, comment: await addComment(user, m[0], String(b.parentRef || ""), b.text) }); }
    if ((m = match(parts, "projects/:id/access"))) { const b = await body<{ name: string; email: string; scopes: Scope[]; expiryDays: number }>(req); return json({ ok: true, membership: await grantViewer(user, m[0], b) }); }
    if ((m = match(parts, "access/:id/scopes"))) { const b = await body<{ scopes: Scope[] }>(req); return json({ ok: true, membership: await setScopes(user, m[0], b.scopes) }); }
    if ((m = match(parts, "access/:id/revoke"))) return json({ ok: true, membership: await revokeAccess(user, m[0]) });
    if ((m = match(parts, "payment-requests/:id/authorize"))) { const b = await body<{ action: "approve" | "reject" | "clarify"; reason?: string; confirmation: string }>(req); return json({ ok: true, request: await ownerAuthorizePayment(user, m[0], b) }); }
    return json({ ok: false, error: "Not found" }, 404);
  });
}

export async function DELETE(req: Request, { params }: P) {
  const { path } = await params;
  if (path.join("/") !== "session") return json({ ok: false, error: "Not found" }, 404);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", ...PRIVATE_HEADERS, "Set-Cookie": sessionCookieHeader(req, "", 0) } });
}

export async function GET(req: Request, { params }: P) {
  const { path } = await params;
  return withUser(req, path, async ({ user, parts }) => {
    let m: string[] | null;
    if ((m = match(parts, "media/:id"))) {
      const url = new URL(req.url);
      if (!verifyMediaSig(m[0], user.id, Number(url.searchParams.get("exp")), String(url.searchParams.get("sig") || ""))) return json({ ok: false, error: "Link expired. Reload the page." }, 403);
      const { asset } = await mediaAccess(user, m[0]);
      const bytes = await getStore().blobs.read(asset.objectKey);
      if (!bytes) throw new ServiceError(404, "Not found");
      return new Response(Buffer.from(bytes), { status: 200, headers: { ...PRIVATE_HEADERS, "Content-Type": asset.mime, "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox", "Cross-Origin-Resource-Policy": "same-origin" } });
    }
    if ((m = match(parts, "projects/:id/export"))) {
      const ctx = await projectCtx(user, m[0], "project.export");
      const pdf = await exportPdf(ctx);
      await getStore().insert("audit_events", { id: `ae-exp-${Date.now()}`, tenantId: user.tenantId, projectId: ctx.project.id, actorId: user.id, actorRole: ctx.grant.role, action: "project.exported", objectType: "project", objectId: ctx.project.id, occurredAt: new Date().toISOString() });
      return new Response(Buffer.from(pdf), { status: 200, headers: { ...PRIVATE_HEADERS, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${ctx.project.code}-progress-record.pdf"` } });
    }
    if ((m = match(parts, "projects/:id/summary"))) { const ctx = await projectCtx(user, m[0]); return json({ ok: true, project: { id: ctx.project.id, code: ctx.project.code, name: ctx.project.name, synthetic: ctx.project.synthetic }, role: ctx.grant.role, scopes: ctx.grant.scopes }); }
    if (parts.join("/") === "me") return json({ ok: true, user: { id: user.id, name: user.name } });
    return json({ ok: false, error: "Not found" }, 404);
  });
}
