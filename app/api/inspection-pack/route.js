export const runtime = "edge";

export async function POST() {
  // IMPORTANT:
  // Cloudflare Pages Edge runtime does NOT support Node.js APIs like Buffer/streams,
  // and packages like "archiver". So the ZIP export must be moved to a Node backend later.
  return new Response(
    JSON.stringify({
      error: "Inspection pack export is not available on this hosting (Edge runtime).",
      detail:
        "This endpoint uses Node-only ZIP streaming (archiver/Buffer). Deploy it on a Node backend later.",
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
