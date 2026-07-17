import type { BodhPose } from "../app/components/BodhMark";

export const SELECTED_JUDGE_SEED = {
  caseId: "seed-01",
  title: "Hero doubt: rule without meaning",
  problem: "3/4 ÷ 1/8 = ?",
  visibleWork: "3/4 × 8/1",
  learnerWords: "मुझे समझ नहीं आता कि इसे उल्टा करके multiply क्यों करते हैं।",
  tourHref: "/judge-tour/seed-01",
  journeyHref: "/demo?seed=seed-01&judge=1",
} as const;
export const JUDGE_TOUR_STEPS = [
  {
    id: "listen",
    time: "0–15 sec",
    shortLabel: "Listen",
    title: "Start with the learner’s exact doubt.",
    body: "Bodh preserves the equation, visible work, and the learner’s own words. It does not infer a polished solution or replace what the child actually said.",
    evidence: "Input fidelity before interpretation",
    pose: "listen",
  },
  {
    id: "diagnose",
    time: "15–35 sec",
    shortLabel: "Diagnose",
    title: "Find one idea worth checking.",
    body: "A bounded curriculum slice and one short probe help distinguish a remembered rule from an understood relationship. The probe chooses where teaching begins; it is not a grade.",
    evidence: "Probe before teaching, never an answer dump",
    pose: "guide",
  },
  {
    id: "repair",
    time: "35–70 sec",
    shortLabel: "Repair",
    title: "Rebuild the relationship in small visual steps.",
    body: "Bodh moves from the chosen whole to equal parts, unit size, numerator count, equivalent repartition, repeated composition, and division as a missing count.",
    evidence: "Seven authored ideas; one visible action at a time",
    pose: "tinker",
  },
  {
    id: "transfer",
    time: "70–90 sec",
    shortLabel: "Transfer",
    title: "Ask the learner to use the idea again.",
    body: "The learner builds the original relationship, tries a new problem, explains what the number means, and returns to the first doubt. The receipt records this session only—not long-term mastery.",
    evidence: "Action-backed session evidence, not a score",
    pose: "celebrate",
  },
] as const satisfies readonly {
  id: string;
  time: string;
  shortLabel: string;
  title: string;
  body: string;
  evidence: string;
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
