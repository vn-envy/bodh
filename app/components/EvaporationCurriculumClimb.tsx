"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import taxonomy from "../../data/taxonomy/evaporation-water-cycle.slice.json";
import type { LocalizedText, NarrationLanguage } from "../../lib/narration-language";
import styles from "../science/evaporation/EvaporationJourney.module.css";
import { BodhMark } from "./BodhMark";

const TOPIC_IDS = [
  "mt_TlLE4cZgOr",
  "mt_PrWc-HZzDl",
  "mt_IhWzO4sQPg",
  "mt_nRF_VRntrW",
  "mt_Pl-nsjYGZ3",
  "mt_ahSqW_kK1b",
  "mt_fhqVdj4BYr",
  "mt_Qkewo5M3_c",
] as const;

type TopicId = (typeof TOPIC_IDS)[number];
type GraphPoint = Readonly<{ x: number; y: number }>;
type TopicStatus = "visited" | "current" | "ahead" | "support";

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });

const TOPIC_COPY: Record<TopicId, Readonly<{
  short: LocalizedText;
  meaning: LocalizedText;
  clue: LocalizedText;
}>> = {
  "mt_TlLE4cZgOr": {
    short: hiEn("Rain और puddles", "Rain and puddles"),
    meaning: hiEn("Puddle छोटा होता है क्योंकि पानी हवा में वापस जाता है।", "A puddle shrinks because water moves back into the air."),
    clue: hiEn("बच्चा पानी को खत्म मानता है या move हुआ मानता है?", "Does the learner think water was destroyed or moved?"),
  },
  "mt_PrWc-HZzDl": {
    short: hiEn("Temperature", "Temperature"),
    meaning: hiEn("गर्म और ठंडा होने को describe और measure करना।", "Describe and measure how hot or cold something is."),
    clue: hiEn("क्या warmth को evaporation की speed से जोड़ सकता है?", "Can warmth be connected to evaporation rate?"),
  },
  "mt_IhWzO4sQPg": {
    short: hiEn("Cloud droplets", "Cloud droplets"),
    meaning: hiEn("Clouds cooled water vapour से बनी tiny liquid droplets हैं।", "Clouds are tiny liquid droplets formed when water vapour cools."),
    clue: hiEn("क्या cloud और invisible vapour का फर्क साफ़ है?", "Is the difference between a cloud and invisible vapour clear?"),
  },
  "mt_nRF_VRntrW": {
    short: hiEn("पानी कहाँ मिलता है", "Where water is found"),
    meaning: hiEn("पानी oceans, rivers, ice, underground और atmosphere में मिलता है।", "Water is found in oceans, rivers, ice, underground, and the atmosphere."),
    clue: hiEn("क्या atmosphere भी पानी की एक location है?", "Can the atmosphere also be a location for water?"),
  },
  "mt_Pl-nsjYGZ3": {
    short: hiEn("Heating और cooling", "Heating and cooling"),
    meaning: hiEn("Energy बदलने पर matter की state बदल सकती है।", "A change in energy can change the state of matter."),
    clue: hiEn("क्या liquid से gas और gas से liquid का कारण समझा सकता है?", "Can the learner explain why liquid becomes gas and gas becomes liquid?"),
  },
  "mt_ahSqW_kK1b": {
    short: hiEn("Science के सही शब्द", "Precise science words"),
    meaning: hiEn("Evaporate और condense अलग state-change processes हैं।", "Evaporate and condense name different state-change processes."),
    clue: hiEn("क्या बच्चा evaporate, boil और disappear को अलग रखता है?", "Can the learner distinguish evaporate, boil, and disappear?"),
  },
  "mt_fhqVdj4BYr": {
    short: hiEn("Water cycle", "Water cycle"),
    meaning: hiEn("Evaporation, condensation और precipitation पानी को cycle में चलाते हैं।", "Evaporation, condensation, and precipitation move water through a cycle."),
    clue: hiEn("क्या बच्चा एक ही water matter को पूरे loop में track कर सकता है?", "Can the learner track the same water matter through the whole loop?"),
  },
  "mt_Qkewo5M3_c": {
    short: hiEn("Evaporation और water cycle", "Evaporation and the water cycle"),
    meaning: hiEn("Temperature को evaporation rate से और condensation को लौटती liquid से जोड़ना।", "Connect temperature to evaporation rate and condensation to returning liquid."),
    clue: hiEn("क्या puddle और bathroom mirror दोनों को इसी model से explain कर सकता है?", "Can the same model explain both a puddle and a bathroom mirror?"),
  },
};

const GRAPH_LAYOUT: Record<TopicId, GraphPoint> = {
  "mt_TlLE4cZgOr": { x: 10, y: 77 },
  "mt_PrWc-HZzDl": { x: 11, y: 24 },
  "mt_IhWzO4sQPg": { x: 36, y: 13 },
  "mt_nRF_VRntrW": { x: 35, y: 88 },
  "mt_Pl-nsjYGZ3": { x: 35, y: 52 },
  "mt_ahSqW_kK1b": { x: 66, y: 83 },
  "mt_fhqVdj4BYr": { x: 66, y: 35 },
  "mt_Qkewo5M3_c": { x: 90, y: 20 },
};

const TRAVEL_ROUTE = [
  "mt_TlLE4cZgOr",
  "mt_TlLE4cZgOr",
  "mt_fhqVdj4BYr",
  "mt_fhqVdj4BYr",
  "mt_Qkewo5M3_c",
] as const satisfies readonly TopicId[];

const TOPICS = new Map(
  taxonomy.topics.map((topic) => [topic.id as TopicId, topic] as const),
);

function edgeStyle(from: GraphPoint, to: GraphPoint): CSSProperties {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const width = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return {
    "--science-edge-x": `${from.x}%`,
    "--science-edge-y": `${from.y}%`,
    "--science-edge-width": `${width}%`,
    "--science-edge-angle": `${angle}deg`,
  } as CSSProperties;
}

function topicStatus(topicId: TopicId, current: TopicId, stageIndex: number): TopicStatus {
  if (topicId === current) return "current";
  const firstVisit = TRAVEL_ROUTE.indexOf(topicId as (typeof TRAVEL_ROUTE)[number]);
  if (firstVisit >= 0 && firstVisit < stageIndex) return "visited";
  if (firstVisit > stageIndex) return "ahead";
  return "support";
}

function statusCopy(status: TopicStatus, language: NarrationLanguage) {
  const copy: Record<TopicStatus, LocalizedText> = {
    visited: hiEn("देख लिया", "Visited"),
    current: hiEn("Bodh यहाँ है", "Bodh is here"),
    ahead: hiEn("आगे", "Ahead"),
    support: hiEn("सहायक idea", "Supporting idea"),
  };
  return copy[status][language];
}

export function EvaporationCurriculumClimb({
  language,
  stageIndex,
}: {
  language: NarrationLanguage;
  stageIndex: number;
}) {
  const boundedStage = Math.max(0, Math.min(stageIndex, TRAVEL_ROUTE.length - 1));
  const currentTopicId = TRAVEL_ROUTE[boundedStage];
  const [selectedTopicId, setSelectedTopicId] = useState<TopicId>(currentTopicId);
  const effectiveSelection = useMemo(
    () => selectedTopicId === TRAVEL_ROUTE[Math.max(0, boundedStage - 1)] ? currentTopicId : selectedTopicId,
    [boundedStage, currentTopicId, selectedTopicId],
  );
  const selected = TOPICS.get(effectiveSelection)!;
  const selectedCopy = TOPIC_COPY[effectiveSelection];

  return (
    <section className={styles.climb} aria-labelledby="evaporation-climb-title" lang={language}>
      <div className={styles.climbHeading}>
        <div>
          <span className={styles.eyebrow}>{language === "hi" ? "तुम्हारा असली Marble concept map" : "Your real Marble concept map"}</span>
          <h2 id="evaporation-climb-title">{language === "hi" ? "Bodh पानी के साथ idea से idea तक चलता है।" : "Bodh travels with the water from idea to idea."}</h2>
          <p>{language === "hi"
            ? "हर node os-taxonomy का canonical topic है। Lines केवल source में मौजूद prerequisite dependencies दिखाती हैं।"
            : "Every node is a canonical os-taxonomy topic. Lines show only prerequisite dependencies present in the source."}</p>
        </div>
        <div className={styles.climbSource} lang="en">
          <strong>{taxonomy.topics.length} Marble topics</strong>
          <span>{taxonomy.dependencies.length} canonical dependencies</span>
          <small>source · {taxonomy.source.commit.slice(0, 8)}</small>
        </div>
      </div>

      <div className={styles.climbLegend} aria-label={language === "hi" ? "Map संकेत" : "Map legend"}>
        <span data-status="visited">{statusCopy("visited", language)}</span>
        <span data-status="current">{statusCopy("current", language)}</span>
        <span data-status="ahead">{statusCopy("ahead", language)}</span>
        <span data-status="support">{statusCopy("support", language)}</span>
      </div>

      <div className={styles.climbWorkspace}>
        <div className={styles.climbCanvas} role="group" aria-label={language === "hi" ? "Water-cycle prerequisite graph" : "Water-cycle prerequisite graph"}>
          <div className={styles.climbSky} aria-hidden="true"><i /><i /><i /></div>
          <div className={styles.climbEdges} aria-hidden="true">
            {taxonomy.dependencies.map((edge) => {
              const from = edge.prerequisiteId as TopicId;
              const to = edge.topicId as TopicId;
              return (
                <span
                  className={`${styles.climbEdge} ${edge.strength === "hard" ? styles.climbEdgeHard : styles.climbEdgeSoft}`}
                  style={edgeStyle(GRAPH_LAYOUT[from], GRAPH_LAYOUT[to])}
                  key={`${from}:${to}`}
                />
              );
            })}
          </div>
          <div className={styles.climbNodes}>
            {TOPIC_IDS.map((topicId) => {
              const topic = TOPICS.get(topicId)!;
              const point = GRAPH_LAYOUT[topicId];
              const status = topicStatus(topicId, currentTopicId, boundedStage);
              const nodeStyle = {
                "--science-node-x": `${point.x}%`,
                "--science-node-y": `${point.y}%`,
              } as CSSProperties;
              return (
                <button
                  className={`${styles.climbNode} ${styles[`climbNode${status[0].toUpperCase()}${status.slice(1)}` as keyof typeof styles]} ${effectiveSelection === topicId ? styles.climbNodeSelected : ""}`}
                  style={nodeStyle}
                  type="button"
                  aria-pressed={effectiveSelection === topicId}
                  aria-label={`${TOPIC_COPY[topicId].short[language]}. ${statusCopy(status, language)}. Marble: ${topic.name}.`}
                  onClick={() => setSelectedTopicId(topicId)}
                  key={topicId}
                >
                  {status === "current" && <span className={styles.climbBodh}><BodhMark pose="guide" size="mark" motion="guide" /></span>}
                  <small>{statusCopy(status, language)}</small>
                  <strong>{TOPIC_COPY[topicId].short[language]}</strong>
                  <span>{topic.ageRangeStart}–{topic.ageRangeEnd}</span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className={styles.climbDetail} aria-live="polite">
          <span>{TOPIC_COPY[effectiveSelection].short[language]}</span>
          <h3>{selected.name}</h3>
          <small lang="en">Marble · {selected.domain} · ages {selected.ageRangeStart}–{selected.ageRangeEnd}</small>
          <p>{selectedCopy.meaning[language]}</p>
          <div>
            <strong>{language === "hi" ? "Bodh यहाँ क्या देखता है" : "What Bodh looks for here"}</strong>
            <p>{selectedCopy.clue[language]}</p>
          </div>
        </aside>
      </div>

      <details className={styles.climbDependencies}>
        <summary>{language === "hi" ? "Canonical dependencies देखें" : "Inspect canonical dependencies"}</summary>
        <ol>
          {taxonomy.dependencies.map((edge) => (
            <li key={`${edge.prerequisiteId}:${edge.topicId}`}>
              <span><strong>{TOPIC_COPY[edge.prerequisiteId as TopicId].short[language]}</strong><b aria-hidden="true">→</b><strong>{TOPIC_COPY[edge.topicId as TopicId].short[language]}</strong></span>
              <small lang="en">{edge.strength} · {edge.reason}</small>
            </li>
          ))}
        </ol>
      </details>

      <p className={styles.climbBoundary}>{language === "hi"
        ? "यह authored learning route है—grade, mastery score या पूरे Science curriculum coverage का दावा नहीं।"
        : "This is an authored learning route—not a grade, mastery score, or claim of complete Science curriculum coverage."}</p>
    </section>
  );
}
