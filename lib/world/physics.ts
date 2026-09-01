import type RAPIER_NS from "@dimforge/rapier2d-deterministic-compat";
import type { PuddleState } from "./stations/puddle-sun.ts";
import { seesawTask, type SeesawState } from "./stations/roti-seesaw.ts";

/**
 * Deterministic physics for the stations (D-017). Rapier's deterministic build
 * guarantees cross-platform bit parity; this module adds a fixed timestep, no
 * transcendental JavaScript math in the simulation path, and state hashes so
 * tests can prove that the same inputs give the same world.
 *
 * Truth predicates (balanced? conserved?) live in the pure station modules;
 * the physics layer renders the same masses so what the child sees agrees with
 * what the growth graph records (D-003).
 */
export type PhysicsEngine = typeof RAPIER_NS;

export const PHYSICS_TIMESTEP = 1 / 60;
export const GRAVITY = { x: 0, y: -9.81 } as const;

let enginePromise: Promise<PhysicsEngine> | null = null;

/** Loads and initialises the WASM once. Safe in browsers and Node. */
export function loadPhysics(): Promise<PhysicsEngine> {
  if (!enginePromise) {
    enginePromise = import("@dimforge/rapier2d-deterministic-compat").then(async (module) => {
      const engine = (module.default ?? module) as PhysicsEngine;
      await engine.init();
      return engine;
    });
  }
  return enginePromise;
}

function fnv(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function fixed(value: number) {
  return Math.round(value * 1e6) / 1e6;
}

// ---------------------------------------------------------------------------
// Seesaw scene
// ---------------------------------------------------------------------------

export const SEESAW_GEOMETRY = {
  beamHalfLength: 3,
  beamHalfThickness: 0.08,
  pivotHeight: 1.6,
  panOffset: 2.5,
  pieceSize: 0.32,
  maxTiltRadians: 0.32,
} as const;

export type SeesawScene = Readonly<{
  engine: PhysicsEngine;
  world: RAPIER_NS.World;
  beam: RAPIER_NS.RigidBody;
  pieceCount: number;
  steps: number;
}>;

/**
 * The beam is one rigid body on a revolute joint. Loads are attached colliders
 * whose densities mirror the fraction arithmetic: the left pan carries
 * `target.numerator * unit.denominator` mass units, each right-pan piece carries
 * `target.denominator` mass units, so equal torque means equal fraction.
 */
export function createSeesawScene(engine: PhysicsEngine, state: SeesawState): SeesawScene {
  const task = seesawTask(state);
  const world = new engine.World({ x: GRAVITY.x, y: GRAVITY.y });
  world.timestep = PHYSICS_TIMESTEP;

  const pivot = world.createRigidBody(engine.RigidBodyDesc.fixed().setTranslation(0, SEESAW_GEOMETRY.pivotHeight));
  const beam = world.createRigidBody(
    engine.RigidBodyDesc.dynamic()
      .setTranslation(0, SEESAW_GEOMETRY.pivotHeight)
      .setAngularDamping(3.5)
      .setCanSleep(false),
  );
  world.createCollider(
    engine.ColliderDesc.cuboid(SEESAW_GEOMETRY.beamHalfLength, SEESAW_GEOMETRY.beamHalfThickness).setDensity(0.5),
    beam,
  );

  const loadArea = SEESAW_GEOMETRY.pieceSize * SEESAW_GEOMETRY.pieceSize * 4;
  const leftMass = task.target.numerator * task.unit.denominator;
  world.createCollider(
    engine.ColliderDesc.cuboid(SEESAW_GEOMETRY.pieceSize, SEESAW_GEOMETRY.pieceSize)
      .setTranslation(-SEESAW_GEOMETRY.panOffset, SEESAW_GEOMETRY.pieceSize + SEESAW_GEOMETRY.beamHalfThickness)
      .setDensity(leftMass / loadArea),
    beam,
  );
  const pieceMass = task.target.denominator * task.unit.numerator;
  for (let index = 0; index < state.pieces; index += 1) {
    world.createCollider(
      engine.ColliderDesc.cuboid(SEESAW_GEOMETRY.pieceSize, SEESAW_GEOMETRY.pieceSize)
        .setTranslation(
          SEESAW_GEOMETRY.panOffset,
          SEESAW_GEOMETRY.beamHalfThickness + SEESAW_GEOMETRY.pieceSize * (2 * index + 1),
        )
        .setDensity(pieceMass / loadArea),
      beam,
    );
  }

  const joint = engine.JointData.revolute({ x: 0, y: 0 }, { x: 0, y: 0 });
  joint.limitsEnabled = true;
  joint.limits = [-SEESAW_GEOMETRY.maxTiltRadians, SEESAW_GEOMETRY.maxTiltRadians];
  world.createImpulseJoint(joint, pivot, beam, true);

  return { engine, world, beam, pieceCount: state.pieces, steps: 0 };
}

export function stepScene<T extends { world: RAPIER_NS.World; steps: number }>(scene: T, count = 1): T {
  for (let index = 0; index < count; index += 1) scene.world.step();
  return { ...scene, steps: scene.steps + count };
}

/** Beam rotation in radians; positive lifts the right pan (right side lighter). */
export function seesawSceneAngle(scene: SeesawScene) {
  return scene.beam.rotation();
}

export function seesawSceneAngleDegrees(scene: SeesawScene) {
  return (seesawSceneAngle(scene) * 180) / Math.PI;
}

export function seesawSceneHash(scene: SeesawScene) {
  const t = scene.beam.translation();
  return fnv(`${scene.pieceCount}|${scene.steps}|${fixed(scene.beam.rotation())}|${fixed(scene.beam.angvel())}|${fixed(t.x)}|${fixed(t.y)}`);
}

export function disposeScene(scene: { world: RAPIER_NS.World }) {
  scene.world.free();
}

// ---------------------------------------------------------------------------
// Puddle droplets
// ---------------------------------------------------------------------------

export const PUDDLE_GEOMETRY = {
  lidHeight: 2.4,
  groundY: 0,
  dropletRadius: 0.08,
  width: 4,
} as const;

export type PuddleScene = Readonly<{
  engine: PhysicsEngine;
  world: RAPIER_NS.World;
  droplets: ReadonlyMap<number, RAPIER_NS.RigidBody>;
  steps: number;
}>;

export function createPuddleScene(engine: PhysicsEngine): PuddleScene {
  const world = new engine.World({ x: GRAVITY.x, y: GRAVITY.y });
  world.timestep = PHYSICS_TIMESTEP;
  world.createCollider(engine.ColliderDesc.cuboid(PUDDLE_GEOMETRY.width, 0.05).setTranslation(0, PUDDLE_GEOMETRY.groundY - 0.05));
  return { engine, world, droplets: new Map(), steps: 0 };
}

/**
 * Droplets exist as rigid bodies only while the pure simulation says a unit is
 * a droplet that has let go of the lid; the pure state stays the truth.
 */
export function syncPuddleScene(scene: PuddleScene, state: PuddleState): PuddleScene {
  const droplets = new Map(scene.droplets);
  state.units.forEach((unit, index) => {
    const falling = unit.phase === "liquid" && droplets.has(index);
    const shouldExist = unit.phase === "droplet";
    if (shouldExist && !droplets.has(index)) {
      const x = (unit.x - 0.5) * PUDDLE_GEOMETRY.width * 0.9;
      const body = scene.world.createRigidBody(
        scene.engine.RigidBodyDesc.dynamic().setTranslation(x, PUDDLE_GEOMETRY.lidHeight - PUDDLE_GEOMETRY.dropletRadius),
      );
      scene.world.createCollider(scene.engine.ColliderDesc.ball(PUDDLE_GEOMETRY.dropletRadius).setRestitution(0.05), body);
      droplets.set(index, body);
    } else if (!shouldExist && droplets.has(index) && !falling) {
      scene.world.removeRigidBody(droplets.get(index)!);
      droplets.delete(index);
    }
  });
  return { ...scene, droplets };
}

/** Removes droplets that have landed so the pure state can turn them back into puddle water. */
export function settlePuddleScene(scene: PuddleScene): PuddleScene {
  const droplets = new Map(scene.droplets);
  for (const [index, body] of scene.droplets) {
    if (body.translation().y <= PUDDLE_GEOMETRY.groundY + PUDDLE_GEOMETRY.dropletRadius * 1.5) {
      scene.world.removeRigidBody(body);
      droplets.delete(index);
    }
  }
  return { ...scene, droplets };
}

export function puddleDropletPositions(scene: PuddleScene) {
  return [...scene.droplets.entries()].map(([index, body]) => {
    const { x, y } = body.translation();
    return { index, x, y };
  });
}

export function puddleSceneHash(scene: PuddleScene) {
  const parts = [...scene.droplets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, body]) => `${index}:${fixed(body.translation().x)}:${fixed(body.translation().y)}`);
  return fnv(`${scene.steps}|${parts.join(",")}`);
}
