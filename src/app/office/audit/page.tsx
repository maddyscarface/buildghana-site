import { requireUser } from "@/lib/transparency/page";
import { can } from "@/lib/transparency/rbac";
import { getStore, listMyProjects } from "@/lib/transparency/service";
import { StaffFrame } from "@/components/portal/StaffFrame";
import { JsonForm } from "@/components/portal/JsonForm";
import { Card, Empty, fmtDate, PageTitle, Pill } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

export default async function Audit() {
  const user = await requireUser("/office/audit");
  const s = getStore();
  const projects = (await listMyProjects(user)).filter((x) => can(x.grant, "audit.view"));
  const users = await s.list("users", { tenantId: user.tenantId });
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  if (!projects.length) return <StaffFrame user={user} active="audit"><Empty>Your role can&apos;t view the audit log.</Empty></StaffFrame>;
  const ids = new Set(projects.map((p) => p.project.id));
  const events = (await s.list("audit_events", { tenantId: user.tenantId })).filter((e) => !e.projectId || ids.has(e.projectId)).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 200);
  const outbox = (await s.list("outbox_events", { tenantId: user.tenantId })).filter((e) => ids.has(e.projectId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
  const canReset = projects.some((p) => can(p.grant, "demo.reset"));
  return (
    <StaffFrame user={user} active="audit">
      <PageTitle eyebrow="Audit" title="Audit log & notifications">Append-only. Records who did what, when, and on which version — including denied access attempts. IP addresses are stored only as a salted hash.</PageTitle>
      <Card title={`Audit events (latest ${events.length})`}>
        {events.length === 0 ? <Empty>No events.</Empty> : <div className="-mx-1 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-muted"><tr><th className="px-2 py-2">When</th><th className="px-2 py-2">Who</th><th className="px-2 py-2">Action</th><th className="px-2 py-2">Object</th><th className="px-2 py-2">Version</th></tr></thead>
          <tbody className="divide-y divide-line">{events.map((e) => <tr key={e.id}><td className="px-2 py-2 whitespace-nowrap">{fmtDate(e.occurredAt, user.timezone)}</td><td className="px-2 py-2">{name(e.actorId)} <span className="text-xs text-muted">({e.actorRole})</span></td><td className="px-2 py-2"><code className={e.action.startsWith("access.denied") ? "text-[#8a2f1d]" : ""}>{e.action}</code></td><td className="px-2 py-2 text-xs">{e.objectType}:{e.objectId}</td><td className="px-2 py-2 text-xs">{e.oldVersion ?? "–"} → {e.newVersion ?? "–"}</td></tr>)}</tbody></table></div>}
      </Card>
      <Card className="mt-5" title="Notification outbox">
        <p className="mb-3 text-sm text-muted">No email, SMS or WhatsApp provider is connected. Notifications are logged here and <strong>not sent</strong>. Text is neutral — never amounts, photos, document links or tokens.</p>
        {outbox.length === 0 ? <Empty>Nothing queued.</Empty> : <ul className="divide-y divide-line text-sm">{outbox.map((o) => <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{fmtDate(o.createdAt, user.timezone)} · to {name(o.recipientUserId)} · {o.text}</span><Pill>{o.status === "logged_not_sent" ? "Logged — not sent" : o.status}</Pill></li>)}</ul>}
      </Card>
      {canReset && <Card className="mt-5" title="Demo controls"><p className="mb-3 text-sm text-muted">Restores the synthetic seed data (all demo changes are discarded). Only available in the demo adapter.</p><JsonForm endpoint="/api/office/demo/reset" fields={[]} actions={[{ value: "reset", label: "Reset demo data", tone: "danger" }]} done="Demo data reset." /></Card>}
    </StaffFrame>
  );
}
