export const runtime = "edge";
export const config = { runtime: "experimental-edge" };

// IMPORTANT:
// Cloudflare Pages Edge runtime does NOT support Node.js APIs like Buffer, streams,
// or packages like "archiver" in this pages/api route.
// This route is temporarily disabled for Cloudflare deployment.
// Later you can move this logic to a Node-compatible backend.

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      error: "Inspection pack export is not available on this hosting (Edge runtime).",
      detail:
        "This endpoint uses Node-only ZIP streaming (archiver/Buffer). Deploy it on a Node backend, or move it to a compatible function.",
    }),
    {
      status: 501,
      headers: { "Content-Type": "application/json" },
    }
  );
}
