import type { BodhPose } from "../app/components/BodhMark";

export const JUDGE_TOUR_HREF = "/judge-tour" as const;

export const JUDGE_SEEDS = {
  mathematics: {
    caseId: "seed-01",
    subject: "Mathematics",
    title: "Rule remembered, meaning missing",
    problem: "3/4 ÷ 1/8 = ?",
    visibleWork: "3/4 × 8/1",
    learnerWords: "मुझे समझ नहीं आता कि इसे उल्टा करके multiply क्यों करते हैं।",
  },
  science: {
    caseId: "seed-09",
    subject: "Science",
    title: "Where did the puddle water go?",
    problem: "धूप में puddle का पानी गायब कहाँ हो गया?",
    visibleWork: "Puddle → धूप → गायब",
    learnerWords: "मुझे लगता है Sun ने पानी पी लिया या पानी खत्म हो गया—वह हवा में कैसे जा सकता है?",
  },
} as const;

export const JUDGE_TOUR_STEPS = [
  { id: "promise", shortLabel: "Promise", pose: "listen" },
  { id: "mathematics", shortLabel: "Maths", pose: "tinker" },
  { id: "science", shortLabel: "Science", pose: "guide" },
  { id: "transfer", shortLabel: "Transfer", pose: "tinker" },
  { id: "complete", shortLabel: "Complete", pose: "celebrate" },
] as const satisfies readonly {
  id: string;
  shortLabel: string;
  pose: BodhPose;
}[];

export const DIAGNOSTIC_RELEASE_EVIDENCE = {
  corpus: {
    seeds: 8,
    development: 16,
    frozenHoldout: 8,
    total: 32,
  },
  checks: [
    "Exact equation and visible-token preservation",
    "Grounding inside the committed Marble curriculum slice",
    "Plausible misconception, probe-before-teaching, and Hindi bridge behavior",
    "Bounded, privacy-minimised trace fields with matching model and prompt metadata",
  ],
  recordedLiveResult: {
    generatedAt: "2026-07-16T20:24:29.745Z",
    sourceCommit: "dc75a17f3870d80675315fe45a1b448770fb6127",
    suite: "all-32",
    passed: 32,
    failed: 0,
    frozenHoldoutPassed: 8,
    model: "gpt-5.6",
    promptVersion: "p3.7",
  },
  boundary:
    "This is a synthetic diagnostic-safety result for one recorded model, prompt, corpus, and source commit. It is not evidence of classroom efficacy, long-term mastery, or learner outcomes.",
} as const;
