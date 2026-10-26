import { listActivity, loadWorkspace } from "@/lib/workspace-db";

export async function GET() {
  try {
    const backup = { ...loadWorkspace(), activity: listActivity(), exportedAt: new Date().toISOString() };
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