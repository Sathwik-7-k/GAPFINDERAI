import { listActivity, loadWorkspace } from "@/lib/workspace-db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Sign in to export your workspace." }, { status: 401 });
    const backup = { ...loadWorkspace(user.id), activity: listActivity(user.id), exportedAt: new Date().toISOString() };
    return Response.json(backup, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="gapfinder-workspace-backup.json"',
      },
    });
  } catch {
    return Response.json({ error: "Could not export the local workspace database." }, { status: 500 });
  }
}