import { seededRandom } from "../../growth-graph.ts";

/**
 * Puddle Ghat: twelve units of water that can only change state and place,
 * never vanish. The child moves the sun, drops a lid, and blows wind; the
 * counter proves conservation on every step. Pure and deterministic.
 */
export const PUDDLE_WATER_UNITS = 12 as const;

export type WaterPhase = "liquid" | "vapour" | "droplet";

export type WaterUnit = Readonly<{
  phase: WaterPhase;
  /** Height above the ground in the scene's own units (0 = puddle, 1 = lid). */
  height: number;
  /** Horizontal drift so vapour is visibly spread; kept for rendering only. */
  x: number;
}>;

export type PuddleControls = Readonly<{
  /** 0 = night, 1 = morning, 2 = noon, 3 = harsh afternoon. */
  sun: 0 | 1 | 2 | 3;
  lid: boolean;
  /** 0 = still, 1 = breeze, 2 = gusty. */
  wind: 0 | 1 | 2;
}>;

export type PuddleState = Readonly<{
  seed: string;
  step: number;
  controls: PuddleControls;
  units: readonly WaterUnit[];
  /** Total state changes so far; the "meaningful attempt" signal. */
  transitions: number;
}>;

export const PUDDLE_CONTROL_SCHEMA = {
  sun: { type: "integer", minimum: 0, maximum: 3, description: "0 night, 1 morning, 2 noon, 3 harsh afternoon" },
  lid: { type: "boolean", description: "Whether a cold lid covers the puddle" },
  wind: { type: "integer", minimum: 0, maximum: 2, description: "0 still, 1 breeze, 2 gusty" },
} as const;

export function createPuddle(seed: string): PuddleState {
  const random = seededRandom(`${seed}:puddle`);
  const units: WaterUnit[] = [];
  for (let index = 0; index < PUDDLE_WATER_UNITS; index += 1) {
    units.push({ phase: "liquid", height: 0, x: Math.floor(random() * 1000) / 1000 });
  }
  return { seed, step: 0, controls: { sun: 1, lid: false, wind: 0 }, units, transitions: 0 };
}

export function setPuddleControl(state: PuddleState, control: keyof PuddleControls, value: number | boolean): PuddleState {
  if (control === "lid") {
    if (typeof value !== "boolean") return state;
    return { ...state, controls: { ...state.controls, lid: value } };
  }
  if (typeof value !== "number" || !Number.isInteger(value)) return state;
  if (control === "sun" && value >= 0 && value <= 3) return { ...state, controls: { ...state.controls, sun: value as PuddleControls["sun"] } };
  if (control === "wind" && value >= 0 && value <= 2) return { ...state, controls: { ...state.controls, wind: value as PuddleControls["wind"] } };
  return state;
}

/** Probability, in thousandths, that one liquid unit evaporates on this step. */
function evaporationChance(controls: PuddleControls) {
  const base = [0, 60, 160, 300][controls.sun];
  const wind = [0, 60, 140][controls.wind];
  return controls.lid ? Math.floor((base + wind) / 3) : base + wind;
}

/**
 * One tick of the world. Uses a seeded generator keyed by step so the same
 * (seed, controls, step) always produces the same outcome.
 */
export function stepPuddle(state: PuddleState): PuddleState {
  const random = seededRandom(`${state.seed}:puddle:${state.step}`);
  const chance = evaporationChance(state.controls);
  let transitions = state.transitions;
  const units = state.units.map((unit): WaterUnit => {
    const roll = Math.floor(random() * 1000);
    if (unit.phase === "liquid") {
      if (roll < chance) {
        transitions += 1;
        return { ...unit, phase: "vapour", height: 0.15 };
      }
      return unit;
    }
    if (unit.phase === "vapour") {
      const rise = 0.1 + state.controls.wind * 0.05;
      const height = Math.min(1, Math.round((unit.height + rise) * 100) / 100);
      if (state.controls.lid && height >= 1) {
        transitions += 1;
        return { ...unit, phase: "droplet", height: 1 };
      }
      if (!state.controls.lid && height >= 1) {
        // Escaped into the wider air: still water, still counted, just out of the frame's reach.
        return { ...unit, height: 1 };
      }
      return { ...unit, height };
    }
    // Droplets grow and fall back as the lid stays cold.
    if (roll < 350) {
      transitions += 1;
      return { ...unit, phase: "liquid", height: 0 };
    }
    return unit;
  });
  return { ...state, step: state.step + 1, units, transitions };
}

export function stepPuddleTimes(state: PuddleState, count: number) {
  let next = state;
  for (let index = 0; index < count; index += 1) next = stepPuddle(next);
  return next;
}

export type PuddleCounts = Readonly<{ liquid: number; vapour: number; droplet: number; total: number }>;

export function puddleCounts(state: PuddleState): PuddleCounts {
  const counts = { liquid: 0, vapour: 0, droplet: 0 };
  for (const unit of state.units) counts[unit.phase] += 1;
  return { ...counts, total: counts.liquid + counts.vapour + counts.droplet };
}

export function puddleHash(state: PuddleState) {
  let hash = 2166136261;
  const text = `${state.step}|${state.controls.sun}|${state.controls.lid ? 1 : 0}|${state.controls.wind}|${state.transitions}|${state.units
    .map((unit) => `${unit.phase[0]}${unit.height}`)
    .join(",")}`;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
