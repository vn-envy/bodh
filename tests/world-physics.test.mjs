import assert from "node:assert/strict";
import test from "node:test";
import {
  createPuddleScene,
  createSeesawScene,
  disposeScene,
  loadPhysics,
  puddleDropletPositions,
  puddleSceneHash,
  seesawSceneAngleDegrees,
  seesawSceneHash,
  settlePuddleScene,
  stepScene,
  syncPuddleScene,
} from "../lib/world/physics.ts";
import { createSeesaw, seesawTiltDegrees, setSeesawPieces } from "../lib/world/stations/roti-seesaw.ts";
import { createPuddle, setPuddleControl, stepPuddleTimes, puddleCounts } from "../lib/world/stations/puddle-sun.ts";

const SETTLE_STEPS = 360;

test("the same seesaw inputs produce the same physics hash on repeat", async () => {
  const engine = await loadPhysics();
  const state = setSeesawPieces(createSeesaw("phys"), 4);
  const a = stepScene(createSeesawScene(engine, state), SETTLE_STEPS);
  const b = stepScene(createSeesawScene(engine, state), SETTLE_STEPS);
  assert.equal(seesawSceneHash(a), seesawSceneHash(b));
  const c = stepScene(createSeesawScene(engine, setSeesawPieces(createSeesaw("phys"), 5)), SETTLE_STEPS);
  assert.notEqual(seesawSceneHash(a), seesawSceneHash(c));
  disposeScene(a); disposeScene(b); disposeScene(c);
});

test("the physics beam agrees with the arithmetic predicate: level at six eighths, tilted otherwise", async () => {
  const engine = await loadPhysics();
  for (const pieces of [0, 3, 4, 6, 8]) {
    const state = setSeesawPieces(createSeesaw("phys"), pieces);
    const scene = stepScene(createSeesawScene(engine, state), SETTLE_STEPS);
    const physicsDegrees = seesawSceneAngleDegrees(scene);
    const arithmeticDegrees = seesawTiltDegrees(state);
    if (arithmeticDegrees === 0) {
      assert.ok(Math.abs(physicsDegrees) < 0.75, `level at ${pieces} pieces, got ${physicsDegrees.toFixed(3)}°`);
    } else {
      assert.ok(Math.abs(physicsDegrees) > 2, `visibly tilted at ${pieces} pieces, got ${physicsDegrees.toFixed(3)}°`);
      // Right pan heavier (positive torque) drops the right side, i.e. a negative rotation.
      assert.equal(Math.sign(physicsDegrees), -Math.sign(arithmeticDegrees), `tilt direction at ${pieces} pieces`);
    }
    disposeScene(scene);
  }
});

test("droplets fall deterministically and are only created for droplet-phase water", async () => {
  const engine = await loadPhysics();
  let state = setPuddleControl(setPuddleControl(createPuddle("drops"), "sun", 3), "lid", true);
  state = stepPuddleTimes(state, 40);
  const counts = puddleCounts(state);
  assert.equal(counts.total, 12);

  const run = () => {
    let scene = syncPuddleScene(createPuddleScene(engine), state);
    assert.equal(scene.droplets.size, counts.droplet);
    scene = stepScene(scene, 90);
    const positions = puddleDropletPositions(scene);
    for (const position of positions) assert.ok(position.y < 2.4, "droplets fall from the lid");
    const hash = puddleSceneHash(scene);
    scene = settlePuddleScene(stepScene(scene, 240));
    assert.ok(scene.droplets.size <= counts.droplet);
    disposeScene(scene);
    return hash;
  };
  assert.equal(run(), run());
});
