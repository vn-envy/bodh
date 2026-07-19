import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/design-refinement.css", import.meta.url), "utf8");
const progressSource = await readFile(new URL("../app/components/ProgressPath.tsx", import.meta.url), "utf8");
const journeySource = await readFile(new URL("../app/demo/DemoJourney.tsx", import.meta.url), "utf8");
const climbSource = await readFile(new URL("../app/components/CurriculumClimb.tsx", import.meta.url), "utf8");

function ruleBodies(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "g"))].map((match) => match[1]);
}

function assertContainedMascot(selector) {
  const bodies = ruleBodies(selector);
  assert.ok(bodies.length > 0, `${selector} must have an explicit layout contract`);
  for (const body of bodies) {
    assert.doesNotMatch(body, /position:\s*absolute/);
    assert.doesNotMatch(body, /(?:top|right|bottom|left):\s*-\d/);
  }
}

test("every journey mascot owns layout space instead of floating over copy", () => {
  for (const selector of [
    ".progress-bodh-slot",
    ".adaptive-route-bodh",
    ".climb-bodh",
    ".lesson-climb-current .lesson-climb-bodh",
  ]) assertContainedMascot(selector);

  const progressSlot = progressSource.indexOf('<span className="progress-bodh-slot"');
  const progressCondition = progressSource.indexOf("{carriesBodh && (", progressSlot);
  const progressClose = progressSource.indexOf("</span>", progressCondition);
  assert.ok(progressSlot >= 0 && progressCondition > progressSlot && progressClose > progressCondition);
  assert.match(journeySource, /className="adaptive-route-node-copy"/);
  assert.match(journeySource, /className="adaptive-route-text"/);
  assert.match(climbSource, /className="lesson-climb-bodh"/);
});

test("stage headings and path nodes reserve bounded responsive tracks for Bodh", () => {
  const stageRules = ruleBodies(".stage-with-bodh");
  assert.ok(stageRules.some((body) => /display:\s*grid/.test(body) && /minmax\(0, 1fr\)/.test(body)));
  assert.match(css, /\.stage-with-bodh\s*>\s*:first-child\s*\{[^}]*min-width:\s*0/s);
  assert.match(css, /\.adaptive-route-start\s*>\s*\.adaptive-route-node-copy\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 42px/s);
  assert.match(css, /\.climb-node-here\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 48px/s);
  assert.match(css, /\.lesson-climb-path \.lesson-climb-current\s*\{[^}]*grid-template-columns:\s*32px minmax\(0, 1fr\) 44px/s);
});
