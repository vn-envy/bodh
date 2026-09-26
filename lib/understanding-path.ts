import { MISCONCEPTIONS, type MisconceptionId } from "./understanding-checks.ts";
import {
  ancestorIds,
  prerequisiteEdges,
  type CurriculumEdge,
  type CurriculumGraph,
  type EvidenceIndex,
} from "./understanding-curriculum.ts";
import {
  dueStatements,
  isTopicFirm,
  statementRecord,
  statementState,
  topicEvidence,
  type UnderstandingLedger,
} from "./understanding-evidence.ts";

/**
 * Chooses Bodh's next suggestion on the Marble graph. Every suggestion carries
 * the evidence and canonical dependency that justify it, so the interface can
 * always say *why* this foothold comes next.
 */

export type ReviewItem = Readonly<{ topicId: string; evidenceIndex: EvidenceIndex }>;

export type ClimbSuggestion =
  | Readonly<{
      kind: "repair";
      topicId: string;
      fromTopicId: string;
      misconceptionId: MisconceptionId;
      confident: boolean;
      /** Canonical edges from the repair topic up to where the miss happened; empty for a diagnostic-support topic. */
      path: readonly CurriculumEdge[];
    }>
  | Readonly<{ kind: "review"; items: readonly ReviewItem[] }>
  | Readonly<{ kind: "step-down"; topicId: string; fromTopicId: string; edge: CurriculumEdge }>
  | Readonly<{ kind: "continue"; topicId: string }>
  | Readonly<{ kind: "climb"; topicId: string; because: readonly CurriculumEdge[] }>
  | Readonly<{ kind: "summit"; topicId: string }>;

export const MAX_REVIEW_ITEMS = 4;

function edgePath(graph: CurriculumGraph, from: string, to: string): CurriculumEdge[] | null {
  if (from === to) return [];
  const queue: Array<{ node: string; path: CurriculumEdge[] }> = [{ node: from, path: [] }];
  const seen = new Set([from]);
  while (queue.length > 0) {
    const { node, path } = queue.shift()!;
    for (const edge of graph.edges.filter((candidate) => candidate.from === node)) {
      if (seen.has(edge.to)) continue;
      const next = [...path, edge];
      if (edge.to === to) return next;
      seen.add(edge.to);
      queue.push({ node: edge.to, path: next });
    }
  }
  return null;
}

/** Due spaced checks, interleaved so consecutive items come from different topics. */
export function interleavedReview(graph: CurriculumGraph, ledger: UnderstandingLedger, now: number, limit = MAX_REVIEW_ITEMS) {
  const due = dueStatements(ledger, now, new Set(graph.order));
  const byTopic = new Map<string, ReviewItem[]>();
  for (const item of due) byTopic.set(item.topicId, [...(byTopic.get(item.topicId) ?? []), item]);
  const queues = [...byTopic.values()];
  const items: ReviewItem[] = [];
  while (items.length < limit && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next && items.length < limit) items.push({ topicId: next.topicId, evidenceIndex: next.evidenceIndex });
    }
  }
  return items;
}

function repairSuggestion(graph: CurriculumGraph, ledger: UnderstandingLedger, now: number): ClimbSuggestion | null {
  const misses = graph.order
    .flatMap((topicId) => topicEvidence(ledger, topicId, now).misses.map((miss) => ({ ...miss, topicId })))
    .filter((miss) => miss.misconceptionId !== null && miss.confidence !== "guess")
    .sort((left, right) => right.at - left.at || (left.confidence === "sure" ? -1 : 1));

  for (const miss of misses) {
    const misconceptionId = miss.misconceptionId!;
    const rootTopicId = MISCONCEPTIONS[misconceptionId].rootTopicId;
    if (!rootTopicId || rootTopicId === miss.topicId || !graph.topicById.has(rootTopicId)) continue;
    if (isTopicFirm(ledger, rootTopicId, now)) continue;
    // A root above the missed topic would not be a repair; only descend or move sideways to support.
    if (ancestorIds(graph, rootTopicId).has(miss.topicId)) continue;
    return {
      kind: "repair",
      topicId: rootTopicId,
      fromTopicId: miss.topicId,
      misconceptionId,
      confident: miss.confidence === "sure",
      path: edgePath(graph, rootTopicId, miss.topicId) ?? [],
    };
  }
  return null;
}

function stepDownSuggestion(graph: CurriculumGraph, ledger: UnderstandingLedger, focusTopicId: string, now: number): ClimbSuggestion | null {
  const evidence = topicEvidence(ledger, focusTopicId, now);
  if (evidence.misses.length === 0) return null;
  const candidates = prerequisiteEdges(graph, focusTopicId, "hard")
    .filter((edge) => !isTopicFirm(ledger, edge.from, now))
    .sort((left, right) => graph.order.indexOf(right.from) - graph.order.indexOf(left.from));
  const edge = candidates[0];
  return edge ? { kind: "step-down", topicId: edge.from, fromTopicId: focusTopicId, edge } : null;
}

function fringeTopic(graph: CurriculumGraph, ledger: UnderstandingLedger, candidates: readonly string[], now: number) {
  for (const topicId of graph.order) {
    if (!candidates.includes(topicId) || isTopicFirm(ledger, topicId, now)) continue;
    const hard = prerequisiteEdges(graph, topicId, "hard");
    if (hard.every((edge) => isTopicFirm(ledger, edge.from, now))) {
      return { topicId, because: prerequisiteEdges(graph, topicId).filter((edge) => isTopicFirm(ledger, edge.from, now)) };
    }
  }
  return null;
}

export function nextClimbSuggestion(
  graph: CurriculumGraph,
  ledger: UnderstandingLedger,
  now: number,
  focusTopicId?: string | null,
): ClimbSuggestion {
  const repair = repairSuggestion(graph, ledger, now);
  if (repair) return repair;

  const review = interleavedReview(graph, ledger, now);
  if (review.length > 0) return { kind: "review", items: review };

  const focus = focusTopicId && graph.topicById.has(focusTopicId) ? focusTopicId : null;
  if (focus && !isTopicFirm(ledger, focus, now)) {
    return stepDownSuggestion(graph, ledger, focus, now) ?? { kind: "continue", topicId: focus };
  }

  const goal = graph.goalTopicId;
  const towardGoal = [...ancestorIds(graph, goal), goal];
  const next = fringeTopic(graph, ledger, towardGoal, now) ?? fringeTopic(graph, ledger, graph.order, now);
  if (next) return { kind: "climb", topicId: next.topicId, because: next.because };
  return { kind: "summit", topicId: goal };
}

/**
 * Which evidence statements to check during one visit to a topic: anything not
 * yet firm first, then anything due. A fully firm topic is revisited whole.
 */
export function topicVisitPlan(ledger: UnderstandingLedger, topicId: string, now: number): readonly EvidenceIndex[] {
  const indices = [0, 1, 2] as const;
  const unsettled = indices.filter((index) => {
    const state = statementState(statementRecord(ledger, topicId, index));
    return state !== "firm" && state !== "lasting";
  });
  if (unsettled.length > 0) return unsettled;
  const due = topicEvidence(ledger, topicId, now).dueIndices;
  return due.length > 0 ? due : indices;
}
