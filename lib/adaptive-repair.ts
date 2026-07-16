export const REPAIR_ENTRY_ATOM_IDS = [
  "chosen-whole",
  "equal-parts",
  "unit-and-denominator",
  "numerator-count",
  "equivalent-repartition",
  "repeated-composition",
  "division-unknown-factor",
] as const;

export type RepairEntryAtomId = (typeof REPAIR_ENTRY_ATOM_IDS)[number];
export type BilingualCopy = Readonly<{ hi: string; en: string }>;

type AdaptiveProbeOption = Readonly<{
  id: string;
  label: BilingualCopy;
  entryAtomId: RepairEntryAtomId;
}>;

type AdaptiveProbe = Readonly<{
  id: string;
  question: BilingualCopy;
  options: readonly AdaptiveProbeOption[];
}>;

/** Reviewed probes only. Model-authored labels or routes never enter this catalog. */
export const ADAPTIVE_PROBE_CATALOG = [
  {
    id: "probe-whole-identity",
    question: {
      hi: "इस चित्र में एक पूरा किसे मानोगे?",
      en: "What would you call one whole in this picture?",
    },
    options: [
      {
        id: "whole-entire-strip",
        label: { hi: "किनारे से किनारे तक पूरी पट्टी", en: "The entire strip, edge to edge" },
        entryAtomId: "equal-parts",
      },
      {
        id: "whole-one-piece",
        label: { hi: "पट्टी का एक छोटा हिस्सा", en: "One small part of the strip" },
        entryAtomId: "chosen-whole",
      },
      {
        id: "whole-number-below",
        label: { hi: "फ्रैक्शन के नीचे वाली संख्या", en: "The number below the fraction bar" },
        entryAtomId: "chosen-whole",
      },
    ],
  },
  {
    id: "probe-unit-size",
    question: {
      hi: "एक ही पूरे में कौन-सा हिस्सा छोटा होगा?",
      en: "Within the same whole, which piece would be smaller?",
    },
    options: [
      {
        id: "unit-eighth-smaller",
        label: { hi: "1/8, क्योंकि पूरा अधिक हिस्सों में बँटा है", en: "1/8, because the whole has more parts" },
        entryAtomId: "numerator-count",
      },
      {
        id: "unit-quarter-smaller",
        label: { hi: "1/4, क्योंकि 4 छोटा number है", en: "1/4, because 4 is the smaller number" },
        entryAtomId: "unit-and-denominator",
      },
      {
        id: "unit-same-size",
        label: { hi: "दोनों एक ही size के हैं", en: "They are the same size" },
        entryAtomId: "unit-and-denominator",
      },
    ],
  },
  {
    id: "probe-same-amount",
    question: {
      hi: "हर 1/4 को दो बराबर हिस्सों में बाँटें, तो रँगी मात्रा का क्या होगा?",
      en: "If every 1/4 is split into two equal parts, what happens to the shaded amount?",
    },
    options: [
      {
        id: "amount-stays-same",
        label: { hi: "मात्रा वही रहेगी", en: "The amount stays the same" },
        entryAtomId: "repeated-composition",
      },
      {
        id: "amount-grows",
        label: { hi: "मात्रा बढ़ जाएगी", en: "The amount grows" },
        entryAtomId: "equivalent-repartition",
      },
      {
        id: "amount-shrinks",
        label: { hi: "मात्रा घट जाएगी", en: "The amount shrinks" },
        entryAtomId: "equivalent-repartition",
      },
    ],
  },
] as const satisfies readonly AdaptiveProbe[];

export type AdaptiveProbeId = (typeof ADAPTIVE_PROBE_CATALOG)[number]["id"];
export type AdaptiveProbeOptionId = (typeof ADAPTIVE_PROBE_CATALOG)[number]["options"][number]["id"];

const PROBE_HYPOTHESIS_PRIORITY = [
  {
    probeId: "probe-whole-identity",
    hypothesisIds: ["fraction-as-two-whole-numbers", "insufficient-evidence", "answer-only-intent"],
  },
  {
    probeId: "probe-unit-size",
    hypothesisIds: [
      "unit-fraction-size-confusion",
      "division-always-makes-smaller",
      "dividend-divisor-role-confusion",
      "arithmetic-slip",
    ],
  },
  {
    probeId: "probe-same-amount",
    hypothesisIds: ["reciprocal-rule-without-meaning", "unknown-factor-not-connected"],
  },
] as const;

export function adaptiveProbeById(id: unknown) {
  return ADAPTIVE_PROBE_CATALOG.find((probe) => probe.id === id) ?? null;
}

function optionRecordById(id: unknown) {
  for (const probe of ADAPTIVE_PROBE_CATALOG) {
    const option = probe.options.find((candidate) => candidate.id === id);
    if (option) return { probe, option };
  }
  return null;
}

export function entryAtomIdForOption(optionId: unknown): RepairEntryAtomId | null {
  return optionRecordById(optionId)?.option.entryAtomId ?? null;
}

/** Set-based priority makes selection stable even if model hypotheses arrive reordered. */
export function selectAdaptiveProbe(hypothesisIds: readonly unknown[]) {
  const supplied = new Set(hypothesisIds.filter((id): id is string => typeof id === "string"));
  for (const candidate of PROBE_HYPOTHESIS_PRIORITY) {
    if (candidate.hypothesisIds.some((id) => supplied.has(id))) {
      return adaptiveProbeById(candidate.probeId)!;
    }
  }
  return ADAPTIVE_PROBE_CATALOG[0];
}

export const ADAPTIVE_SESSION_VERSION = "adaptive-repair-v1" as const;
export const ADAPTIVE_SESSION_STORAGE_KEY = "bodh:adaptive-repair:v1" as const;

export type AdaptiveSessionPayload = Readonly<{
  version: typeof ADAPTIVE_SESSION_VERSION;
  probeId: AdaptiveProbeId;
  optionId: AdaptiveProbeOptionId;
  entryAtomId: RepairEntryAtomId;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function sessionPayloadForSelection(probeId: unknown, optionId: unknown): AdaptiveSessionPayload | null {
  const record = optionRecordById(optionId);
  if (!record || record.probe.id !== probeId) return null;
  return {
    version: ADAPTIVE_SESSION_VERSION,
    probeId: record.probe.id,
    optionId: record.option.id,
    entryAtomId: record.option.entryAtomId,
  };
}

function normaliseSessionPayload(value: unknown): AdaptiveSessionPayload | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value).sort();
  if (keys.join("|") !== "entryAtomId|optionId|probeId|version") return null;
  if (value.version !== ADAPTIVE_SESSION_VERSION) return null;
  const canonical = sessionPayloadForSelection(value.probeId, value.optionId);
  return canonical && canonical.entryAtomId === value.entryAtomId ? canonical : null;
}

/** Returns null rather than serialising labels, learner text, unknown IDs, or extra fields. */
export function serializeAdaptiveSessionPayload(value: unknown) {
  const payload = normaliseSessionPayload(value);
  return payload ? JSON.stringify(payload) : null;
}

export function parseAdaptiveSessionPayload(raw: unknown): AdaptiveSessionPayload | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) return null;
  try {
    return normaliseSessionPayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

export const MEANING_CHOICES = [
  {
    id: "meaning-groups-fit",
    label: {
      hi: "Division पूछती है कि इस size के कितने बराबर groups fit होते हैं।",
      en: "Division can ask how many equal groups of this size fit.",
    },
  },
  {
    id: "meaning-rule-only",
    label: {
      hi: "Division का मतलब बस पलटकर multiply करना है।",
      en: "Division only means flip and multiply.",
    },
  },
  {
    id: "meaning-subtraction",
    label: {
      hi: "4 का मतलब 6 − 2 है।",
      en: "The 4 means 6 minus 2.",
    },
  },
] as const;

export type MeaningChoiceId = (typeof MEANING_CHOICES)[number]["id"];
export const EVIDENCE_MEANING_CHOICE_ID: MeaningChoiceId = "meaning-groups-fit";

export type AdaptiveSupportEventId = "transfer-hint" | "conceptual-repair";

export type AdaptiveEvidenceState = Readonly<{
  session: AdaptiveSessionPayload | null;
  /** The route the learner actually chose, which may be earlier than the probe recommendation. */
  journeyEntryAtomId: RepairEntryAtomId | null;
  completedAtomIds: readonly RepairEntryAtomId[];
  labComplete: boolean;
  transfer: Readonly<{
    attempts: number;
    incorrectAttempts: number;
    hintShown: boolean;
    correct: boolean;
    correctBeforeHint: boolean;
  }>;
  meaningChoiceId: MeaningChoiceId | null;
  returnCheck: Readonly<{ attempts: number; correct: boolean }>;
  supportHistory: readonly AdaptiveSupportEventId[];
  repairHistory: readonly RepairEntryAtomId[];
}>;

export type AdaptiveEvidenceEvent =
  | Readonly<{ type: "probe-answered"; probeId: string; optionId: string }>
  | Readonly<{ type: "journey-started"; entryAtomId: string }>
  | Readonly<{ type: "atom-completed"; atomId: string }>
  | Readonly<{ type: "lab-completed" }>
  | Readonly<{ type: "transfer-attempted"; correct: boolean }>
  | Readonly<{ type: "transfer-hint-shown" }>
  | Readonly<{ type: "conceptual-repair-started"; atomId: string }>
  | Readonly<{ type: "meaning-chosen"; choiceId: string }>
  | Readonly<{ type: "return-attempted"; correct: boolean }>;

function isRepairEntryAtomId(value: unknown): value is RepairEntryAtomId {
  return REPAIR_ENTRY_ATOM_IDS.some((atomId) => atomId === value);
}

export function requiredRepairAtomIds(entryAtomId: RepairEntryAtomId) {
  const index = REPAIR_ENTRY_ATOM_IDS.indexOf(entryAtomId);
  return REPAIR_ENTRY_ATOM_IDS.slice(index < 0 ? 0 : index);
}

export function createAdaptiveEvidenceState(session: unknown = null): AdaptiveEvidenceState {
  return {
    session: normaliseSessionPayload(session),
    journeyEntryAtomId: null,
    completedAtomIds: [],
    labComplete: false,
    transfer: {
      attempts: 0,
      incorrectAttempts: 0,
      hintShown: false,
      correct: false,
      correctBeforeHint: false,
    },
    meaningChoiceId: null,
    returnCheck: { attempts: 0, correct: false },
    supportHistory: [],
    repairHistory: [],
  };
}

function repairAtomsComplete(state: AdaptiveEvidenceState) {
  if (!state.session || !state.journeyEntryAtomId) return false;
  const required = requiredRepairAtomIds(state.journeyEntryAtomId);
  return (
    state.completedAtomIds.length === required.length &&
    required.every((id, index) => state.completedAtomIds[index] === id)
  );
}

export function reduceAdaptiveEvidence(
  state: AdaptiveEvidenceState,
  event: AdaptiveEvidenceEvent,
): AdaptiveEvidenceState {
  if (event.type === "probe-answered") {
    const session = sessionPayloadForSelection(event.probeId, event.optionId);
    if (!session) return state;
    if (state.session?.probeId === session.probeId && state.session.optionId === session.optionId) return state;
    return createAdaptiveEvidenceState(session);
  }

  if (event.type === "journey-started") {
    if (!state.session || state.journeyEntryAtomId || !isRepairEntryAtomId(event.entryAtomId)) return state;
    return { ...state, journeyEntryAtomId: event.entryAtomId };
  }

  if (event.type === "atom-completed") {
    if (!state.session || !state.journeyEntryAtomId) return state;
    const required = requiredRepairAtomIds(state.journeyEntryAtomId);
    const nextAtomId = required[state.completedAtomIds.length];
    if (nextAtomId !== event.atomId) return state;
    return { ...state, completedAtomIds: [...state.completedAtomIds, nextAtomId] };
  }

  if (event.type === "lab-completed") {
    return repairAtomsComplete(state) && !state.labComplete ? { ...state, labComplete: true } : state;
  }

  if (event.type === "transfer-attempted") {
    if (!state.labComplete || state.transfer.correct || typeof event.correct !== "boolean") return state;
    return {
      ...state,
      transfer: {
        ...state.transfer,
        attempts: state.transfer.attempts + 1,
        incorrectAttempts: state.transfer.incorrectAttempts + (event.correct ? 0 : 1),
        correct: event.correct,
        correctBeforeHint: event.correct && !state.transfer.hintShown,
      },
    };
  }

  if (event.type === "transfer-hint-shown") {
    if (state.transfer.correct || state.transfer.incorrectAttempts < 1 || state.transfer.hintShown) return state;
    return {
      ...state,
      transfer: { ...state.transfer, hintShown: true },
      supportHistory: [...state.supportHistory, "transfer-hint"],
    };
  }

  if (event.type === "conceptual-repair-started") {
    if (!state.transfer.correct || !isRepairEntryAtomId(event.atomId)) return state;
    return {
      ...state,
      supportHistory: [...state.supportHistory, "conceptual-repair"],
      repairHistory: [...state.repairHistory, event.atomId],
    };
  }

  if (event.type === "meaning-chosen") {
    if (!state.transfer.correct || !MEANING_CHOICES.some((choice) => choice.id === event.choiceId)) return state;
    return { ...state, meaningChoiceId: event.choiceId as MeaningChoiceId };
  }

  if (event.type === "return-attempted") {
    if (!state.transfer.correct || !state.meaningChoiceId || state.returnCheck.correct || typeof event.correct !== "boolean") {
      return state;
    }
    return {
      ...state,
      returnCheck: { attempts: state.returnCheck.attempts + 1, correct: event.correct },
    };
  }

  return state;
}

export type AdaptiveReceiptSupport = "independent" | "supported";

export function canIssueAdaptiveReceipt(state: AdaptiveEvidenceState) {
  if (
    !state.session ||
    !state.journeyEntryAtomId ||
    !repairAtomsComplete(state) ||
    !state.labComplete ||
    !state.transfer.correct ||
    state.transfer.attempts < 1 ||
    state.meaningChoiceId !== EVIDENCE_MEANING_CHOICE_ID ||
    !state.returnCheck.correct ||
    state.returnCheck.attempts < 1
  ) {
    return false;
  }
  const hintEvents = state.supportHistory.filter((eventId) => eventId === "transfer-hint").length;
  const repairEvents = state.supportHistory.filter((eventId) => eventId === "conceptual-repair").length;
  if (
    hintEvents !== (state.transfer.hintShown ? 1 : 0) ||
    repairEvents !== state.repairHistory.length
  ) {
    return false;
  }
  if (state.transfer.hintShown) {
    return (
      state.transfer.incorrectAttempts >= 1 &&
      state.transfer.attempts === state.transfer.incorrectAttempts + 1 &&
      !state.transfer.correctBeforeHint
    );
  }
  return (
    state.transfer.attempts === state.transfer.incorrectAttempts + 1 &&
    state.transfer.correctBeforeHint
  );
}

export function adaptiveReceiptSupport(state: AdaptiveEvidenceState): AdaptiveReceiptSupport | null {
  if (!canIssueAdaptiveReceipt(state)) return null;
  return state.supportHistory.length === 0 ? "independent" : "supported";
}
