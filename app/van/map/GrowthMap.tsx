"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  EVIDENCE_RUNGS,
  createGrowthGraph,
  exportBodhiSeed,
  importBodhiSeed,
  nextFrontier,
  nodeRung,
  rungCounts,
  type EvidenceRung,
  type GrowthGraph,
} from "../../../lib/growth-graph";
import { GROWTH_EDGES, GROWTH_NODES, type GrowthNode } from "../../../lib/growth-graph-catalog";
import { loadGrowthGraph, saveGrowthGraph } from "../../../lib/growth-graph-store";
import { localized, type LocalizedText } from "../../../lib/narration-language";
import { PLACES, placeStatus } from "../../../lib/world/places";
import { BodhMark } from "../../components/BodhMark";
import { NarrationLanguageToggle, useNarrationLanguage } from "../../components/NarrationLanguageToggle";
import styles from "./GrowthMap.module.css";

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });

const COPY = {
  title: hiEn("तुम्हारा बढ़त का नक्शा", "Your growth map"),
  intro: hiEn(
    "ऊपर से देखो: हर पहाड़ी एक concept है। अंधेरी पहाड़ियाँ अभी दूर हैं, रोशन पहाड़ियाँ पास हैं, और गुलाबी पहाड़ियाँ फिर से देखने लायक हैं। यह score नहीं है—यह वह जगह है जहाँ तुम गए हो।",
    "Seen from above: every hill is a concept. Dark hills are still far, lit hills are within reach, and pink hills are worth a return. This is not a score—it is where you have been.",
  ),
  back: hiEn("दुनिया में वापस", "Back to the world"),
  ladder: hiEn("सबूत की सीढ़ी", "The evidence ladder"),
  rungs: {
    unseen: hiEn("नहीं देखा", "unseen"),
    noticed: hiEn("देखा", "noticed"),
    tinkered: hiEn("छेड़ा", "tinkered"),
    explained: hiEn("समझा", "explained"),
    transferred: hiEn("नई जगह लगाया", "transferred"),
    "taught-back": hiEn("Bodh को सिखाया", "taught-back"),
  } as Record<EvidenceRung, LocalizedText>,
  seed: hiEn("Bodhi बीज", "Bodhi seed"),
  seedHelp: hiEn(
    "यह छोटा text तुम्हारे नक्शे को दूसरे device पर ले जाता है। इसमें सिर्फ़ सीढ़ी की जगहें हैं—कोई नाम, कोई बात नहीं।",
    "This short text carries your map to another device. It holds only ladder positions—no name, no words.",
  ),
  copy: hiEn("बीज copy करो", "Copy seed"),
  copied: hiEn("copy हो गया", "copied"),
  restore: hiEn("बीज से वापस लाओ", "Restore from seed"),
  restored: hiEn("नक्शा वापस आ गया", "Map restored"),
  invalid: hiEn("यह बीज पहचाना नहीं गया", "That seed was not recognised"),
  paste: hiEn("यहाँ बीज चिपकाओ", "Paste a seed here"),
  lit: hiEn("अभी रोशन", "Lit right now"),
  places: hiEn("जगहें", "Places"),
  tick: hiEn("पल", "moments"),
  status: {
    lit: hiEn("रोशनी में", "lit"),
    due: hiEn("फिर देखो", "worth a return"),
    known: hiEn("देखी हुई", "visited"),
    fog: hiEn("धुंध में", "in the mist"),
  },
} as const;

/** Deterministic hill layout: atoms cluster under their Marble parent, parents spread by place. */
function layout(): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const byPlace = new Map<string, GrowthNode[]>();
  for (const place of PLACES) byPlace.set(place.id, GROWTH_NODES.filter((node) => place.nodeIds.includes(node.id)));
  for (const place of PLACES) {
    const nodes = byPlace.get(place.id) ?? [];
    const marble = nodes.filter((node) => node.kind === "marble");
    const atoms = nodes.filter((node) => node.kind === "atom");
    const baseX = place.x * 100;
    marble.forEach((node, index) => {
      const angle = (index / Math.max(1, marble.length)) * Math.PI * 2;
      positions.set(node.id, {
        x: baseX + Math.cos(angle) * 16,
        y: 34 + Math.sin(angle) * 14 + (place.y - 0.5) * 20,
      });
    });
    atoms.forEach((node, index) => {
      positions.set(node.id, {
        x: baseX - 14 + (index / Math.max(1, atoms.length - 1)) * 28,
        y: 78 + (index % 2) * 6,
      });
    });
  }
  return positions;
}

export function GrowthMap() {
  const language = useNarrationLanguage();
  const [graph, setGraph] = useState<GrowthGraph>(() => createGrowthGraph());
  const [hydrated, setHydrated] = useState(false);
  const [seedText, setSeedText] = useState("");
  const [notice, setNotice] = useState<LocalizedText | null>(null);
  const t = (text: LocalizedText) => localized(text, language);

  useEffect(() => {
    let cancelled = false;
    void loadGrowthGraph().then((loaded) => {
      if (cancelled) return;
      // Hydration from the on-device store happens once; later edits flow through restore().
      queueMicrotask(() => { setGraph(loaded); setHydrated(true); });
    });
    return () => { cancelled = true; };
  }, []);

  const positions = useMemo(() => layout(), []);
  const frontier = useMemo(() => nextFrontier(graph), [graph]);
  const lit = useMemo(() => new Set(frontier.map((entry) => entry.nodeId)), [frontier]);
  const due = useMemo(() => new Set(frontier.filter((entry) => entry.reason === "due").map((entry) => entry.nodeId)), [frontier]);
  const counts = rungCounts(graph);
  const seed = exportBodhiSeed(graph) ?? "";

  const copySeed = async () => {
    try {
      await navigator.clipboard.writeText(seed);
      setNotice(COPY.copied);
    } catch {
      setSeedText(seed);
    }
  };

  const restore = async () => {
    const imported = importBodhiSeed(seedText);
    if (!imported) {
      setNotice(COPY.invalid);
      return;
    }
    setGraph(imported);
    await saveGrowthGraph(imported);
    setNotice(COPY.restored);
  };

  return (
    <main className={`journey-shell ${styles.shell}`} id="main-content" lang={language}>
      <header className="journey-header">
        <Link className="back-link" href="/van"><span aria-hidden="true">←</span> {t(COPY.back)}</Link>
        <Link className="brand brand-compact" href="/" aria-label="Bodh home"><BodhMark size="mark" motion="still" priority /><span className="brand-copy"><strong>BODH</strong></span></Link>
        <div className="journey-header-tools"><NarrationLanguageToggle compact /></div>
      </header>

      <section className={styles.intro}>
        <h1>{t(COPY.title)}</h1>
        <p>{t(COPY.intro)}</p>
        <small>{graph.tick} {t(COPY.tick)}{hydrated ? "" : " · …"}</small>
      </section>

      <div className={styles.grid}>
        <svg className={styles.map} viewBox="0 0 100 100" role="img" aria-label={t(COPY.title)}>
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#eef3f6" />
              <stop offset="1" stopColor="#e3e7cd" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#sky)" rx="4" />
          {GROWTH_EDGES.map((edge) => {
            const a = positions.get(edge.prerequisiteId);
            const b = positions.get(edge.topicId);
            if (!a || !b) return null;
            return (
              <line
                key={`${edge.prerequisiteId}-${edge.topicId}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={edge.strength === "hard" ? "#6a6367" : "#b8b1ad"}
                strokeWidth={edge.strength === "hard" ? 0.35 : 0.2}
                strokeDasharray={edge.strength === "hard" ? undefined : "0.8 0.8"}
                opacity={0.6}
              />
            );
          })}
          {GROWTH_NODES.map((node) => {
            const point = positions.get(node.id)!;
            const rung = nodeRung(graph, node.id);
            const rungIndex = EVIDENCE_RUNGS.indexOf(rung);
            const radius = node.kind === "marble" ? 3.6 : 2.6;
            const isLit = lit.has(node.id);
            const isDue = due.has(node.id);
            const fill = isDue ? "#bd3e66" : rungIndex >= 3 ? "#6d7d40" : rungIndex >= 1 ? "#e18a55" : isLit ? "#f9dcc6" : "#c9c3bf";
            return (
              <g key={node.id} className={styles.hill} data-rung={rung} data-lit={isLit}>
                <title>{`${localized(node.label, language)} · ${t(COPY.rungs[rung])}`}</title>
                <path
                  d={`M ${point.x - radius * 1.6} ${point.y + radius} Q ${point.x} ${point.y - radius * 1.8} ${point.x + radius * 1.6} ${point.y + radius} Z`}
                  fill={fill}
                  stroke={isLit ? "#e18a55" : "#6a6367"}
                  strokeWidth={isLit ? 0.5 : 0.2}
                  opacity={rung === "unseen" && !isLit ? 0.55 : 1}
                />
                <text x={point.x} y={point.y + radius + 2.6} textAnchor="middle" fontSize={node.kind === "marble" ? 1.9 : 1.6} fill="#343035">
                  {localized(node.label, language).slice(0, 26)}
                </text>
              </g>
            );
          })}
        </svg>

        <aside className={styles.side}>
          <section className={styles.ladder}>
            <h2>{t(COPY.ladder)}</h2>
            <ol>
              {EVIDENCE_RUNGS.map((rung) => (
                <li key={rung} data-rung={rung}>
                  <span>{t(COPY.rungs[rung])}</span>
                  <strong>{counts[rung]}</strong>
                </li>
              ))}
            </ol>
          </section>

          <section className={styles.placesBox}>
            <h2>{t(COPY.places)}</h2>
            <ul>
              {PLACES.map((place) => {
                const status = placeStatus(graph, place.id, frontier);
                return (
                  <li key={place.id} data-status={status}>
                    <strong>{t(place.label)}</strong>
                    <span>{t(COPY.status[status])}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={styles.frontier}>
            <h2>{t(COPY.lit)}</h2>
            <ul>
              {frontier.slice(0, 6).map((entry) => {
                const node = GROWTH_NODES.find((candidate) => candidate.id === entry.nodeId)!;
                return <li key={entry.nodeId} data-reason={entry.reason}>{localized(node.label, language)}<small>{entry.reason}</small></li>;
              })}
            </ul>
          </section>

          <section className={styles.seedBox}>
            <h2>{t(COPY.seed)}</h2>
            <p>{t(COPY.seedHelp)}</p>
            <code>{seed}</code>
            <div className={styles.seedActions}>
              <button type="button" className="button button-secondary" onClick={copySeed}>{t(COPY.copy)}</button>
            </div>
            <label>
              <span>{t(COPY.paste)}</span>
              <textarea value={seedText} onChange={(event) => setSeedText(event.target.value)} rows={3} spellCheck={false} />
            </label>
            <div className={styles.seedActions}>
              <button type="button" className="button button-primary" onClick={restore} disabled={!seedText.trim()}>{t(COPY.restore)}</button>
              {notice && <span role="status">{t(notice)}</span>}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
