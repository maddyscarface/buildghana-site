/**
 * Phase 4 staff roles and least-privilege permission matrix (deny by default).
 * BuildGhana has no estimator workflow; the "estimator" role is kept for cross-brand parity and maps to
 * read access on readiness/project records only (no pricing module exists for this brand).
 */
export const roles = ["owner", "manager", "marketer", "estimator", "operator", "legal_reviewer", "read_only"] as const;
export type OpsRole = (typeof roles)[number];

export const permissions = [
  "records.read", "records.read_pii", "records.export",
  "projects.read", "projects.write",
  "documents.read", "documents.write", "documents.delete",
  "readiness.read", "property.read", "legal.review",
  "crm.read", "crm.replay",
  "datamoon.read", "datamoon.recipe_write", "datamoon.approve_export", "datamoon.approve_crm_sync", "datamoon.import", "datamoon.sync_crm",
  "suppressions.read", "suppressions.write",
  "reports.read", "staff.read", "staff.write", "audit.read", "health.read",
] as const;
export type Permission = (typeof permissions)[number];

const ALL = [...permissions] as Permission[];
export const matrix: Record<OpsRole, Permission[]> = {
  owner: ALL,
  manager: ALL.filter((p) => !["staff.write", "datamoon.approve_export", "datamoon.approve_crm_sync", "documents.delete"].includes(p)),
  marketer: ["records.read", "reports.read", "crm.read", "datamoon.read", "datamoon.recipe_write", "datamoon.import", "suppressions.read", "suppressions.write", "health.read"],
  estimator: ["records.read", "projects.read", "readiness.read", "documents.read", "reports.read"],
  operator: ["records.read", "records.read_pii", "projects.read", "projects.write", "documents.read", "documents.write", "readiness.read", "property.read", "crm.read", "crm.replay", "suppressions.read", "suppressions.write", "health.read"],
  legal_reviewer: ["records.read", "projects.read", "documents.read", "readiness.read", "property.read", "legal.review", "audit.read"],
  read_only: ["records.read", "projects.read", "reports.read", "health.read"],
};

export const roleLabel: Record<OpsRole, string> = {
  owner: "Owner", manager: "Manager", marketer: "Marketer", estimator: "Estimator (no pricing for BuildGhana)",
  operator: "Operator", legal_reviewer: "Legal reviewer", read_only: "Read-only",
};

export const isRole = (r: unknown): r is OpsRole => typeof r === "string" && (roles as readonly string[]).includes(r);
export function hasPermission(role: OpsRole | null | undefined, p: Permission): boolean {
  if (!role || !isRole(role)) return false;
  return matrix[role].includes(p);
}
