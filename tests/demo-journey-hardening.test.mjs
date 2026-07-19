import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DEMO_JOURNEY_COPY,
  JOURNEY_ENTRY_COPY,
  receiptShareText,
  routeStartButtonText,
} from "../lib/demo-journey-copy.ts";
import { REPAIR_ENTRY_ATOM_IDS } from "../lib/adaptive-repair.ts";

const journeySource = await readFile(
  new URL("../app/demo/DemoJourney.tsx", import.meta.url),
  "utf8",
);
const receiptCardSource = await readFile(
  new URL("../lib/receipt-card.ts", import.meta.url),
  "utf8",
);
const labRepresentationSource = await readFile(
  new URL("../app/components/FractionLabRepresentation.tsx", import.meta.url),
  "utf8",
);
const visualChecksSource = await readFile(
  new URL("../app/components/JourneyVisualChecks.tsx", import.meta.url),
  "utf8",
);
const progressPathSource = await readFile(
  new URL("../app/components/ProgressPath.tsx", import.meta.url),
  "utf8",
);
const explainerSource = await readFile(
  new URL("../app/components/FractionConceptExplainer.tsx", import.meta.url),
  "utf8",
);

function assertLocalizedTree(value, path = "copy") {
  assert.ok(value && typeof value === "object", `${path} must be an object`);
  if (Object.hasOwn(value, "hi") || Object.hasOwn(value, "en")) {
    assert.deepEqual(Object.keys(value).sort(), ["en", "hi"], `${path} must only contain hi/en`);
    assert.ok(value.hi.length > 0, `${path}.hi must not be empty`);
    assert.ok(value.en.length > 0, `${path}.en must not be empty`);
    return;
  }
  for (const [key, child] of Object.entries(value)) assertLocalizedTree(child, `${path}.${key}`);
}

test("journey and receipt copy stays fully bilingual and all seven atoms are configured", () => {
  assertLocalizedTree(DEMO_JOURNEY_COPY);
  assert.deepEqual(Object.keys(JOURNEY_ENTRY_COPY), REPAIR_ENTRY_ATOM_IDS);
  for (const atomId of REPAIR_ENTRY_ATOM_IDS) {
    assert.equal(JOURNEY_ENTRY_COPY[atomId].number, REPAIR_ENTRY_ATOM_IDS.indexOf(atomId) + 1);
    assertLocalizedTree(JOURNEY_ENTRY_COPY[atomId].label, `${atomId}.label`);
    assertLocalizedTree(JOURNEY_ENTRY_COPY[atomId].reason, `${atomId}.reason`);
  }
  assert.equal(routeStartButtonText("hi", JOURNEY_ENTRY_COPY["chosen-whole"].label), "पूरा पहचानना से शुरू करें");
  assert.equal(routeStartButtonText("en", JOURNEY_ENTRY_COPY["chosen-whole"].label), "Start with Choose the whole");
});

test("share receipt text is deterministic, bilingual, and privacy-minimised", () => {
  for (const language of ["hi", "en"]) {
    for (const variant of ["independent", "supported", "curated"]) {
      const first = receiptShareText(language, variant);
      assert.equal(receiptShareText(language, variant), first);
      assert.match(first, /Bodh/);
      assert.match(first, /long-term mastery|mastery claim/i);
      assert.doesNotMatch(first, /learner|trace|probe-|adaptive-repair|मुझे समझ नहीं आता/i);
    }
  }
});

test("journey source preserves the adaptive handoff until receipt or an explicit restart", () => {
  const hydrationEffect = journeySource.slice(
    journeySource.indexOf("useEffect(() => {\n    let parsed"),
    journeySource.indexOf("useEffect(() => {\n    if (step !== \"receipt\")"),
  );
  assert.match(hydrationEffect, /sessionStorage\.getItem\(ADAPTIVE_SESSION_STORAGE_KEY\)/);
  assert.doesNotMatch(hydrationEffect, /removeItem/);
  assert.match(journeySource, /if \(step !== "receipt"\) return;[\s\S]*?sessionStorage\.removeItem\(ADAPTIVE_SESSION_STORAGE_KEY\)/);
  assert.match(journeySource, /const startAnotherDoubt[\s\S]*?sessionStorage\.removeItem\(ADAPTIVE_SESSION_STORAGE_KEY\)/);
});

test("journey UI keeps diagnostics actionable and keyboard-safe", () => {
  assert.match(journeySource, /disabled=\{!probeAnswer\}/);
  assert.match(journeySource, /beginJourney\(curatedProbeEntryAtomId\(probeAnswer\)\)/);
  assert.doesNotMatch(journeySource, /disabled=\{probeAnswer !== "4"\}/);
  assert.match(journeySource, /className="quiet-action path-review-all"/);
  assert.match(journeySource, /onClick=\{\(\) => setEntryStageId\("chosen-whole"\)\}/);
  assert.match(journeySource, /key=\{entryStageId\}/);
  assert.equal((journeySource.match(/<form className="answer-form" onSubmit=/g) ?? []).length, 2);
  assert.equal((journeySource.match(/type="submit"/g) ?? []).length, 2);
  assert.match(journeySource, /type="submit"\n\s+disabled=\{transferState === "correct" && !meaningChoice\}/);
});

test("route, lab, and receipt enforce their evidence invariants", () => {
  assert.match(journeySource, /REPAIR_ENTRY_ATOM_IDS\.map/);
  assert.match(journeySource, /relation = index < suggestedIndex \? "before"/);
  assert.match(journeySource, /adaptive-route-\$\{relation\}/);
  assert.match(journeySource, /adaptive-route-status/);
  assert.match(journeySource, /canIssueAdaptiveReceipt\(evidence\)/);
  assert.match(journeySource, /adaptiveSession && adaptiveReceiptReady/);
  assert.match(journeySource, /<FractionLabRepresentation/);
  assert.match(labRepresentationSource, /disabled=\{!inTarget \|\| \(!placed && !tileSelected\)\}/);
  assert.match(journeySource, /toggleLabTile\(current, slot\)/);
  assert.match(journeySource, /shareReceiptCard/);
  assert.match(receiptCardSource, /navigatorBridge\.share\(fileShare\)/);
  assert.match(receiptCardSource, /navigatorBridge\.clipboard\?\.writeText/);
  assert.match(journeySource, /window\.print\(\)/);
});

test("curated checks use learner-built pictures and Bodh travels across five distinct stops", () => {
  assert.match(journeySource, /<QuarterProbeArtifact language=\{language\} answer=\{probeAnswer\}/);
  assert.equal((journeySource.match(/<FractionGroupBuilder/g) ?? []).length, 2);
  assert.doesNotMatch(journeySource, /name="transfer-answer"|name="return-answer"/);
  assert.doesNotMatch(visualChecksSource, /<input\b/);
  assert.match(visualChecksSource, /!answer \? \(/, "the probe must keep a separate pre-choice state");
  assert.match(visualChecksSource, /aria-pressed=\{selected\}/);
  assert.match(visualChecksSource, /aria-pressed=\{isCounted\}/);
  assert.match(visualChecksSource, /counted\.length === 0 \|\| countComplete/);
  assert.match(visualChecksSource, /`\$\{counted\.length\}\/\$\{unitDenominator\}`/);
  assert.match(journeySource, /isFractionGroupBuildComplete\(/);
  assert.doesNotMatch(journeySource, /probeAnswer === "4" \? "celebrate"/);

  assert.match(progressPathSource, /"Question", "Understand", "Build", "New question", "Yours again"/);
  assert.match(progressPathSource, /<BodhMark/);
  assert.match(journeySource, /if \(step === "return"\) return 5;/);
  assert.match(journeySource, /return 6;/);
});

test("narration prepares on entry and one ready tap starts without granting passive evidence", () => {
  assert.match(explainerSource, /useState<VoiceState>\("loading"\)/);
  assert.match(explainerSource, /void prepareNarration\(\);/);
  assert.match(explainerSource, /disabled=\{voiceState === "loading"\}/);
  assert.match(explainerSource, /voiceState === "ready" \? "atomic-play-ready"/);
  assert.doesNotMatch(explainerSource, /press again when ready|तैयार होने पर फिर दबाओ/i);

  const playbackBlock = explainerSource.slice(
    explainerSource.indexOf("const playNarration"),
    explainerSource.indexOf("const prepareNarration"),
  );
  assert.doesNotMatch(playbackBlock, /markStageEvidence|setProved\(true\)/);
  assert.doesNotMatch(playbackBlock, /source:\s*"device"/, "a playback failure must not replace Bodh's voice");
  assert.match(explainerSource, /voiceSessionRef/);
  assert.match(explainerSource, /voiceURI/);
  assert.match(explainerSource, /utterance\.voice = voice/);
  assert.doesNotMatch(explainerSource, /remoteVoiceAvailableRef/);
  assert.match(explainerSource, /proved \|\| voiceVisualActive/);
  assert.match(explainerSource, /setVoiceVisualActive\(true\)/);
  const preparationBlock = explainerSource.slice(
    explainerSource.indexOf("const prepareNarration"),
    explainerSource.indexOf("const handleVoiceButton"),
  );
  assert.doesNotMatch(preparationBlock, /markStageEvidence|setProved\(true\)/);
  assert.match(preparationBlock, /currentSession\?\.source === "openai"/);
  assert.match(preparationBlock, /setVoiceState\("unavailable"\)/);
  const evidenceBlock = explainerSource.slice(
    explainerSource.indexOf("const takePrimaryAction"),
    explainerSource.indexOf("useEffect(() => {\n    const playbackKey"),
  );
  assert.match(evidenceBlock, /markStageEvidence\(stage\.id\)/);
  assert.match(evidenceBlock, /setProved\(true\)/);
});
