import { can } from "./rbac";
import type { Ctx } from "./service";
import type { Role } from "./types";
import type { NavItem } from "@/components/portal/ui";

/** Project tabs shown only when the server-side permission check passes (the pages re-check anyway). */
export function projectNav(ctx: Ctx, active: string): NavItem[] {
  const base = `/portal/projects/${ctx.project.id}`;
  const items: [string, string, boolean][] = [
    ["", "Overview", true],
    ["/updates", "Updates", can(ctx.grant, "reports.view_published", ctx.project) || can(ctx.grant, "reports.view_all")],
    ["/schedule", "Schedule", can(ctx.grant, "schedule.view", ctx.project)],
    ["/gallery", "Gallery", can(ctx.grant, "gallery.view", ctx.project)],
    ["/documents", "Documents", can(ctx.grant, "documents.view", ctx.project)],
    ["/decisions", "Decisions", can(ctx.grant, "decisions.view", ctx.project)],
    ["/budget", "Budget", can(ctx.grant, "budget.view", ctx.project)],
    ["/team", "Access", can(ctx.grant, "access.manage")],
  ];
  return items.filter((i) => i[2]).map(([p, label]) => ({ href: base + p, label, active: active === p }));
}

export function staffNav(r: Role | null, active: string): NavItem[] {
  const out: NavItem[] = [{ href: "/portal/projects", label: "Projects", active: active === "projects" }];
  if (r === "field_supervisor") out.push({ href: "/field/projects", label: "Field reports", active: active === "field" }, { href: "/field/drafts", label: "Drafts & corrections", active: active === "drafts" });
  if (r === "project_manager" || r === "ops_admin") out.push({ href: "/office", label: "Review queue", active: active === "queue" });
  if (r === "inspector" || r === "project_manager" || r === "ops_admin") out.push({ href: "/office/inspections", label: "Inspections", active: active === "inspections" });
  if (r === "accountant" || r === "project_manager" || r === "ops_admin") out.push({ href: "/office/financials", label: "Financials", active: active === "financials" });
  if (r === "accountant" || r === "project_manager" || r === "ops_admin") out.push({ href: "/office/audit", label: "Audit & notifications", active: active === "audit" });
  return out;
}
