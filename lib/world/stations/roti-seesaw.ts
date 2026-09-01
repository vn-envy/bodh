import { FRACTION_MODEL } from "../../fraction-concept.ts";

/**
 * Roti Chowk: a seesaw with a fixed fraction of roti on one pan. The child
 * stacks unit pieces on the other pan until it balances. Balance is decided by
 * arithmetic torque in shipped code; the physics layer only renders the same
 * masses so what the child sees agrees with what the graph records (D-003).
 */
export type SeesawTask = Readonly<{
  id: "three-quarters-by-eighths" | "two-thirds-by-sixths";
  /** Fraction of a roti on the left pan. */
  target: Readonly<{ numerator: number; denominator: number }>;
  /** Unit piece the child places on the right pan. */
  unit: Readonly<{ numerator: 1; denominator: number }>;
  /** Pieces the pan can hold. */
  capacity: number;
}>;

export const SEESAW_TASKS: Readonly<Record<SeesawTask["id"], SeesawTask>> = {
  "three-quarters-by-eighths": {
    id: "three-quarters-by-eighths",
    target: { numerator: FRACTION_MODEL.selectedQuarters, denominator: FRACTION_MODEL.quarterCount },
    unit: { numerator: 1, denominator: FRACTION_MODEL.quarterCount * FRACTION_MODEL.eighthsPerQuarter },
    capacity: 8,
  },
  "two-thirds-by-sixths": {
    id: "two-thirds-by-sixths",
    target: { numerator: 2, denominator: 3 },
    unit: { numerator: 1, denominator: 6 },
    capacity: 6,
  },
};

export type SeesawState = Readonly<{
  seed: string;
  taskId: SeesawTask["id"];
  pieces: number;
  checks: number;
}>;

export const SEESAW_CONTROL_SCHEMA = {
  pieces: { type: "integer", minimum: 0, maximum: 8, description: "How many unit pieces sit on the right pan" },
} as const;

export function createSeesaw(seed: string, taskId: SeesawTask["id"] = "three-quarters-by-eighths"): SeesawState {
  return { seed, taskId, pieces: 0, checks: 0 };
}

export function seesawTask(state: SeesawState) {
  return SEESAW_TASKS[state.taskId];
}

export function setSeesawPieces(state: SeesawState, pieces: number): SeesawState {
  if (!Number.isInteger(pieces) || pieces < 0 || pieces > seesawTask(state).capacity) return state;
  return { ...state, pieces };
}

/** The exact count that balances the pan, as an integer or null if the task is not integral. */
export function balancingCount(task: SeesawTask) {
  const numerator = task.target.numerator * task.unit.denominator;
  const denominator = task.target.denominator * task.unit.numerator;
  return numerator % denominator === 0 ? numerator / denominator : null;
}

/**
 * Net torque in units of 1/(target.denominator * unit.denominator). Positive
 * means the right pan is heavier. Integer arithmetic, no floating point.
 */
export function seesawTorque(state: SeesawState) {
  const task = seesawTask(state);
  const left = task.target.numerator * task.unit.denominator;
  const right = state.pieces * task.unit.numerator * task.target.denominator;
  return right - left;
}

export function seesawBalanced(state: SeesawState) {
  return seesawTorque(state) === 0;
}

/** Tilt in degrees for rendering; bounded so the beam never flips. */
export function seesawTiltDegrees(state: SeesawState) {
  const torque = seesawTorque(state);
  const scale = seesawTask(state).target.denominator * seesawTask(state).unit.denominator;
  return Math.max(-18, Math.min(18, Math.round((torque / scale) * 24 * 10) / 10));
}

export function recordSeesawCheck(state: SeesawState): SeesawState {
  return { ...state, checks: state.checks + 1 };
}

/**
 * Misconception signals suggested by a wrong count. These are evidence about
 * the next representation to show, never a label on the child.
 */
export function seesawSignals(state: SeesawState): readonly string[] {
  const task = seesawTask(state);
  if (seesawBalanced(state)) return [];
  if (state.pieces === task.target.numerator) return ["fraction-as-two-whole-numbers"];
  if (state.pieces === task.target.denominator) return ["unit-fraction-size-confusion"];
  return [];
}

export function seesawHash(state: SeesawState) {
  let hash = 2166136261;
  const text = `${state.taskId}|${state.pieces}|${state.checks}`;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
