import { loadWorkspace, saveWorkspace, type WorkspaceSnapshot } from "@/lib/workspace-db";
import { getCurrentUser } from "@/lib/auth";

const MAX_DOCUMENTS = 20;
const MAX_TOTAL_CONTENT = 1_000_000;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Sign in to access your workspace." }, { status: 401 });
    return Response.json(loadWorkspace(user.id), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "The local workspace database could not be opened." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Sign in to save your workspace." }, { status: 401 });
    const body = await request.json() as Partial<WorkspaceSnapshot>;
    if (!Array.isArray(body.documents) || !Array.isArray(body.topics) || !Array.isArray(body.tasks)) {
      return Response.json({ error: "Workspace documents, topics, and tasks are required." }, { status: 400 });
    }
    if (body.documents.length > MAX_DOCUMENTS || body.documents.some((document) => typeof document.content !== "string" || document.content.length > 160_000)) {
      return Response.json({ error: "A workspace can store up to 20 text documents of 160 KB each." }, { status: 413 });
    }
    const totalContent = body.documents.reduce((total, document) => total + document.content.length, 0);
    if (totalContent > MAX_TOTAL_CONTENT) {
      return Response.json({ error: "This workspace exceeds the 1 MB total document limit." }, { status: 413 });
    }
    const snapshot: WorkspaceSnapshot = {
      documents: body.documents as WorkspaceSnapshot["documents"],
      topics: body.topics as WorkspaceSnapshot["topics"],
      tasks: body.tasks as WorkspaceSnapshot["tasks"],
      attempts: Number.isInteger(body.attempts) ? Math.max(0, Math.min(10_000, body.attempts as number)) : 0,
      analyticsOptIn: body.analyticsOptIn === true,
    };
    return Response.json(saveWorkspace(user.id, snapshot), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not save the workspace to SQLite." }, { status: 500 });
  }
}