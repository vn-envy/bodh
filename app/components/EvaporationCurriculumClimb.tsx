"use client";

import type { CSSProperties } from "react";
import { Fragment, useState } from "react";
import taxonomy from "../../data/taxonomy/evaporation-water-cycle.slice.json";
import { localized, type LocalizedText, type NarrationLanguage } from "../../lib/narration-language";
import styles from "../science/evaporation/EvaporationJourney.module.css";
import { BodhMark } from "./BodhMark";

const TOPIC_IDS = [
  "mt_TlLE4cZgOr",
  "mt_fhqVdj4BYr",
  "mt_Qkewo5M3_c",
  "mt_IhWzO4sQPg",
  "mt_PrWc-HZzDl",
  "mt_nRF_VRntrW",
  "mt_Pl-nsjYGZ3",
  "mt_ahSqW_kK1b",
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
    short: hiEn("बारिश और पानी के गड्ढे", "Rain and puddles"),
    meaning: hiEn("पानी का गड्ढा छोटा होता है क्योंकि पानी हवा में लौट जाता है।", "A puddle shrinks because water moves back into the air."),
    clue: hiEn("क्या बच्चा मानता है कि पानी खत्म हुआ या केवल दूसरी जगह गया?", "Does the learner think water was destroyed or moved?"),
  },
  "mt_PrWc-HZzDl": {
    short: hiEn("तापमान", "Temperature"),
    meaning: hiEn("किसी चीज़ के गर्म या ठंडा होने को बताना और मापना।", "Describe and measure how hot or cold something is."),
    clue: hiEn("क्या बच्चा गर्मी को पानी के भाप बनने की गति से जोड़ सकता है?", "Can warmth be connected to evaporation rate?"),
  },
  "mt_IhWzO4sQPg": {
    short: hiEn("बादल की बूँदें", "Cloud droplets"),
    meaning: hiEn("बादल, ठंडी हुई जलवाष्प से बनी तरल पानी की बहुत छोटी बूँदें हैं।", "Clouds are tiny liquid droplets formed when water vapour cools."),
    clue: hiEn("क्या बादल और अदृश्य जलवाष्प का अंतर साफ़ है?", "Is the difference between a cloud and invisible vapour clear?"),
  },
  "mt_nRF_VRntrW": {
    short: hiEn("पानी कहाँ मिलता है", "Where water is found"),
    meaning: hiEn("पानी समुद्र, नदियों, बर्फ, जमीन के नीचे और वायुमंडल में मिलता है।", "Water is found in oceans, rivers, ice, underground, and the atmosphere."),
    clue: hiEn("क्या वायुमंडल भी पानी की एक जगह हो सकता है?", "Can the atmosphere also be a location for water?"),
  },
  "mt_Pl-nsjYGZ3": {
    short: hiEn("गरम और ठंडा होना", "Heating and cooling"),
    meaning: hiEn("ऊर्जा बदलने पर पदार्थ की अवस्था बदल सकती है।", "A change in energy can change the state of matter."),
    clue: hiEn("क्या बच्चा तरल से गैस और गैस से तरल बनने का कारण समझा सकता है?", "Can the learner explain why liquid becomes gas and gas becomes liquid?"),
  },
  "mt_ahSqW_kK1b": {
    short: hiEn("विज्ञान के सही शब्द", "Precise science words"),
    meaning: hiEn("वाष्पीकरण और संघनन, अवस्था बदलने की अलग प्रक्रियाएँ हैं।", "Evaporate and condense name different state-change processes."),
    clue: hiEn("क्या बच्चा भाप बनने, उबलने और गायब होने में अंतर समझता है?", "Can the learner distinguish evaporate, boil, and disappear?"),
  },
  "mt_fhqVdj4BYr": {
    short: hiEn("जल चक्र", "Water cycle"),
    meaning: hiEn("वाष्पीकरण, संघनन और वर्षा पानी को एक चक्र में चलाते हैं।", "Evaporation, condensation, and precipitation move water through a cycle."),
    clue: hiEn("क्या बच्चा उसी पानी को पूरे चक्र में पहचान सकता है?", "Can the learner track the same water matter through the whole loop?"),
  },
  "mt_Qkewo5M3_c": {
    short: hiEn("वाष्पीकरण और जल चक्र", "Evaporation and the water cycle"),
    meaning: hiEn("तापमान को वाष्पीकरण की गति से और संघनन को लौटते तरल पानी से जोड़ना।", "Connect temperature to evaporation rate and condensation to returning liquid."),
    clue: hiEn("क्या बच्चा पानी के गड्ढे और बाथरूम के शीशे—दोनों को इसी विचार से समझा सकता है?", "Can the same model explain both a puddle and a bathroom mirror?"),
  },
};

const GRAPH_LAYOUT: Record<TopicId, GraphPoint> = {
  "mt_TlLE4cZgOr": { x: 13, y: 50 },
  "mt_PrWc-HZzDl": { x: 54, y: 14 },
  "mt_IhWzO4sQPg": { x: 32, y: 18 },
  "mt_nRF_VRntrW": { x: 32, y: 82 },
  "mt_Pl-nsjYGZ3": { x: 69, y: 82 },
  "mt_ahSqW_kK1b": { x: 89, y: 82 },
  "mt_fhqVdj4BYr": { x: 54, y: 50 },
  "mt_Qkewo5M3_c": { x: 87, y: 50 },
};

const MAIN_ROUTE = [
  "mt_TlLE4cZgOr",
  "mt_fhqVdj4BYr",
  "mt_Qkewo5M3_c",
] as const satisfies readonly TopicId[];

const MAIN_ROUTE_PAIRS = new Set(
  MAIN_ROUTE.slice(0, -1).map((topicId, index) => `${topicId}:${MAIN_ROUTE[index + 1]}`),
);

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
    support: hiEn("सहायक विचार", "Supporting idea"),
  };
  return localized(copy[status], language);
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
  const effectiveSelection = selectedTopicId;
  const selected = TOPICS.get(effectiveSelection)!;
  const selectedCopy = TOPIC_COPY[effectiveSelection];

  return (
    <section className={styles.climb} aria-labelledby="evaporation-climb-title" lang={language}>
      <div className={styles.climbHeading}>
        <div>
          <span className={styles.eyebrow}>{language === "hi" ? "तुम्हारा असली Marble अवधारणा-मानचित्र" : "Your real Marble concept map"}</span>
          <h2 id="evaporation-climb-title">{language === "hi" ? "Bodh पानी के साथ एक विचार से दूसरे विचार तक चलता है।" : "Bodh travels with the water from idea to idea."}</h2>
          <p>{language === "hi"
            ? "हर पड़ाव पाठ्यक्रम की एक प्रमाणित अवधारणा है। बिंदीदार रेखाएँ केवल स्रोत में मौजूद ज़रूरी कड़ियाँ दिखाती हैं।"
            : "Every node is a canonical os-taxonomy topic. Lines show only prerequisite dependencies present in the source."}</p>
        </div>
        <div className={styles.climbSource}>
          <strong>{taxonomy.topics.length} {language === "hi" ? "Marble विषय" : "Marble topics"}</strong>
          <span>{taxonomy.dependencies.length} {language === "hi" ? "प्रमाणित कड़ियाँ" : "canonical dependencies"}</span>
          <small>{language === "hi" ? "स्रोत" : "source"} · {taxonomy.source.commit.slice(0, 8)}</small>
        </div>
      </div>

      <div className={styles.climbLegend} aria-label={language === "hi" ? "मानचित्र संकेत" : "Map legend"}>
        <span data-status="visited">{statusCopy("visited", language)}</span>
        <span data-status="current">{statusCopy("current", language)}</span>
        <span data-status="ahead">{statusCopy("ahead", language)}</span>
        <span data-status="support">{statusCopy("support", language)}</span>
      </div>

      <div className={styles.climbWorkspace}>
        <div className={styles.climbCanvas} role="group" aria-label={language === "hi" ? "जल चक्र की ज़रूरी अवधारणाओं का मानचित्र" : "Water-cycle prerequisite graph"}>
          <div className={styles.climbSky} aria-hidden="true"><i /><i /><i /></div>
          <div className={styles.climbEdges} aria-hidden="true">
            {taxonomy.dependencies.map((edge) => {
              const from = edge.prerequisiteId as TopicId;
              const to = edge.topicId as TopicId;
              const isMainRoute = MAIN_ROUTE_PAIRS.has(`${from}:${to}`);
              return (
                <span
                  className={`${styles.climbEdge} ${isMainRoute ? styles.climbEdgeRoute : styles.climbEdgeSupport}`}
                  style={edgeStyle(GRAPH_LAYOUT[from], GRAPH_LAYOUT[to])}
                  key={`${from}:${to}`}
                />
              );
            })}
          </div>
          <div className={styles.climbNodes}>
            {TOPIC_IDS.map((topicId, index) => {
              const topic = TOPICS.get(topicId)!;
              const point = GRAPH_LAYOUT[topicId];
              const status = topicStatus(topicId, currentTopicId, boundedStage);
              const routeIndex = MAIN_ROUTE.indexOf(topicId as (typeof MAIN_ROUTE)[number]);
              const routeStep = routeIndex >= 0 ? routeIndex + 1 : null;
              const nodeStyle = {
                "--science-node-x": `${point.x}%`,
                "--science-node-y": `${point.y}%`,
              } as CSSProperties;
              return (
                <Fragment key={topicId}>
                  {index === MAIN_ROUTE.length && (
                    <p className={styles.climbSupportHeading}>{language === "hi" ? "सहायक Marble विचार" : "Supporting Marble ideas"}</p>
                  )}
                  <button
                    className={`${styles.climbNode} ${routeStep ? styles.climbNodeRoute : ""} ${styles[`climbNode${status[0].toUpperCase()}${status.slice(1)}` as keyof typeof styles]} ${effectiveSelection === topicId ? styles.climbNodeSelected : ""}`}
                    style={nodeStyle}
                    type="button"
                    data-route-step={routeStep ?? undefined}
                    aria-pressed={effectiveSelection === topicId}
                    aria-label={`${localized(TOPIC_COPY[topicId].short, language)}. ${routeStep ? `${language === "hi" ? "यात्रा पड़ाव" : "Route step"} ${routeStep} ${language === "hi" ? `में से ${MAIN_ROUTE.length}` : `of ${MAIN_ROUTE.length}`}. ` : ""}${statusCopy(status, language)}.${language === "en" ? ` Marble: ${topic.name}.` : ""}`}
                    onClick={() => setSelectedTopicId(topicId)}
                  >
                    {routeStep && <b className={styles.climbRouteBadge} aria-hidden="true">{routeStep}</b>}
                    {status === "current" && <span className={styles.climbBodh}><BodhMark pose="guide" size="mark" motion="guide" /></span>}
                    <small>{statusCopy(status, language)}</small>
                    <strong>{localized(TOPIC_COPY[topicId].short, language)}</strong>
                    <span>{topic.ageRangeStart}–{topic.ageRangeEnd}</span>
                  </button>
                </Fragment>
              );
            })}
          </div>
        </div>

        <aside className={styles.climbDetail} aria-live="polite">
          <span>{localized(TOPIC_COPY[effectiveSelection].short, language)}</span>
          <h3>{language === "hi" ? selectedCopy.short.hi : selected.name}</h3>
          <small>{language === "hi" ? `Marble · उम्र ${selected.ageRangeStart}–${selected.ageRangeEnd}` : `Marble · ${selected.domain} · ages ${selected.ageRangeStart}–${selected.ageRangeEnd}`}</small>
          <p>{localized(selectedCopy.meaning, language)}</p>
          <div>
            <strong>{language === "hi" ? "Bodh यहाँ क्या देखता है" : "What Bodh looks for here"}</strong>
            <p>{localized(selectedCopy.clue, language)}</p>
          </div>
        </aside>
      </div>

      <details className={styles.climbDependencies}>
        <summary>{language === "hi" ? "प्रमाणित कड़ियाँ देखें" : "Inspect canonical dependencies"}</summary>
        <ol>
          {taxonomy.dependencies.map((edge) => (
            <li key={`${edge.prerequisiteId}:${edge.topicId}`}>
              <span><strong>{localized(TOPIC_COPY[edge.prerequisiteId as TopicId].short, language)}</strong><b aria-hidden="true">→</b><strong>{localized(TOPIC_COPY[edge.topicId as TopicId].short, language)}</strong></span>
              <small>{language === "hi" ? "पाठ्यक्रम की ज़रूरी कड़ी" : `${edge.strength} · ${edge.reason}`}</small>
            </li>
          ))}
        </ol>
      </details>

      <p className={styles.climbBoundary}>{language === "hi"
        ? "यह सोच-समझकर बनाया गया सीखने का रास्ता है—अंक, महारत या पूरे विज्ञान पाठ्यक्रम को ढकने का दावा नहीं।"
        : "This is an authored learning route—not a grade, mastery score, or claim of complete Science curriculum coverage."}</p>
    </section>
  );
}
