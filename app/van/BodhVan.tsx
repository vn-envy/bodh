"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore, type FormEvent } from "react";
import { localized, type LocalizedText } from "../../lib/narration-language";
import { PLACES, type PlaceId } from "../../lib/world/places";
import { observeWorld } from "../../lib/world/session";
import { BodhMark } from "../components/BodhMark";
import { NarrationLanguageToggle, useNarrationLanguage } from "../components/NarrationLanguageToggle";
import { StationPanel } from "../components/world/StationPanel";
import { WorldCanvas } from "../components/world/WorldCanvas";
import { WorldToolProvider, useWorld } from "../components/world/WorldToolProvider";
import styles from "./BodhVan.module.css";

const SEED_KEY = "bodh:van-seed:v1";

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });

const COPY = {
  title: hiEn("Bodh Van", "Bodh Van"),
  tagline: hiEn("एक दुनिया जिसमें तुम चलते हो। नक्शा तुम्हारी अपनी बढ़त है।", "A world you walk through. The map is your own growth."),
  map: hiEn("नक्शा देखो", "Zoom out to the map"),
  home: hiEn("घर", "Home"),
  agents: hiEn("Agent पहुँच", "Agent access"),
  agentsNote: hiEn(
    "यह पूरी दुनिया typed tools से चलती है। WebMCP वाले browser में Bodh Van के tools अपने-आप register हो जाते हैं; बाकी में ये forms वैसे ही काम करते हैं।",
    "This whole world moves through typed tools. In a WebMCP-capable browser the tools register automatically; elsewhere these forms simply work as forms.",
  ),
  registered: hiEn("WebMCP tools registered", "WebMCP tools registered"),
  unavailable: hiEn("WebMCP इस browser में नहीं है — tools फिर भी local हैं", "WebMCP not in this browser — tools still run locally"),
  walkTo: hiEn("यहाँ चलो", "Walk to"),
  ask: hiEn("Bodh से पूछो", "Ask Bodh"),
  go: hiEn("जाओ", "Go"),
  intents: { hint: hiEn("संकेत", "Hint"), explain: hiEn("समझाओ", "Explain"), "where-am-i": hiEn("मैं कहाँ हूँ?", "Where am I?") },
  loading: hiEn("Bodh तुम्हारी दुनिया याद कर रहा है…", "Bodh is remembering your world…"),
} as const;

let cachedSeed: string | null = null;

function readClientSeed() {
  if (cachedSeed) return cachedSeed;
  try {
    let value = window.localStorage.getItem(SEED_KEY);
    if (!value) {
      value = Math.random().toString(36).slice(2, 10);
      window.localStorage.setItem(SEED_KEY, value);
    }
    cachedSeed = value;
  } catch {
    cachedSeed = "bodh";
  }
  return cachedSeed;
}

const subscribeNever = () => () => {};

/** A stable per-device seed so a child's world keeps its layout; null during server rendering. */
function useStableSeed() {
  return useSyncExternalStore(subscribeNever, readClientSeed, () => null);
}

function VanInner() {
  const language = useNarrationLanguage();
  const { session, invoke, lastResult, webmcp, hydrated } = useWorld();
  const observation = useMemo(() => observeWorld(session), [session]);
  const t = (text: LocalizedText) => localized(text, language);

  const onPlaceTap = (placeId: PlaceId) => {
    if (session.world.position === placeId) invoke("bodh_enter_station");
    else invoke("bodh_walk_to", { placeId });
  };

  const submitWalk = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    invoke("bodh_walk_to", { placeId: String(data.get("placeId") ?? "") });
  };

  const submitAsk = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    invoke("bodh_ask_bodh", { intent: String(data.get("intent") ?? "hint") });
  };

  return (
    <main className={`journey-shell ${styles.shell}`} id="main-content" lang={language}>
      <header className="journey-header">
        <Link className="back-link" href="/"><span aria-hidden="true">←</span> {t(COPY.home)}</Link>
        <Link className="brand brand-compact" href="/" aria-label="Bodh home"><BodhMark size="mark" motion="still" priority /><span className="brand-copy"><strong>BODH</strong></span></Link>
        <div className="journey-header-tools">
          <Link className={styles.mapLink} href="/van/map">{t(COPY.map)}</Link>
          <NarrationLanguageToggle compact />
        </div>
      </header>

      <section className={styles.intro}>
        <h1>{t(COPY.title)}</h1>
        <p>{t(COPY.tagline)}</p>
        {!hydrated && <small>{t(COPY.loading)}</small>}
      </section>

      <div className={styles.world}>
        <div className={styles.canvasWrap}>
          <WorldCanvas observation={observation} station={session.world.station} language={language} onPlaceTap={onPlaceTap} />
        </div>
        <StationPanel observation={observation} station={session.world.station} language={language} lastResult={lastResult} invoke={invoke} />
      </div>

      <details className={styles.agents}>
        <summary>{t(COPY.agents)} · <span data-webmcp={webmcp}>{webmcp === "registered" ? t(COPY.registered) : t(COPY.unavailable)}</span></summary>
        <p>{t(COPY.agentsNote)}</p>
        <div className={styles.agentForms}>
          <form
            // WebMCP declarative attributes; inert in browsers without WebMCP.
            {...{ toolname: "bodh_walk_to", tooldescription: "Walk to a lit place in Bodh Van." }}
            onSubmit={submitWalk}
          >
            <label>
              {t(COPY.walkTo)}
              <select name="placeId" {...{ toolparamdescription: "The place to walk to" }} defaultValue={PLACES[0].id}>
                {PLACES.map((place) => <option key={place.id} value={place.id}>{t(place.label)}</option>)}
              </select>
            </label>
            <button type="submit" className="button button-secondary">{t(COPY.go)}</button>
          </form>
          <form
            {...{ toolname: "bodh_ask_bodh", tooldescription: "Ask Bodh for a hint, the next explanation, or where the child is." }}
            onSubmit={submitAsk}
          >
            <label>
              {t(COPY.ask)}
              <select name="intent" {...{ toolparamdescription: "hint, explain, or where-am-i" }} defaultValue="hint">
                {(["hint", "explain", "where-am-i"] as const).map((intent) => <option key={intent} value={intent}>{t(COPY.intents[intent])}</option>)}
              </select>
            </label>
            <button type="submit" className="button button-secondary">{t(COPY.go)}</button>
          </form>
          <a className={styles.manifestLink} href="/api/tools">GET /api/tools</a>
        </div>
      </details>
    </main>
  );
}

export function BodhVan() {
  const seed = useStableSeed();
  const language = useNarrationLanguage();
  if (!seed) {
    return (
      <main className={`journey-shell ${styles.shell}`} id="main-content" lang={language}>
        <section className={styles.intro}><BodhMark pose="welcome" size="medium" motion="breathe" /><p>{localized(COPY.loading, language)}</p></section>
      </main>
    );
  }
  return (
    <WorldToolProvider seed={seed}>
      <VanInner />
    </WorldToolProvider>
  );
}
