export const runtime = "edge";

export async function POST() {
  return new Response(
    JSON.stringify({
      error: "Inspection pack export is temporarily disabled on Cloudflare Pages.",
      detail:
        "This endpoint uses Node-only ZIP streaming (archiver/Buffer). You can enable it later on a Node hosting.",
    }),
    {
      status: 501,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export async function GET() {
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
}
