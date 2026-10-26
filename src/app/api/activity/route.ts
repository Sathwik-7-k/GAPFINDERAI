import { clearActivity, listActivity, loadWorkspace, recordActivity, updateAnalyticsConsent, type ActivityEventInput } from "@/lib/workspace-db";

const allowedKinds = new Set<ActivityEventInput["kind"]>(["page_view", "topic_view", "study_time", "task_completed", "diagnostic"]);

export async function GET() {
  try {
    const workspace = loadWorkspace();
    return Response.json({ analyticsOptIn: workspace.analyticsOptIn, events: listActivity() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not read activity from the local database." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { consent?: unknown; event?: Partial<ActivityEventInput> };
    if (typeof body.consent === "boolean") {
      updateAnalyticsConsent(body.consent);
      return Response.json({ analyticsOptIn: body.consent });
    }
    if (!body.event || !allowedKinds.has(body.event.kind as ActivityEventInput["kind"])) {
      return Response.json({ error: "Choose a supported in-app activity event." }, { status: 400 });
    }
    const event: ActivityEventInput = {
      kind: body.event.kind as ActivityEventInput["kind"],
      page: typeof body.event.page === "string" ? body.event.page.slice(0, 40) : undefined,
      topicId: typeof body.event.topicId === "string" ? body.event.topicId.slice(0, 80) : undefined,
      documentId: typeof body.event.documentId === "string" ? body.event.documentId.slice(0, 80) : undefined,
      durationSeconds: Number.isInteger(body.event.durationSeconds) ? Math.max(0, Math.min(3600, body.event.durationSeconds as number)) : 0,
      score: Number.isInteger(body.event.score) ? Math.max(0, Math.min(100, body.event.score as number)) : undefined,
    };
    return Response.json({ recorded: recordActivity(event) }, { status: 202 });
  } catch {
    return Response.json({ error: "Could not save this activity event." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    clearActivity();
    return Response.json({ cleared: true });
  } catch {
    return Response.json({ error: "Could not clear activity history." }, { status: 500 });
  }
}