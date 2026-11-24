import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { tpConfig, TP_SESSION_COOKIE } from "./config";
import { userFromSessionValue } from "./auth";
import { projectCtx, ServiceError, type Ctx } from "./service";
import type { Action } from "./rbac";
import type { User } from "./types";

/** Server-side gate for every private page: feature flag → session → (optional) project + action. */
export async function requireUser(next = "/portal/projects"): Promise<User> {
  if (!tpConfig().enabled) notFound();
  const jar = await cookies();
  const user = await userFromSessionValue(jar.get(TP_SESSION_COOKIE)?.value);
  if (!user) redirect(`/portal/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireProject(projectId: string, action: Action = "project.view", next?: string): Promise<Ctx> {
  const user = await requireUser(next ?? `/portal/projects/${projectId}`);
  try { return await projectCtx(user, projectId, action); }
  catch (e) { if (e instanceof ServiceError) notFound(); throw e; }
}

export const privateMeta = { robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } } } as const;
