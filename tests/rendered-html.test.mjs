import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
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
  assert.match(html, /\/art\/bodh\/bodh-listen-512\.webp/);
  assert.match(html, /\/art\/bodh\/bodh-guide-512\.webp/);
  assert.match(html, /\/art\/bodh\/bodh-tinker-1024\.webp/);
  assert.match(html, /3\/4 = 6\/8/);
  assert.match(html, /Real Marble route/);
  assert.match(html, /सबसे पहली डगमगाती पकड़/);
  assert.match(html, /3\/4 को eighths में देखें/);
  assert.match(html, /Bodh voice/);
  assert.match(html, /हिंदी/);
  assert.match(html, /English/);
  assert.match(html, /Evaluating Bodh\?/);
  assert.match(html, /90-second guided path/);
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

test("server-renders a stable hydration handoff shell before choosing the journey route", async () => {
  const response = await render("/demo");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /तुम्हारा रास्ता तैयार हो रहा है/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /Curated fraction journey · Bodh/);
  assert.match(html, /Bodh voice/);
  assert.doesNotMatch(html, /पहले जाँच लें कि हमने सही सुना/);
  assert.doesNotMatch(html, /3\/4<\/span><span>÷<\/span><span>1\/8<\/span><span>= 6/);
  assert.doesNotMatch(html, /Phase 0 foundation ready/);
});

test("ships the atomic explainer without a pre-lab answer leak", async () => {
  const [component, authoredSequence, journey, journeyCopy] = await Promise.all([
    readFile(new URL("../app/components/FractionConceptExplainer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/fraction-concept.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/demo/DemoJourney.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/demo-journey-copy.ts", import.meta.url), "utf8"),
  ]);
  const html = `${component}\n${authoredSequence}\n${journey}\n${journeyCopy}`;

  assert.match(html, /पहले, पूरा चुनो/);
  assert.match(html, /पूरी पट्टी चुनो/);
  assert.match(html, /Bodh से सुनो/);
  assert.match(html, /AI से बनी Bodh की आवाज़ · इंसान की recording नहीं/);
  assert.match(html, /Bodh की पूरी बात पढ़ें/);
  assert.match(html, /Replay from start/);
  assert.match(html, /atomic-pointer-tip/);
  assert.match(html, /atomic-artifact-caption/);
  assert.match(component, /const pointerBeat = activeBeat;/);
  assert.match(component, /preparedVoiceRef\.current\.language === language/);
  assert.match(component, /querySelectorAll<HTMLElement>/);
  assert.match(component, /media\.onplaying = \(\) =>/);
  assert.match(component, /utterance\.onstart = \(\) =>/);
  assert.match(component, /data-progress-state/);
  assert.match(component, /not repeated on this route; review is available in the full journey/);
  assert.doesNotMatch(component, /checked by the probe/);
  assert.match(component, /lang=\{language\}/);
  assert.match(journey, /ADAPTIVE_SESSION_STORAGE_KEY/);
  assert.match(journeyCopy, /सिर्फ answer नहीं—meaning भी/);
  assert.match(journeyCopy, /long-term mastery, grade, या score का दावा नहीं/);
  assert.doesNotMatch(component, /pointerBeat = activeBeat \?\?/);
  assert.doesNotMatch(html, /six pieces of 1\/8/);
  assert.doesNotMatch(html, /placeholder="जैसे (4|6)"/);

  const playbackBlock = component.slice(
    component.indexOf("const playNarration"),
    component.indexOf("const prepareNarration"),
  );
  const preparationBlock = component.slice(
    component.indexOf("const prepareNarration"),
    component.indexOf("const handleVoiceButton"),
  );
  assert.match(playbackBlock, /markStageEvidence\(stage\.id\);\s+setVoiceState\("ended"\)/);
  assert.doesNotMatch(preparationBlock, /markStageEvidence|setProved\(true\)/);
  assert.match(component, /disabled=\{stageIndex === entryStageIndex && !proved\}/);
});

test("requires explicit confirmation for low-confidence photo notation", async () => {
  const [intake, styles] = await Promise.all([
    readFile(new URL("../app/diagnose/DiagnosticIntake.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(intake, /imageFile && liveDiagnosis && liveDiagnosis\.inputFidelity\.confidence < 0\.85/);
  assert.match(intake, /aria-pressed=\{notationConfirmed\}/);
  assert.match(intake, /disabled=\{!canUseProbe\}/);
  assert.match(intake, /!adaptiveProbe \|\| !selectedProbe \|\| !canUseProbe/);
  assert.match(intake, /lang=\{probeLanguage\}/);
  assert.match(intake, /notation-confirmation-title/);
  assert.match(styles, /\.atomic-progress-not-repeated span/);
  assert.doesNotMatch(styles, /\.atomic-progress-checked span/);
  assert.match(styles, /\.adaptive-route-checked \{[^}]*opacity: 1;/s);
});

test("server-renders the diagnostic intake and the judge-readable learning path", async () => {
  const intake = await render("/diagnose");
  assert.equal(intake.status, 200);
  const intakeHtml = await intake.text();
  assert.match(intakeHtml, /सवाल लिखो। फिर बताओ कि कहाँ अटक गए।/);
  assert.match(intakeHtml, /चाहो तो photo जोड़ो/);
  assert.match(intakeHtml, /Bodh को समझने दें/);

  const guide = await render("/how-it-works");
  assert.equal(guide.status, 200);
  const guideHtml = await guide.text();
  assert.match(guideHtml, /Bodh का छोटा promise/);
  assert.match(guideHtml, /इसलिए demo में answer पहले नहीं आता।/);
  assert.match(guideHtml, /32 synthetic cases/);
  assert.match(guideHtml, /8\/8/);
  assert.match(guideHtml, /how-it-works/);

  const judgeTour = await render("/judge-tour/seed-01");
  assert.equal(judgeTour.status, 200);
  const judgeHtml = await judgeTour.text();
  assert.match(judgeHtml, /90-second judge tour/);
  assert.match(judgeHtml, /Committed fixture/);
  assert.match(judgeHtml, /seed-01/);
  assert.doesNotMatch(judgeHtml, /= 6|answer is 6/i);
});
