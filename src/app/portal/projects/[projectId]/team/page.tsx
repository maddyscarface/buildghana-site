import { requireProject } from "@/lib/transparency/page";
import { roleLabel } from "@/lib/transparency/rbac";
import { getStore } from "@/lib/transparency/service";
import { scopes } from "@/lib/transparency/types";
import { ProjectFrame } from "@/components/portal/ProjectFrame";
import { JsonForm } from "@/components/portal/JsonForm";
import { Card, fmtDate, PageTitle, Pill } from "@/components/portal/ui";

export const dynamic = "force-dynamic";
const scopeLabel: Record<string, string> = { reports: "Reports", gallery: "Gallery", schedule: "Schedule", documents: "Documents", budget: "Budget & payments", decisions: "Decisions" };

export default async function Team({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await requireProject(projectId, "access.manage");
  const s = getStore();
  const [mbs, users] = await Promise.all([s.list("memberships", { projectId }), s.list("users", { tenantId: ctx.project.tenantId })]);
  const tz = ctx.user.timezone;
  const opts = scopes.filter((x) => ctx.grant.scopes.includes(x)).map((x) => ({ value: x, label: scopeLabel[x] }));
  return (
    <ProjectFrame ctx={ctx} active="/team">
      <PageTitle eyebrow="Access" title="Who can see this project">Invite family members or co-funders with limited access. Budget and documents stay off unless you turn them on. Revoking access takes effect on their next click. Demo invitations are logged, never sent.</PageTitle>
      <Card title="People with access">
        <ul className="divide-y divide-line">
          {mbs.sort((a, b) => a.role.localeCompare(b.role)).map((m) => {
            const u = users.find((x) => x.id === m.userId);
            const editable = m.role === "co_owner" && m.userId !== ctx.user.id;
            return (
              <li key={m.id} className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0"><p className="font-semibold text-forest">{u?.name}</p><p className="text-xs text-muted">{roleLabel[m.role]} · {u?.email} · since {fmtDate(m.grantedAt, tz, false)}{m.invitationExpiry ? ` · expires ${fmtDate(m.invitationExpiry, tz, false)}` : ""}</p></div>
                  <div className="flex flex-wrap gap-1.5">{m.revokedAt ? <Pill tone="bad">Revoked {fmtDate(m.revokedAt, tz)}</Pill> : m.scopes.map((x) => <Pill key={x}>{scopeLabel[x]}</Pill>)}</div>
                </div>
                {editable && !m.revokedAt && (
                  <div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto]">
                    <JsonForm compact endpoint={`/api/portal/access/${m.id}/scopes`} fields={[{ name: "scopes", label: "Categories this person can see", type: "checks", options: opts, value: m.scopes }]} submitLabel="Update access" done="Access updated." />
                    <JsonForm compact endpoint={`/api/portal/access/${m.id}/revoke`} fields={[]} actions={[{ value: "revoke", label: "Revoke access", tone: "danger" }]} done="Access revoked." />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
      <Card className="mt-5" title="Invite a viewer">
        <div className="max-w-xl"><JsonForm endpoint={`/api/portal/projects/${projectId}/access`} fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "email", label: "Email (demo: must end in .invalid)", type: "text", required: true, placeholder: "aunt@demo.invalid" },
          { name: "scopes", label: "Categories", type: "checks", options: opts, value: ["reports", "gallery", "schedule"] },
          { name: "expiryDays", label: "Access expires after (days)", type: "number", value: "90" },
        ]} submitLabel="Grant access" done="Viewer added. In production they would receive a sign-in invitation." /></div>
      </Card>
    </ProjectFrame>
  );
}
