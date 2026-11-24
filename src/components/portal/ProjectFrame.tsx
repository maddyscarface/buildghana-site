import type { ReactNode } from "react";
import { PortalHeader } from "./ui";
import { projectNav } from "@/lib/transparency/nav";
import { roleLabel } from "@/lib/transparency/rbac";
import type { Ctx } from "@/lib/transparency/service";

export function ProjectFrame({ ctx, active, children }: { ctx: Ctx; active: string; children: ReactNode }) {
  return (
    <>
      <PortalHeader userName={ctx.user.name} roleLabel={roleLabel[ctx.grant.role]} area={`${ctx.project.name} · ${ctx.project.code}`} nav={projectNav(ctx, active)} />
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-8 sm:py-9">{children}</main>
    </>
  );
}
