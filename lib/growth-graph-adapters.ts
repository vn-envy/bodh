import type { AdaptiveEvidenceEvent } from "./adaptive-repair.ts";
import { EVAPORATION_CONCEPT_STAGES } from "./evaporation-concept.ts";
import type { EvaporationJourneyAction, EvaporationJourneyState } from "./evaporation-journey.ts";
import type { GrowthEvent } from "./growth-graph.ts";

/** The Marble target the fraction journeys ultimately serve. */
export const FRACTION_TARGET_TOPIC_ID = "mt_9Y96vxG_LH";
/** The Marble target the evaporation journey serves. */
export const WATER_TARGET_TOPIC_ID = "mt_Qkewo5M3_c";

/**
 * Translates the existing curated/adaptive fraction journey into growth
 * events so `/demo` feeds the same graph as Bodh Van without being rewritten.
 */
export function adaptiveEvidenceEventToGrowth(event: AdaptiveEvidenceEvent, entryAtomId: string | null): GrowthEvent[] {
  switch (event.type) {
    case "probe-answered":
      return entryAtomId ? [{ type: "probe-answered", nodeId: entryAtomId }] : [];
    case "journey-started":
      return [{ type: "place-visited", nodeIds: [event.entryAtomId] }];
    case "atom-completed":
      return [{ type: "atom-completed", nodeId: event.atomId }];
    case "lab-completed":
      return [{ type: "station-attempt", nodeId: "division-unknown-factor", success: true }];
    case "transfer-attempted":
      return [{
        type: "transfer-attempted",
        nodeIds: ["division-unknown-factor", FRACTION_TARGET_TOPIC_ID],
        correct: event.correct,
      }];
    case "conceptual-repair-started":
      return [{ type: "station-attempt", nodeId: event.atomId, success: false }];
    case "return-attempted":
      return [{ type: "transfer-attempted", nodeIds: [FRACTION_TARGET_TOPIC_ID], correct: event.correct }];
    default:
      return [];
  }
}

/**
 * Translates the fixed-screen evaporation journey. `previous` is the state the
 * action is applied to, which tells us which concept stage was just completed.
 */
export function evaporationActionToGrowth(
  action: EvaporationJourneyAction,
  previous: EvaporationJourneyState,
): GrowthEvent[] {
  switch (action.type) {
    case "start":
      return [{ type: "probe-answered", nodeId: "notice-puddle" }];
    case "advance-concept": {
      if (previous.screen.kind !== "concept") return [];
      const stage = EVAPORATION_CONCEPT_STAGES[previous.screen.stageIndex];
      return stage ? [{ type: "atom-completed", nodeId: stage.id }] : [];
    }
    case "place-lid":
      return [{ type: "station-attempt", nodeId: "cooling-cloud", success: true }];
    case "complete-transfer":
      return [{ type: "transfer-attempted", nodeIds: ["cooling-cloud", WATER_TARGET_TOPIC_ID], correct: true }];
    default:
      return [];
  }
}
