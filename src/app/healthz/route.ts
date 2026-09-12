// Liveness only: answers from process state, never touches Supabase. A database
// blip should page, not make the orchestrator kill and restart every container.
const startedAt = Date.now();

export function GET() {
  return new Response(
    JSON.stringify({
      status: "ok",
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}
