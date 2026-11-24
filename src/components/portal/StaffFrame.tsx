import type { ReactNode } from "react";
import { PortalHeader } from "./ui";
import { staffNav } from "@/lib/transparency/nav";
import { roleLabel } from "@/lib/transparency/rbac";
import type { User } from "@/lib/transparency/types";

export function StaffFrame({ user, active, area = "Office", children }: { user: User; active: string; area?: string; children: ReactNode }) {
  return (
    <>
      <PortalHeader userName={user.name} roleLabel={user.staffRole ? roleLabel[user.staffRole] : undefined} area={area} nav={staffNav(user.staffRole, active)} />
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-8 sm:py-9">{children}</main>
    </>
  );
}
