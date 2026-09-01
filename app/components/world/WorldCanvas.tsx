"use client";

import { useEffect, useRef } from "react";
import type { NarrationLanguage } from "../../../lib/narration-language";
import { localized } from "../../../lib/narration-language";
import {
  createPuddleScene,
  createSeesawScene,
  disposeScene,
  loadPhysics,
  PHYSICS_TIMESTEP,
  puddleDropletPositions,
  PUDDLE_GEOMETRY,
  SEESAW_GEOMETRY,
  seesawSceneAngle,
  settlePuddleScene,
  stepScene,
  syncPuddleScene,
  type PhysicsEngine,
  type PuddleScene,
  type SeesawScene,
} from "../../../lib/world/physics";
import { PLACES, type PlaceId, type PlaceStatus } from "../../../lib/world/places";
import type { StationRun, WorldObservation } from "../../../lib/world/session";
import { puddleCounts, type PuddleState } from "../../../lib/world/stations/puddle-sun";
import { seesawTask, type SeesawState } from "../../../lib/world/stations/roti-seesaw";
import styles from "./WorldCanvas.module.css";

const COLOURS = {
  sky: "#eef3f6",
  skyDeep: "#dfe8ee",
  ground: "#e3e7cd",
  groundDeep: "#c9d1a6",
  path: "#d9cbb3",
  water: "#7fa7c1",
  waterDeep: "#5e7588",
  vapour: "rgba(94, 117, 136, 0.35)",
  sun: "#e18a55",
  sunGlow: "rgba(225, 138, 85, 0.25)",
  lid: "#40586b",
  roti: "#e8c78f",
  rotiEdge: "#c99a52",
  piece: "#bd3e66",
  pieceEdge: "#8f2f4e",
  beam: "#6d7d40",
  pivot: "#4b5926",
  fog: "rgba(253, 247, 236, 0.78)",
  ink: "#343035",
  inkSoft: "#6a6367",
  lit: "#e18a55",
  due: "#bd3e66",
} as const;

type Props = Readonly<{
  observation: WorldObservation;
  station: StationRun | null;
  language: NarrationLanguage;
  onPlaceTap: (placeId: PlaceId) => void;
}>;

type Layout = Readonly<{ width: number; height: number; dpr: number }>;

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function drawOverworld(context: CanvasRenderingContext2D, layout: Layout, observation: WorldObservation, language: NarrationLanguage, bodh: HTMLImageElement | null, time: number) {
  const { width, height } = layout;
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, COLOURS.sky);
  sky.addColorStop(0.55, COLOURS.skyDeep);
  sky.addColorStop(0.56, COLOURS.ground);
  sky.addColorStop(1, COLOURS.groundDeep);
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  // A winding path between places.
  context.strokeStyle = COLOURS.path;
  context.lineWidth = Math.max(10, width * 0.02);
  context.lineCap = "round";
  context.beginPath();
  const points = PLACES.map((place) => ({ x: place.x * width, y: place.y * height }));
  context.moveTo(width * 0.05, height * 0.85);
  for (const point of points) context.quadraticCurveTo(point.x - width * 0.12, point.y + height * 0.14, point.x, point.y + 28);
  context.quadraticCurveTo(width * 0.9, height * 0.2, width * 0.97, height * 0.12);
  context.stroke();

  for (const place of PLACES) {
    const view = observation.places.find((entry) => entry.id === place.id)!;
    const x = place.x * width;
    const y = place.y * height;
    const radius = Math.max(34, Math.min(width, height) * 0.09);
    const status = view.status as PlaceStatus;

    if (status === "lit" || status === "due") {
      const pulse = 1 + 0.06 * Math.sin(time / 500);
      context.fillStyle = status === "due" ? "rgba(189, 62, 102, 0.16)" : "rgba(225, 138, 85, 0.18)";
      context.beginPath();
      context.arc(x, y, radius * 1.45 * pulse, 0, Math.PI * 2);
      context.fill();
    }

    context.fillStyle = place.id === "puddle-ghat" ? COLOURS.water : COLOURS.roti;
    context.strokeStyle = place.id === "puddle-ghat" ? COLOURS.waterDeep : COLOURS.rotiEdge;
    context.lineWidth = 3;
    context.beginPath();
    if (place.id === "puddle-ghat") {
      context.ellipse(x, y, radius, radius * 0.6, 0, 0, Math.PI * 2);
    } else {
      context.arc(x, y, radius * 0.8, 0, Math.PI * 2);
    }
    context.fill();
    context.stroke();
    if (place.id === "roti-chowk") {
      context.fillStyle = COLOURS.rotiEdge;
      context.beginPath();
      context.moveTo(x, y);
      context.arc(x, y, radius * 0.8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 1.5);
      context.closePath();
      context.globalAlpha = 0.35;
      context.fill();
      context.globalAlpha = 1;
    }

    context.fillStyle = COLOURS.ink;
    context.font = `700 ${Math.max(15, width * 0.024)}px "Baloo 2", "Mukta", sans-serif`;
    context.textAlign = "center";
    context.fillText(localized(place.label, language), x, y + radius + 26);
    context.fillStyle = COLOURS.inkSoft;
    context.font = `500 ${Math.max(12, width * 0.017)}px "Mukta", sans-serif`;
    context.fillText(view.blurb, x, y + radius + 46);

    if (status === "fog") {
      context.fillStyle = COLOURS.fog;
      context.beginPath();
      context.arc(x, y + 10, radius * 1.7, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = COLOURS.inkSoft;
      context.font = `600 ${Math.max(12, width * 0.017)}px "Mukta", sans-serif`;
      context.fillText(language === "hi" ? "अभी धुंध में" : language === "ta" ? "இன்னும் பனிமூட்டத்தில்" : "Still in the mist", x, y + 6);
    }

    if (view.here && bodh) {
      const size = radius * 1.3;
      context.drawImage(bodh, x - size / 2, y - radius - size + 6, size, size);
    }
  }

  if (!observation.position && bodh) {
    const size = Math.max(70, width * 0.13);
    context.drawImage(bodh, width * 0.04, height * 0.86 - size, size, size);
  }
}

function drawPuddle(context: CanvasRenderingContext2D, layout: Layout, state: PuddleState, scene: PuddleScene | null, language: NarrationLanguage) {
  const { width, height } = layout;
  const counts = puddleCounts(state);
  const sky = context.createLinearGradient(0, 0, 0, height);
  const warmth = state.controls.sun / 3;
  sky.addColorStop(0, warmth > 0.5 ? "#fbe9d6" : COLOURS.sky);
  sky.addColorStop(0.7, COLOURS.skyDeep);
  sky.addColorStop(0.71, COLOURS.ground);
  sky.addColorStop(1, COLOURS.groundDeep);
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  const groundY = height * 0.71;
  const lidY = height * 0.16;
  const sceneScale = (groundY - lidY) / PUDDLE_GEOMETRY.lidHeight;
  const centreX = width / 2;

  // Sun: further left and lower when weak, high and large when harsh.
  if (state.controls.sun > 0) {
    const sunX = width * (0.18 + 0.2 * state.controls.sun);
    const sunY = height * (0.34 - 0.08 * state.controls.sun);
    const sunR = 18 + 10 * state.controls.sun;
    context.fillStyle = COLOURS.sunGlow;
    context.beginPath();
    context.arc(sunX, sunY, sunR * 2.2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = COLOURS.sun;
    context.beginPath();
    context.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    context.fill();
  }

  // Wind streaks.
  if (state.controls.wind > 0) {
    context.strokeStyle = "rgba(94, 117, 136, 0.35)";
    context.lineWidth = 2;
    for (let index = 0; index < state.controls.wind * 3; index += 1) {
      const y = height * (0.3 + index * 0.06);
      context.beginPath();
      context.moveTo(width * 0.62, y);
      context.bezierCurveTo(width * 0.7, y - 8, width * 0.8, y + 8, width * 0.92, y);
      context.stroke();
    }
  }

  // Puddle: width follows the liquid count so the "shrinking" is visible.
  const puddleHalf = (width * 0.32) * (0.25 + 0.75 * (counts.liquid / 12));
  context.fillStyle = COLOURS.water;
  context.strokeStyle = COLOURS.waterDeep;
  context.lineWidth = 3;
  context.beginPath();
  context.ellipse(centreX, groundY + 8, puddleHalf, Math.max(6, puddleHalf * 0.18), 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  // Marked edge from the first moment, so the child can compare.
  context.setLineDash([6, 6]);
  context.strokeStyle = COLOURS.due;
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(centreX, groundY + 8, width * 0.32, Math.max(6, width * 0.32 * 0.18), 0, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);

  // Vapour units from the pure state.
  state.units.forEach((unit) => {
    if (unit.phase !== "vapour") return;
    const x = centreX + (unit.x - 0.5) * width * 0.6;
    const y = groundY - unit.height * (groundY - lidY);
    context.fillStyle = COLOURS.vapour;
    context.beginPath();
    context.arc(x, y, 7, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(94, 117, 136, 0.6)";
    context.lineWidth = 1;
    context.stroke();
  });

  // Lid and droplets.
  if (state.controls.lid) {
    context.fillStyle = COLOURS.lid;
    roundRect(context, width * 0.14, lidY - 14, width * 0.72, 14, 6);
    context.fill();
    context.fillStyle = COLOURS.inkSoft;
    context.font = `600 13px "Mukta", sans-serif`;
    context.textAlign = "center";
    context.fillText(language === "hi" ? "ठंडा ढक्कन" : language === "ta" ? "குளிர்ந்த மூடி" : "cold lid", centreX, lidY - 20);
  }
  const falling = scene ? puddleDropletPositions(scene) : [];
  for (const droplet of falling) {
    const x = centreX + droplet.x * sceneScale;
    const y = groundY - droplet.y * sceneScale;
    context.fillStyle = COLOURS.waterDeep;
    context.beginPath();
    context.arc(x, y, 6, 0, Math.PI * 2);
    context.fill();
  }
}

function drawSeesaw(context: CanvasRenderingContext2D, layout: Layout, state: SeesawState, scene: SeesawScene | null) {
  const { width, height } = layout;
  const task = seesawTask(state);
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, COLOURS.sky);
  sky.addColorStop(0.74, COLOURS.skyDeep);
  sky.addColorStop(0.75, COLOURS.ground);
  sky.addColorStop(1, COLOURS.groundDeep);
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  const groundY = height * 0.75;
  const scale = Math.min(width / (SEESAW_GEOMETRY.beamHalfLength * 2.6), height / 5);
  const pivotX = width / 2;
  const pivotY = groundY - SEESAW_GEOMETRY.pivotHeight * scale;
  const angle = scene ? seesawSceneAngle(scene) : 0;

  context.fillStyle = COLOURS.pivot;
  context.beginPath();
  context.moveTo(pivotX - 26, groundY);
  context.lineTo(pivotX + 26, groundY);
  context.lineTo(pivotX, pivotY);
  context.closePath();
  context.fill();

  context.save();
  context.translate(pivotX, pivotY);
  context.rotate(-angle);
  const beamHalf = SEESAW_GEOMETRY.beamHalfLength * scale;
  const beamThick = SEESAW_GEOMETRY.beamHalfThickness * scale * 2 + 8;
  context.fillStyle = COLOURS.beam;
  roundRect(context, -beamHalf, -beamThick / 2, beamHalf * 2, beamThick, 6);
  context.fill();

  const panOffset = SEESAW_GEOMETRY.panOffset * scale;
  const pieceSize = SEESAW_GEOMETRY.pieceSize * scale * 2;

  // Left pan: the roti with the target fraction shaded.
  const rotiR = pieceSize * 0.95;
  context.fillStyle = COLOURS.roti;
  context.strokeStyle = COLOURS.rotiEdge;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(-panOffset, -beamThick / 2 - rotiR, rotiR, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = COLOURS.rotiEdge;
  context.globalAlpha = 0.55;
  context.beginPath();
  context.moveTo(-panOffset, -beamThick / 2 - rotiR);
  context.arc(-panOffset, -beamThick / 2 - rotiR, rotiR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (task.target.numerator / task.target.denominator));
  context.closePath();
  context.fill();
  context.globalAlpha = 1;
  context.strokeStyle = "rgba(52,48,53,0.35)";
  context.lineWidth = 1;
  for (let index = 0; index < task.target.denominator; index += 1) {
    const theta = -Math.PI / 2 + (Math.PI * 2 * index) / task.target.denominator;
    context.beginPath();
    context.moveTo(-panOffset, -beamThick / 2 - rotiR);
    context.lineTo(-panOffset + Math.cos(theta) * rotiR, -beamThick / 2 - rotiR + Math.sin(theta) * rotiR);
    context.stroke();
  }
  context.fillStyle = COLOURS.ink;
  context.font = `700 ${Math.max(14, pieceSize * 0.5)}px "Baloo 2", sans-serif`;
  context.textAlign = "center";
  context.fillText(`${task.target.numerator}/${task.target.denominator}`, -panOffset, -beamThick / 2 - rotiR * 2 - 10);

  // Right pan: stacked unit pieces.
  for (let index = 0; index < state.pieces; index += 1) {
    const y = -beamThick / 2 - pieceSize * (index + 1);
    context.fillStyle = COLOURS.piece;
    context.strokeStyle = COLOURS.pieceEdge;
    context.lineWidth = 2;
    roundRect(context, panOffset - pieceSize / 2, y, pieceSize, pieceSize - 3, 5);
    context.fill();
    context.stroke();
    context.fillStyle = "#fffdf8";
    context.font = `700 ${Math.max(11, pieceSize * 0.38)}px "Baloo 2", sans-serif`;
    context.fillText(`${task.unit.numerator}/${task.unit.denominator}`, panOffset, y + pieceSize * 0.62);
  }
  context.restore();
}

function useBodhImage() {
  const ref = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const image = new Image();
    image.src = "/art/bodh/bodh-guide-512.webp";
    image.onload = () => { ref.current = image; };
  }, []);
  return ref;
}

export function WorldCanvas({ observation, station, language, onPlaceTap }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const seesawRef = useRef<{ scene: SeesawScene; pieces: number; taskId: string } | null>(null);
  const puddleRef = useRef<PuddleScene | null>(null);
  const stationRef = useRef(station);
  const observationRef = useRef(observation);
  const bodhImage = useBodhImage();

  useEffect(() => {
    stationRef.current = station;
    observationRef.current = observation;
  }, [station, observation]);

  useEffect(() => {
    let cancelled = false;
    void loadPhysics().then((engine) => { if (!cancelled) engineRef.current = engine; }).catch(() => { engineRef.current = null; });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    let last = performance.now();
    let accumulator = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const render = (now: number) => {
      const delta = Math.min(0.1, (now - last) / 1000);
      last = now;
      accumulator += delta;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const layout: Layout = { width: canvas.width / dpr, height: canvas.height / dpr, dpr };
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, layout.width, layout.height);

      const run = stationRef.current;
      const engine = engineRef.current;
      if (!run) {
        drawOverworld(context, layout, observationRef.current, language, bodhImage.current, now);
      } else if (run.sim.kind === "seesaw") {
        const sim = run.sim.state;
        if (engine) {
          const current = seesawRef.current;
          if (!current || current.pieces !== sim.pieces || current.taskId !== sim.taskId) {
            if (current) disposeScene(current.scene);
            seesawRef.current = { scene: createSeesawScene(engine, sim), pieces: sim.pieces, taskId: sim.taskId };
          }
          let steps = 0;
          while (accumulator >= PHYSICS_TIMESTEP && steps < 8) { accumulator -= PHYSICS_TIMESTEP; steps += 1; }
          if (steps > 0 && seesawRef.current) seesawRef.current.scene = stepScene(seesawRef.current.scene, steps);
        }
        drawSeesaw(context, layout, sim, seesawRef.current?.scene ?? null);
      } else {
        const sim = run.sim.state;
        if (engine) {
          puddleRef.current = syncPuddleScene(puddleRef.current ?? createPuddleScene(engine), sim);
          let steps = 0;
          while (accumulator >= PHYSICS_TIMESTEP && steps < 8) { accumulator -= PHYSICS_TIMESTEP; steps += 1; }
          if (steps > 0) puddleRef.current = settlePuddleScene(stepScene(puddleRef.current, steps));
        }
        drawPuddle(context, layout, sim, puddleRef.current, language);
      }
      if (accumulator > 0.25) accumulator = 0;
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [language, bodhImage]);

  useEffect(() => () => {
    if (seesawRef.current) disposeScene(seesawRef.current.scene);
    if (puddleRef.current) disposeScene(puddleRef.current);
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (station) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    for (const place of PLACES) {
      if (Math.hypot(x - place.x, (y - place.y) * (rect.height / rect.width)) < 0.12) {
        onPlaceTap(place.id);
        return;
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      role="img"
      aria-label={station ? observation.station?.title ?? "" : localized({ hi: "Bodh Van का नक्शा", en: "Map of Bodh Van" }, language)}
      onClick={handleClick}
    />
  );
}
