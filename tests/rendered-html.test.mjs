import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Bodh learner shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="hi">/i);
  assert.match(html, /<title>Bodh — That which is truly understood<\/title>/i);
  assert.match(html, /अपना सवाल लाओ/);
  assert.match(html, /3\/4/);
  assert.match(html, /Curated demo/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("server-renders the Phase 1 journey at its learner-controlled confirmation step", async () => {
  const response = await render("/demo");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /तुम्हारा सवाल/);
  assert.match(html, /पहले जाँच लें कि हमने सही सुना/);
  assert.match(html, /हाँ, यही मेरा सवाल है/);
  assert.match(html, /3\/4/);
  assert.match(html, /Curated fraction journey · Bodh/);
  assert.doesNotMatch(html, /3\/4<\/span><span>÷<\/span><span>1\/8<\/span><span>= 6/);
  assert.doesNotMatch(html, /Phase 0 foundation ready/);
});
