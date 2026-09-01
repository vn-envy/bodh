import type { LocalizedText } from "./narration-language.ts";
import { PLACES, type PlaceStatus } from "./world/places.ts";
import { observeWorld, type WorldSession } from "./world/session.ts";
import { worldToolByName } from "./world-tools.ts";

/**
 * Bodh's in-page tutor. It leads navigation and explanation; it never does the
 * child's doing. Two hard rules, enforced here and again on the server:
 *
 * - The tutor may only call tools in TUTOR_TOOL_ALLOWLIST. It can never answer
 *   a probe, tinker, or press check on the child's behalf (D-002, D-016).
 * - Every step is a registered tool call, so an agent-led journey is
 *   indistinguishable, in state terms, from a child-led one.
 *
 * `nextTutorStep` is the deterministic policy that runs offline and as the
 * fallback when the model-backed policy is unavailable or returns something
 * outside the allowlist.
 */
export const TUTOR_TOOL_ALLOWLIST = [
  "bodh_observe_world",
  "bodh_read_growth_graph",
  "bodh_walk_to",
  "bodh_enter_station",
  "bodh_leave_station",
  "bodh_ask_bodh",
  "bodh_replay_narration",
] as const;

export type TutorToolName = (typeof TUTOR_TOOL_ALLOWLIST)[number];

export type TutorStep =
  | Readonly<{ kind: "call"; tool: TutorToolName; input: Record<string, string | number | boolean>; reason: LocalizedText }>
  | Readonly<{ kind: "wait"; reason: LocalizedText }>;

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });

export function isTutorTool(name: unknown): name is TutorToolName {
  return typeof name === "string" && (TUTOR_TOOL_ALLOWLIST as readonly string[]).includes(name) && worldToolByName(name) !== null;
}

const STATUS_PRIORITY: Record<PlaceStatus, number> = { due: 0, lit: 1, known: 2, fog: 3 };

export function nextTutorStep(session: WorldSession): TutorStep {
  const view = observeWorld(session);
  const run = session.world.station;

  if (!run) {
    const here = view.places.find((place) => place.here);
    if (here && here.status !== "fog") {
      return { kind: "call", tool: "bodh_enter_station", input: {}, reason: hiEn("चलो, अंदर देखते हैं।", "Let us step inside and look.") };
    }
    const candidates = view.places
      .filter((place) => place.status !== "fog" && !place.here)
      .sort((a, b) => STATUS_PRIORITY[a.status as PlaceStatus] - STATUS_PRIORITY[b.status as PlaceStatus]
        || PLACES.findIndex((p) => p.id === a.id) - PLACES.findIndex((p) => p.id === b.id));
    const next = candidates[0];
    if (!next) return { kind: "wait", reason: hiEn("अभी कोई जगह रोशन नहीं है।", "Nothing is lit right now.") };
    return {
      kind: "call",
      tool: "bodh_walk_to",
      input: { placeId: next.id },
      reason: next.status === "due"
        ? hiEn("यह जगह फिर से देखने लायक है—कुछ नया हो रहा है।", "This place is worth a return—something new is happening.")
        : hiEn("यह जगह रोशन है। चलो देखें।", "This place is lit. Let us go and see."),
    };
  }

  switch (run.phase) {
    case "probe":
    case "transfer-predict":
      return { kind: "wait", reason: hiEn("यह तुम्हारा सवाल है—जो सोचते हो वही चुनो।", "This question is yours—choose what you actually think.") };
    case "tinker":
    case "transfer-do":
      return { kind: "call", tool: "bodh_ask_bodh", input: { intent: "hint" }, reason: hiEn("एक छोटा संकेत, फिर तुम खुद करो।", "One small hint, then you try it yourself.") };
    case "explain":
      return { kind: "call", tool: "bodh_ask_bodh", input: { intent: "explain" }, reason: hiEn("तुमने देखा; अब Bodh नाम देगा।", "You saw it; now Bodh will name it.") };
    case "done":
      return { kind: "call", tool: "bodh_leave_station", input: {}, reason: hiEn("यह जगह तुम्हारी है। आगे चलें।", "This place is yours. Let us move on.") };
    default:
      return { kind: "wait", reason: hiEn("Bodh देख रहा है।", "Bodh is watching.") };
  }
}
