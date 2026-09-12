import {
  authenticateRequest,
  corsPreflight,
  failure,
  json,
} from "@/lib/api-auth.server";
import { resumeInstance, stopInstance } from "@/lib/rentgpu.server";

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;

  const { id, action } = await params;
  if (!["start", "stop", "terminate"].includes(action)) {
    return json(
      {
        error: "unknown_action",
        message: "Use start, stop or terminate.",
      },
      404,
    );
  }
  try {
    if (action === "start") {
      await resumeInstance(auth.userId, id);
      return json({ ok: true, status: "running" });
    }
    await stopInstance(auth.userId, id, action === "terminate");
    return json({
      ok: true,
      status: action === "terminate" ? "terminated" : "stopped",
    });
  } catch (err) {
    return failure(err, request);
  }
}
