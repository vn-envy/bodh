import { worldToolManifest } from "../lib/world-tools";

/**
 * `GET /api/tools` — the same tool descriptions the browser registers with
 * WebMCP, so server-side agents and documentation cannot drift from the code.
 */
export function handleToolsManifest(request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "content-type": "application/json; charset=utf-8", allow: "GET, HEAD" },
    });
  }
  const body = JSON.stringify(worldToolManifest());
  return new Response(request.method === "HEAD" ? null : body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",
      "x-content-type-options": "nosniff",
    },
  });
}
