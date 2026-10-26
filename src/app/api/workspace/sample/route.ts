import { getCurrentUser } from "@/lib/auth";
import { SAMPLE_WORKSPACE } from "@/lib/sample-data";
import { saveWorkspace } from "@/lib/workspace-db";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  try {
    const updated = saveWorkspace(user.id, SAMPLE_WORKSPACE);
    return Response.json(updated, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not load sample course." }, { status: 500 });
  }
}
