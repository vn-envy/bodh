export const EVAPORATION_STAGE_COUNT = 5 as const;

export type EvaporationJourneyScreen =
  | Readonly<{ kind: "probe" }>
  | Readonly<{ kind: "concept"; stageIndex: number }>
  | Readonly<{ kind: "bridge" }>
  | Readonly<{ kind: "transfer-evidence" }>
  | Readonly<{ kind: "transfer-choice" }>
  | Readonly<{ kind: "transfer-success" }>
  | Readonly<{ kind: "receipt" }>;

export type EvaporationJourneyState = Readonly<{
  screen: EvaporationJourneyScreen;
  furthestConcept: number;
  transferUnlocked: boolean;
  transferCompleted: boolean;
}>;

export type EvaporationJourneyAction =
  | Readonly<{ type: "start" }>
  | Readonly<{ type: "advance-concept" }>
  | Readonly<{ type: "begin-transfer" }>
  | Readonly<{ type: "place-lid" }>
  | Readonly<{ type: "complete-transfer" }>
  | Readonly<{ type: "show-receipt" }>
  | Readonly<{ type: "review-probe" }>
  | Readonly<{ type: "review-concept"; stageIndex: number }>
  | Readonly<{ type: "review-transfer" }>
  | Readonly<{ type: "restart" }>;

export const INITIAL_EVAPORATION_JOURNEY: EvaporationJourneyState = {
  screen: { kind: "probe" },
  furthestConcept: -1,
  transferUnlocked: false,
  transferCompleted: false,
};

export function evaporationJourneyReducer(
  state: EvaporationJourneyState,
  action: EvaporationJourneyAction,
): EvaporationJourneyState {
  switch (action.type) {
    case "start":
      if (state.screen.kind !== "probe") return state;
      return {
        ...state,
        screen: { kind: "concept", stageIndex: 0 },
        furthestConcept: Math.max(state.furthestConcept, 0),
      };
    case "advance-concept": {
      if (state.screen.kind !== "concept") return state;
      const nextIndex = state.screen.stageIndex + 1;
      if (nextIndex < EVAPORATION_STAGE_COUNT) {
        return {
          ...state,
          screen: { kind: "concept", stageIndex: nextIndex },
          furthestConcept: Math.max(state.furthestConcept, nextIndex),
        };
      }
      return { ...state, screen: { kind: "bridge" }, furthestConcept: EVAPORATION_STAGE_COUNT - 1 };
    }
    case "begin-transfer":
      if (state.screen.kind !== "bridge") return state;
      return { ...state, screen: { kind: "transfer-evidence" }, transferUnlocked: true };
    case "place-lid":
      if (state.screen.kind !== "transfer-evidence") return state;
      return { ...state, screen: { kind: "transfer-choice" } };
    case "complete-transfer":
      if (state.screen.kind !== "transfer-choice") return state;
      return { ...state, screen: { kind: "transfer-success" }, transferCompleted: true };
    case "show-receipt":
      if (state.screen.kind !== "transfer-success") return state;
      return { ...state, screen: { kind: "receipt" } };
    case "review-probe":
      return { ...state, screen: { kind: "probe" } };
    case "review-concept":
      if (
        !Number.isInteger(action.stageIndex)
        || action.stageIndex < 0
        || action.stageIndex > state.furthestConcept
        || action.stageIndex >= EVAPORATION_STAGE_COUNT
      ) return state;
      return { ...state, screen: { kind: "concept", stageIndex: action.stageIndex } };
    case "review-transfer":
      if (!state.transferUnlocked) return state;
      return { ...state, screen: { kind: "transfer-evidence" } };
    case "restart":
      return INITIAL_EVAPORATION_JOURNEY;
    default:
      return state;
  }
}

export function evaporationPathPosition(state: EvaporationJourneyState) {
  if (state.screen.kind === "probe") return 0;
  if (state.screen.kind === "concept") return state.screen.stageIndex + 1;
  if (state.screen.kind === "bridge") return EVAPORATION_STAGE_COUNT;
  if (state.screen.kind === "receipt") return EVAPORATION_STAGE_COUNT + 2;
  return EVAPORATION_STAGE_COUNT + 1;
}
