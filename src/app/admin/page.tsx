import { redirect } from "next/navigation";
/** Phase 4: the operations console is the admin home. /admin/readiness and /admin/property are unchanged. */
export default function AdminIndex() { redirect("/admin/ops"); }
