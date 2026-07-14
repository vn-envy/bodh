import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
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
  assert.match(html, /\/art\/bodh\/bodh-listen-1024\.webp/);
  assert.match(html, /3\/4 को eighths में देखें/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("ships the complete responsive Bodh pose set", async () => {
  const poses = ["welcome", "listen", "guide", "tinker", "celebrate"];
  for (const pose of poses) {
    for (const size of [512, 1024]) {
      const asset = new URL(`../public/art/bodh/bodh-${pose}-${size}.webp`, import.meta.url);
      const details = await stat(asset);
      assert.ok(details.size > 20_000, `${pose}-${size} should be a production image asset`);
    }
  }
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

test("server-renders the diagnostic intake and the judge-readable learning path", async () => {
  const intake = await render("/diagnose");
  assert.equal(intake.status, 200);
  const intakeHtml = await intake.text();
  assert.match(intakeHtml, /सवाल लिखो। फिर बताओ कि कहाँ अटक गए।/);
  assert.match(intakeHtml, /Photo जोड़ना चाहो तो जोड़ो/);
  assert.match(intakeHtml, /Bodh को समझने दें/);

  const guide = await render("/how-it-works");
  assert.equal(guide.status, 200);
  const guideHtml = await guide.text();
  assert.match(guideHtml, /Bodh का छोटा promise/);
  assert.match(guideHtml, /इसलिए demo में answer पहले नहीं आता।/);
  assert.match(guideHtml, /how-it-works/);
});
