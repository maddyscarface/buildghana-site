import Link from "next/link";
import { requireUser } from "@/lib/transparency/page";
import { listMyProjects } from "@/lib/transparency/service";
import { roleLabel } from "@/lib/transparency/rbac";
import { staffNav } from "@/lib/transparency/nav";
import { Card, Empty, PageTitle, Pill, PortalHeader } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

export default async function Projects() {
  const user = await requireUser("/portal/projects");
  const list = await listMyProjects(user);
  return (
    <>
      <PortalHeader userName={user.name} roleLabel={user.staffRole ? roleLabel[user.staffRole] : "Client"} area="Client portal" nav={user.staffRole ? staffNav(user.staffRole, "projects") : undefined} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <PageTitle eyebrow="Your projects" title="Projects you can see">Access is per project and per category. If a project is missing, ask the owner or BuildGhana to invite you.</PageTitle>
        {list.length === 0 ? <Empty>You don&apos;t have access to any projects yet.</Empty> : (
          <div className="grid gap-5 md:grid-cols-2">
            {list.map(({ project, grant }) => (
              <Card key={project.id} title={<Link href={`/portal/projects/${project.id}`} className="hover:text-gold-2">{project.name}</Link>}>
                <p className="text-sm text-muted">{project.code} · {project.locationPublic}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill tone="dark">{roleLabel[grant.role]}</Pill>
                  {project.synthetic && <Pill tone="warn">Synthetic demo</Pill>}
                  <Pill>{project.serviceModel === "owners_representative" ? "Owner's representative" : "Construction delivery"}</Pill>
                </div>
                <Link href={`/portal/projects/${project.id}`} className="btn-forest mt-5 !min-h-11">Open project</Link>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
