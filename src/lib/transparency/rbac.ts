/**
 * Project-scoped RBAC (spec 01 §D, 02 §5). Deny by default. Enforced on the server for every page,
 * API route and media URL — never by UI hiding alone. Pure functions so they can be unit-tested.
 */
import type { Membership, Project, Role, Scope, User } from "./types";

export const actions = [
  "project.view", "reports.view_published", "reports.view_all", "gallery.view", "schedule.view", "schedule.edit",
  "documents.view", "documents.view_financial", "budget.view", "decisions.view", "decisions.respond", "comments.write",
  "report.create", "report.review", "report.publish", "inspection.record", "dispute.raise", "dispute.resolve",
  "milestone.assess", "change_order.propose", "payment.request.create", "payment.evidence_review", "payment.owner_authorize",
  "payment.record_disbursement", "payment.reconcile", "access.manage", "audit.view", "project.export", "demo.reset",
] as const;
export type Action = (typeof actions)[number];

/** Which scope a read action needs for scope-limited members (co-owners / financiers / family viewers). */
const scopeFor: Partial<Record<Action, Scope>> = {
  "reports.view_published": "reports", "gallery.view": "gallery", "schedule.view": "schedule", "documents.view": "documents",
  "documents.view_financial": "budget", "budget.view": "budget", "decisions.view": "decisions", "project.export": "reports",
};

const STAFF_READ: Action[] = ["project.view", "reports.view_published", "reports.view_all", "gallery.view", "schedule.view", "documents.view", "decisions.view", "comments.write"];

export const roleMatrix: Record<Role, Action[]> = {
  ops_admin: [...STAFF_READ, "schedule.edit", "report.review", "report.publish", "dispute.resolve", "milestone.assess", "change_order.propose", "access.manage", "audit.view", "project.export", "demo.reset", "budget.view", "documents.view_financial"],
  project_manager: [...STAFF_READ, "schedule.edit", "report.review", "report.publish", "dispute.raise", "dispute.resolve", "milestone.assess", "change_order.propose", "payment.request.create", "payment.evidence_review", "audit.view", "project.export", "budget.view", "documents.view_financial"],
  field_supervisor: ["project.view", "reports.view_all", "gallery.view", "schedule.view", "report.create", "comments.write"],
  inspector: ["project.view", "reports.view_all", "gallery.view", "schedule.view", "documents.view", "inspection.record", "comments.write"],
  owner: ["project.view", "reports.view_published", "gallery.view", "schedule.view", "documents.view", "documents.view_financial", "budget.view", "decisions.view", "decisions.respond", "comments.write", "dispute.raise", "payment.owner_authorize", "access.manage", "project.export"],
  co_owner: ["project.view", "reports.view_published", "gallery.view", "schedule.view", "documents.view", "documents.view_financial", "budget.view", "decisions.view", "comments.write", "project.export"],
  accountant: ["project.view", "budget.view", "documents.view_financial", "payment.record_disbursement", "payment.reconcile", "audit.view"],
  contractor: ["project.view", "reports.view_published", "schedule.view", "payment.request.create", "comments.write"],
};

/** Default scopes by role at invitation time. Financiers / co-owners get NO budget or document access until granted. */
export const defaultScopes: Record<Role, Scope[]> = {
  ops_admin: ["reports", "gallery", "schedule", "documents", "budget", "decisions"],
  project_manager: ["reports", "gallery", "schedule", "documents", "budget", "decisions"],
  field_supervisor: ["reports", "gallery", "schedule"],
  inspector: ["reports", "gallery", "schedule", "documents"],
  owner: ["reports", "gallery", "schedule", "documents", "budget", "decisions"],
  co_owner: ["reports", "gallery", "schedule"],
  accountant: ["budget", "documents"],
  contractor: ["schedule"],
};

export const roleLabel: Record<Role, string> = {
  ops_admin: "BuildGhana operations admin", project_manager: "Project manager", field_supervisor: "Field supervisor",
  inspector: "Inspector", owner: "Owner", co_owner: "Co-owner / financier / family viewer", accountant: "Accountant", contractor: "Contractor",
};

export type Grant = { role: Role; scopes: Scope[]; membership: Membership | null };

/**
 * Resolve the actor's grant on a project. Tenant mismatch, disabled users, revoked or expired memberships → null.
 * Tenant-wide ops admins get access to projects in their own tenant only (audited); nobody crosses tenants.
 */
export function grantFor(user: User | null, project: Project | null, memberships: Membership[], now = Date.now()): Grant | null {
  if (!user || !project || user.disabled) return null;
  if (user.tenantId !== project.tenantId) return null;
  const m = memberships.find((x) => x.projectId === project.id && x.userId === user.id && x.tenantId === project.tenantId);
  const live = m && !m.revokedAt && (!m.invitationExpiry || Date.parse(m.invitationExpiry) > now) ? m : null;
  if (live) return { role: live.role, scopes: live.scopes, membership: live };
  if (user.staffRole === "ops_admin") return { role: "ops_admin", scopes: defaultScopes.ops_admin, membership: null };
  return null;
}

export function can(grant: Grant | null, action: Action, project?: Pick<Project, "financialVisibility">): boolean {
  if (!grant) return false;
  if (!roleMatrix[grant.role].includes(action)) return false;
  const needs = scopeFor[action];
  if (needs && (grant.role === "co_owner" || grant.role === "owner") && !grant.scopes.includes(needs)) return false;
  // Financial pages stay hidden until the contract authorises financial sharing (spec 01 §B Budget).
  if ((action === "budget.view" || action === "documents.view_financial" || action === "payment.owner_authorize") && project && project.financialVisibility !== "contract_authorized") return false;
  return true;
}

/** Owners may grant viewers only up to their own scopes and never staff roles. */
export function canGrantRole(granter: Grant | null, role: Role): boolean {
  if (!granter || !can(granter, "access.manage")) return false;
  if (granter.role === "ops_admin") return true;
  return role === "co_owner";
}
