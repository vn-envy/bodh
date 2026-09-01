"use client";

import { useEffect, useMemo } from "react";
import { localized, type LocalizedText, type NarrationLanguage } from "../../../lib/narration-language";
import type { PlaceId } from "../../../lib/world/places";
import type { StationRun, WorldObservation } from "../../../lib/world/session";
import { STATIONS } from "../../../lib/world/stations";
import type { ToolResult } from "../../../lib/world-tools";
import { BodhMark, type BodhPose } from "../BodhMark";
import { useBeatNarration, type SpokenBeat } from "./useBeatNarration";
import styles from "./StationPanel.module.css";

type Props = Readonly<{
  observation: WorldObservation;
  station: StationRun | null;
  language: NarrationLanguage;
  lastResult: ToolResult | null;
  invoke: (name: string, input?: Record<string, unknown>) => ToolResult;
}>;

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });

const COPY = {
  walk: hiEn("यहाँ चलो", "Walk here"),
  enter: hiEn("अंदर जाओ", "Enter"),
  leave: hiEn("बाहर आओ", "Leave"),
  check: hiEn("जाँचो", "Check"),
  hint: hiEn("संकेत", "Hint"),
  explain: hiEn("समझाओ, Bodh", "Explain, Bodh"),
  listen: hiEn("सुनो", "Listen"),
  stopListening: hiEn("रोको", "Stop"),
  edge: hiEn("तुम Bodh Van के किनारे पर खड़े हो। रोशनी वाली जगह चुनो।", "You are standing at the edge of Bodh Van. Pick a lit place."),
  sun: hiEn("सूरज", "Sun"),
  lid: hiEn("ढक्कन", "Lid"),
  wind: hiEn("हवा", "Wind"),
  wait: hiEn("कुछ पल रुको", "Wait a few moments"),
  pieces: hiEn("टुकड़े", "Pieces"),
  liquid: hiEn("तरल", "Liquid"),
  vapour: hiEn("वाष्प", "Vapour"),
  droplets: hiEn("बूँदें", "Droplets"),
  total: hiEn("कुल पानी", "Total water"),
  attempts: hiEn("कोशिशें", "Tries"),
  transcript: hiEn("Bodh ने अभी क्या कहा", "What Bodh just said"),
  ideas: hiEn("बातें", "ideas"),
  done: hiEn("यह जगह अब तुम्हारी है।", "This place is yours now."),
  status: {
    lit: hiEn("रोशनी में", "Lit"),
    due: hiEn("फिर से देखने लायक", "Worth a return"),
    known: hiEn("देखी हुई", "Visited"),
    fog: hiEn("अभी धुंध में", "Still in the mist"),
  },
} as const;

function poseFor(station: StationRun | null): BodhPose {
  if (!station) return "guide";
  switch (station.phase) {
    case "probe": return "listen";
    case "tinker": return "tinker";
    case "transfer-do": return "tinker";
    case "done": return "celebrate";
    default: return "guide";
  }
}

export function StationPanel({ observation, station, language, lastResult, invoke }: Props) {
  const t = (text: LocalizedText) => localized(text, language);
  const narration = useBeatNarration(station?.id ?? null, language);
  const pieces = station?.sim.kind === "seesaw" ? station.sim.state.pieces : 0;
  const beats = useMemo(() => {
    const raw = lastResult?.structuredContent.beats;
    return Array.isArray(raw) ? (raw as SpokenBeat[]) : [];
  }, [lastResult]);

  useEffect(() => {
    if (beats.length > 0) void narration.play(beats);
    // Play once per new explanation; the hook owns cancellation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beats]);

  const view = observation.station?.view ?? {};
  const pose = poseFor(station);
  const message = lastResult?.content[0]?.text ?? t(COPY.edge);
  const messageOnly = beats.length > 0 ? message.slice(0, message.indexOf(beats[0].text) > 0 ? message.indexOf(beats[0].text) : undefined).trim() : message;

  return (
    <aside className={styles.panel} aria-live="polite">
      <div className={styles.bodhLine}>
        <BodhMark pose={pose} size="small" motion={pose === "welcome" ? "breathe" : pose} />
        <p className={styles.speech} data-ok={lastResult?.ok ?? true}>{messageOnly}</p>
      </div>

      {!station && (
        <ul className={styles.places}>
          {observation.places.map((place) => (
            <li key={place.id} data-status={place.status} data-here={place.here}>
              <div>
                <strong>{place.label}</strong>
                <span>{t(COPY.status[place.status as keyof typeof COPY.status])}</span>
              </div>
              {place.here
                ? <button type="button" className="button button-primary" onClick={() => invoke("bodh_enter_station")}>{t(COPY.enter)} →</button>
                : <button type="button" className="button button-secondary" disabled={place.status === "fog"} onClick={() => invoke("bodh_walk_to", { placeId: place.id as PlaceId })}>{t(COPY.walk)}</button>}
            </li>
          ))}
        </ul>
      )}

      {station && observation.station && (
        <section className={styles.station} data-phase={station.phase}>
          <header>
            <span className={styles.eyebrow}>{observation.station.title}</span>
            <small>{t(COPY.attempts)} · {station.attempts}{station.atomIds.length > 0 ? ` · ${station.explainedCount}/${station.atomIds.length} ${t(COPY.ideas)}` : ""}</small>
          </header>
          <p className={styles.invitation}>{t(STATIONS[station.id].invitation)}</p>

          {observation.station.probe && (
            <div className={styles.probe} role="group" aria-labelledby="station-probe">
              <h2 id="station-probe">{observation.station.probe.question}</h2>
              {observation.station.probe.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => invoke("bodh_answer_probe", { probeId: observation.station!.probe!.id, optionId: option.id })}
                >{option.label}</button>
              ))}
            </div>
          )}

          {(station.phase === "tinker" || station.phase === "transfer-do") && station.sim.kind === "puddle" && (
            <div className={styles.controls}>
              <label>
                <span>{t(COPY.sun)} · {String(view.sun)}</span>
                <input type="range" min={0} max={3} step={1} value={Number(view.sun)} onChange={(event) => invoke("bodh_tinker", { control: "sun", value: Number(event.target.value) })} />
              </label>
              <label>
                <span>{t(COPY.wind)} · {String(view.wind)}</span>
                <input type="range" min={0} max={2} step={1} value={Number(view.wind)} onChange={(event) => invoke("bodh_tinker", { control: "wind", value: Number(event.target.value) })} />
              </label>
              <label className={styles.toggle}>
                <input type="checkbox" checked={Boolean(view.lid)} onChange={(event) => invoke("bodh_tinker", { control: "lid", value: event.target.checked ? 1 : 0 })} />
                <span>{t(COPY.lid)}</span>
              </label>
              <button type="button" className="button button-secondary" onClick={() => invoke("bodh_tinker", { control: "wait", value: 5 })}>{t(COPY.wait)}</button>
              <dl className={styles.counter}>
                <div><dt>{t(COPY.liquid)}</dt><dd>{String(view.liquid)}</dd></div>
                <div><dt>{t(COPY.vapour)}</dt><dd>{String(view.vapour)}</dd></div>
                <div><dt>{t(COPY.droplets)}</dt><dd>{String(view.droplet)}</dd></div>
                <div className={styles.total}><dt>{t(COPY.total)}</dt><dd>{String(view.total)}</dd></div>
              </dl>
            </div>
          )}

          {(station.phase === "tinker" || station.phase === "transfer-do") && station.sim.kind === "seesaw" && (
            <div className={styles.controls}>
              <div className={styles.pieceRow}>
                <button type="button" aria-label="remove a piece" onClick={() => invoke("bodh_tinker", { control: "pieces", value: Math.max(0, pieces - 1) })}>−</button>
                <strong>{String(view.pieces)} × {String(view.pieceSize)}</strong>
                <button type="button" aria-label="add a piece" onClick={() => invoke("bodh_tinker", { control: "pieces", value: Math.min(Number(view.capacity), pieces + 1) })}>+</button>
              </div>
              <small>{String(view.leftPan)} ⟷ {String(view.pieces)} × {String(view.pieceSize)}</small>
            </div>
          )}

          <div className={styles.actions}>
            {(station.phase === "tinker" || station.phase === "transfer-do") && (
              <button type="button" className="button button-primary" onClick={() => invoke("bodh_check")}>{t(COPY.check)}</button>
            )}
            {station.phase === "explain" && (
              <button type="button" className="button button-primary" onClick={() => invoke("bodh_ask_bodh", { intent: "explain" })}>{t(COPY.explain)} →</button>
            )}
            {station.phase !== "done" && (
              <button type="button" className="button button-secondary" onClick={() => invoke("bodh_ask_bodh", { intent: "hint" })}>{t(COPY.hint)}</button>
            )}
            <button type="button" className="button button-secondary" onClick={() => invoke("bodh_leave_station")}>{t(COPY.leave)}</button>
          </div>

          {beats.length > 0 && (
            <details className={styles.transcript} open>
              <summary>
                {t(COPY.transcript)}
                {narration.state === "playing"
                  ? <button type="button" onClick={(event) => { event.preventDefault(); narration.stop(); }}>{t(COPY.stopListening)}</button>
                  : <button type="button" onClick={(event) => { event.preventDefault(); void narration.play(beats); }}>{t(COPY.listen)}</button>}
              </summary>
              <ol>
                {beats.map((beat) => (
                  <li key={beat.id} data-active={narration.activeBeatId === beat.id}>
                    <strong>{beat.key}</strong>
                    <p>{beat.text}</p>
                  </li>
                ))}
              </ol>
            </details>
          )}

          {station.phase === "done" && <p className={styles.done}>{t(COPY.done)}</p>}
        </section>
      )}
    </aside>
  );
}
