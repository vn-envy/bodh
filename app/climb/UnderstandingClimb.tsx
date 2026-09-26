"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import mathsSlice from "../../data/taxonomy/fractions-division.slice.json";
import scienceSlice from "../../data/taxonomy/evaporation-water-cycle.slice.json";
import type { LocalizedText, NarrationLanguage } from "../../lib/narration-language";
import { MISCONCEPTIONS } from "../../lib/understanding-checks";
import {
  climbTopicCopy,
  createCurriculumGraph,
  isClimbSubject,
  type ClimbSubject,
  type CurriculumEdge,
  type CurriculumGraph,
} from "../../lib/understanding-curriculum";
import {
  nextReviewAt,
  nextVariantFor,
  topicEvidence,
  type StatementState,
  type TopicLevel,
  type UnderstandingLedger,
} from "../../lib/understanding-evidence";
import {
  nextClimbSuggestion,
  topicVisitPlan,
  type ClimbSuggestion,
} from "../../lib/understanding-path";
import { BodhMark } from "../components/BodhMark";
import { NarrationLanguageToggle, useNarrationLanguage } from "../components/NarrationLanguageToggle";
import { ClimbSession, type SessionItem, type SessionResult } from "./ClimbSession";
import {
  clearUnderstandingLedger,
  useClimbClock,
  useUnderstandingLedger,
} from "./understanding-ledger-store";
import styles from "./Climb.module.css";

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });

export const CLIMB_GRAPHS: Readonly<Record<ClimbSubject, CurriculumGraph>> = {
  mathematics: createCurriculumGraph("mathematics", mathsSlice),
  science: createCurriculumGraph("science", scienceSlice),
};

const SUBJECT_COPY: Record<ClimbSubject, Readonly<{ name: LocalizedText; slice: LocalizedText }>> = {
  mathematics: { name: hiEn("गणित", "Maths"), slice: hiEn("Fractions और division", "Fractions and division") },
  science: { name: hiEn("विज्ञान", "Science"), slice: hiEn("पानी, मौसम और अवस्था-परिवर्तन", "Water, weather, and changes of state") },
};

const STATE_COPY: Record<StatementState, LocalizedText> = {
  unseen: hiEn("अभी नहीं देखा", "Not checked yet"),
  emerging: hiEn("अभी बन रहा", "Still forming"),
  fragile: hiEn("थोड़ा कच्चा", "Fragile"),
  firm: hiEn("पक्का", "Firm"),
  lasting: hiEn("टिका हुआ", "Lasting"),
};

const STATE_MEANING: Record<StatementState, LocalizedText> = {
  unseen: hiEn("इस Marble evidence का check अभी नहीं हुआ।", "This Marble evidence statement has not been checked."),
  emerging: hiEn("आखिरी जवाब अभी नहीं बैठा—Bodh फिर से बनाने में मदद करेगा।", "The latest answer did not hold yet—Bodh will help rebuild it."),
  fragile: hiEn("सही था, पर अंदाज़े या hint के साथ। एक और बिना मदद के चाहिए।", "Right, but with a guess or a hint. One more without help is needed."),
  firm: hiEn("सही, बिना hint, और भरोसे के साथ। Bodh एक दिन बाद फिर पूछेगा।", "Right, unaided, and confident. Bodh will ask again after a day."),
  lasting: hiEn("कुछ दिन बाद भी सही—समझ टिकी हुई है।", "Still right days later—the understanding has lasted."),
};

const LEVEL_COPY: Record<TopicLevel, LocalizedText> = {
  unseen: hiEn("शुरू नहीं", "Not started"),
  started: hiEn("चढ़ाई जारी", "Climbing"),
  firm: hiEn("पक्की पकड़", "Firm foothold"),
  lasting: hiEn("टिकी हुई पकड़", "Lasting foothold"),
};

type ClimbMode =
  | Readonly<{ kind: "map" }>
  | Readonly<{ kind: "session"; id: number; items: readonly SessionItem[]; title: LocalizedText }>
  | Readonly<{ kind: "summary"; results: readonly SessionResult[] }>;

type UrlIntent = Readonly<{ subject: ClimbSubject | null; topicId: string | null }>;

const subscribeToHydration = () => () => {};
const browserHydrated = () => true;
const serverHydrated = () => false;

function subjectForTopic(topicId: string | null): ClimbSubject | null {
  if (!topicId) return null;
  return (Object.keys(CLIMB_GRAPHS) as ClimbSubject[]).find((subject) => CLIMB_GRAPHS[subject].topicById.has(topicId)) ?? null;
}

function readUrlIntent(): UrlIntent {
  try {
    const params = new URLSearchParams(window.location.search);
    const topic = params.get("topic");
    const topicSubject = subjectForTopic(topic);
    const subject = params.get("subject");
    return {
      subject: topicSubject ?? (isClimbSubject(subject) ? subject : null),
      topicId: topicSubject ? topic : null,
    };
  } catch {
    return { subject: null, topicId: null };
  }
}

function formatDay(timestamp: number, language: NarrationLanguage) {
  return new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short" }).format(timestamp);
}

function topicShort(topicId: string, language: NarrationLanguage) {
  return climbTopicCopy(topicId)?.short[language] ?? topicId;
}

export function EvidenceDots({ states, language }: { states: readonly StatementState[]; language: NarrationLanguage }) {
  return (
    <span className={styles.evidenceDots} role="img" aria-label={states.map((state, index) => `${language === "hi" ? "evidence" : "Evidence"} ${index + 1}: ${STATE_COPY[state][language]}`).join(", ")}>
      {states.map((state, index) => <i className={styles[`dot_${state}`]} key={index} />)}
    </span>
  );
}

function visitItems(ledger: UnderstandingLedger, topicId: string, now: number): SessionItem[] {
  return topicVisitPlan(ledger, topicId, now).map((evidenceIndex) => ({
    topicId,
    evidenceIndex,
    variant: nextVariantFor(ledger, topicId, evidenceIndex),
    extra: false,
  }));
}

function EdgeReasons({ edges, language }: { edges: readonly CurriculumEdge[]; language: NarrationLanguage }) {
  if (edges.length === 0) return null;
  return (
    <ul className={styles.edgeReasons}>
      {edges.map((edge) => (
        <li key={`${edge.from}-${edge.to}`}>
          <span>{topicShort(edge.from, language)} <b aria-hidden="true">→</b> {topicShort(edge.to, language)}</span>
          <small lang="en">Marble {edge.strength} dependency: “{edge.reason}”</small>
        </li>
      ))}
    </ul>
  );
}

function SuggestionCard({ suggestion, graph, ledger, now, language, onStart }: {
  suggestion: ClimbSuggestion;
  graph: CurriculumGraph;
  ledger: UnderstandingLedger;
  now: number;
  language: NarrationLanguage;
  onStart: (items: SessionItem[], title: LocalizedText) => void;
}) {
  let eyebrow: LocalizedText;
  let title: LocalizedText;
  let body: LocalizedText;
  let edges: readonly CurriculumEdge[] = [];
  let items: SessionItem[];
  let sessionTitle: LocalizedText;
  let pose: "guide" | "listen" | "celebrate" | "tinker" = "guide";

  if (suggestion.kind === "review") {
    eyebrow = hiEn("आज की याद-जाँच", "Today's memory check");
    title = hiEn(`${suggestion.items.length} पुराने checks—क्या समझ टिकी?`, `${suggestion.items.length} earlier checks—did the understanding last?`);
    body = hiEn("कुछ समय बाद फिर से याद करना समझ को सबसे ज़्यादा पक्का करता है। Bodh अलग-अलग footholds को मिलाकर पूछेगा।", "Recalling an idea after a gap is what makes it stick. Bodh mixes footholds so each check needs real thinking.");
    items = suggestion.items.map((item) => ({ ...item, variant: nextVariantFor(ledger, item.topicId, item.evidenceIndex), extra: false }));
    sessionTitle = hiEn("आज की याद-जाँच", "Today's memory check");
    pose = "listen";
  } else if (suggestion.kind === "repair") {
    const misconception = MISCONCEPTIONS[suggestion.misconceptionId];
    eyebrow = hiEn("एक कदम नीचे—जड़ तक", "One step down—to the root");
    title = hiEn(`${topicShort(suggestion.topicId, "hi")} को फिर से बनाएँ`, `Rebuild ${topicShort(suggestion.topicId, "en")}`);
    body = hiEn(
      `${topicShort(suggestion.fromTopicId, "hi")} में यह idea उलझी: “${misconception.label.hi}”। ${suggestion.confident ? "तुम्हें पक्का लगा था, इसलिए यह एक सच्ची belief है—guess नहीं।" : ""} इसकी जड़ इस foothold में है।`,
      `In ${topicShort(suggestion.fromTopicId, "en")}, this idea got tangled: “${misconception.label.en}.” ${suggestion.confident ? "You felt sure, so it is a real belief—not a guess." : ""} Its root lives in this foothold.`,
    );
    edges = suggestion.path;
    items = visitItems(ledger, suggestion.topicId, now);
    sessionTitle = hiEn(`जड़ से: ${topicShort(suggestion.topicId, "hi")}`, `From the root: ${topicShort(suggestion.topicId, "en")}`);
    pose = "tinker";
  } else if (suggestion.kind === "step-down") {
    eyebrow = hiEn("एक कदम नीचे", "One step down");
    title = hiEn(`पहले ${topicShort(suggestion.topicId, "hi")} पक्का करें`, `First, make ${topicShort(suggestion.topicId, "en")} firm`);
    body = hiEn(
      `${topicShort(suggestion.fromTopicId, "hi")} अभी नहीं बैठा। Marble graph में इसकी सबसे पास की hard नींव यह है।`,
      `${topicShort(suggestion.fromTopicId, "en")} did not hold yet. In the Marble graph, this is its nearest hard prerequisite.`,
    );
    edges = [suggestion.edge];
    items = visitItems(ledger, suggestion.topicId, now);
    sessionTitle = hiEn(topicShort(suggestion.topicId, "hi"), topicShort(suggestion.topicId, "en"));
    pose = "tinker";
  } else if (suggestion.kind === "continue") {
    eyebrow = hiEn("तुम्हारे doubt से", "From your doubt");
    title = hiEn(`${topicShort(suggestion.topicId, "hi")}: तीन तरह से दिखाओ`, `${topicShort(suggestion.topicId, "en")}: show it three ways`);
    body = hiEn("तुम्हारा doubt इसी Marble foothold पर था। अब उसके तीनों evidence statements—देखना, समझाना और नई जगह लगाना—खुद करके दिखाओ।", "Your doubt lived on this Marble foothold. Now show all three of its evidence statements yourself—see it, explain it, use it.");
    items = visitItems(ledger, suggestion.topicId, now);
    sessionTitle = hiEn(topicShort(suggestion.topicId, "hi"), topicShort(suggestion.topicId, "en"));
  } else if (suggestion.kind === "climb") {
    eyebrow = hiEn("Bodh का सुझाव: अगली पकड़", "Bodh suggests: next foothold");
    title = hiEn(topicShort(suggestion.topicId, "hi"), topicShort(suggestion.topicId, "en"));
    body = suggestion.because.length > 0
      ? hiEn("इसकी नींव अब पक्की है, इसलिए यह अगला सही कदम है।", "Its foundations are firm now, so this is the right next step.")
      : hiEn("यह Marble graph की नींव है—समझ की चढ़ाई यहीं से शुरू होती है।", "This is a foundation of the Marble graph—the climb starts here.");
    edges = suggestion.because;
    items = visitItems(ledger, suggestion.topicId, now);
    sessionTitle = hiEn(topicShort(suggestion.topicId, "hi"), topicShort(suggestion.topicId, "en"));
  } else {
    const nextReview = nextReviewAt(ledger, now, new Set(graph.order));
    eyebrow = hiEn("चोटी पर!", "At the summit!");
    title = hiEn("हर foothold पक्का है।", "Every foothold is firm.");
    body = nextReview
      ? hiEn(`Bodh ${formatDay(nextReview, "hi")} को फिर पूछेगा, ताकि पक्का हो कि समझ टिकी रहे।`, `Bodh will check again on ${formatDay(nextReview, "en")} to make sure it lasts.`)
      : hiEn("अब समझ को टिकाना है—Bodh कुछ दिनों बाद फिर पूछेगा।", "Now the goal is to make it last—Bodh will ask again in a few days.");
    items = visitItems(ledger, suggestion.topicId, now);
    sessionTitle = hiEn(topicShort(suggestion.topicId, "hi"), topicShort(suggestion.topicId, "en"));
    pose = "celebrate";
  }

  return (
    <section className={`${styles.suggestion} ${styles[`suggestion_${suggestion.kind}`] ?? ""}`} aria-labelledby="climb-suggestion-title">
      <BodhMark pose={pose} size="medium" motion={pose} />
      <div className={styles.suggestionCopy}>
        <span className="eyebrow">{eyebrow[language]}</span>
        <h2 id="climb-suggestion-title">{title[language]}</h2>
        <p>{body[language]}</p>
        <EdgeReasons edges={edges} language={language} />
        <button className="button button-primary" type="button" onClick={() => onStart(items, sessionTitle)}>
          {language === "hi" ? `शुरू करें · ${items.length} checks` : `Start · ${items.length} checks`} <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}

function ClimbMap({ graph, ledger, now, suggestedTopicId, focusTopicId, language, onOpen }: {
  graph: CurriculumGraph;
  ledger: UnderstandingLedger;
  now: number;
  suggestedTopicId: string | null;
  focusTopicId: string | null;
  language: NarrationLanguage;
  onOpen: (topicId: string) => void;
}) {
  const tiers = [...graph.tiers].reverse();
  return (
    <section className={styles.map} aria-labelledby="climb-map-title">
      <div className={styles.mapHeading}>
        <h2 id="climb-map-title">{language === "hi" ? "समझ की पहाड़ी" : "The understanding hill"}</h2>
        <p>{language === "hi" ? "ऊपर चोटी, नीचे नींव। हर पकड़ एक असली Marble topic है; हर बिंदु उसका एक evidence statement।" : "Summit at the top, foundations below. Every foothold is a real Marble topic; every dot is one of its evidence statements."}</p>
      </div>
      <ol className={styles.tiers}>
        {tiers.map((tier, index) => (
          <li className={styles.tier} key={tier.join("|")}>
            <span className={styles.tierLabel}>{index === 0 ? (language === "hi" ? "चोटी" : "Summit") : index === tiers.length - 1 ? (language === "hi" ? "नींव" : "Foundations") : ""}</span>
            <div className={styles.tierTopics}>
              {tier.map((topicId) => {
                const topic = graph.topicById.get(topicId)!;
                const evidence = topicEvidence(ledger, topicId, now);
                const suggested = topicId === suggestedTopicId;
                return (
                  <button
                    className={`${styles.foothold} ${styles[`foothold_${evidence.level}`]} ${suggested ? styles.footholdSuggested : ""}`}
                    type="button"
                    onClick={() => onOpen(topicId)}
                    aria-label={`${topicShort(topicId, language)}. ${LEVEL_COPY[evidence.level][language]}.${suggested ? (language === "hi" ? " Bodh का सुझाव।" : " Bodh suggests this.") : ""}`}
                    key={topicId}
                  >
                    <span className={styles.footholdTags}>
                      {topicId === graph.goalTopicId && <b className={styles.tagGoal}>{language === "hi" ? "आज की चोटी" : "Summit goal"}</b>}
                      {suggested && <b>{language === "hi" ? "सुझाव" : "Suggested"}</b>}
                      {topicId === focusTopicId && <b className={styles.tagDoubt}>{language === "hi" ? "तुम्हारा doubt" : "Your doubt"}</b>}
                      {evidence.dueIndices.length > 0 && <b className={styles.tagDue}>{language === "hi" ? "याद-जाँच" : "Review due"}</b>}
                    </span>
                    <strong>{topicShort(topicId, language)}</strong>
                    <small lang="en">Marble · {topic.name} · ages {topic.ageRangeStart}–{topic.ageRangeEnd}</small>
                    <span className={styles.footholdFoot}>
                      <EvidenceDots states={evidence.states} language={language} />
                      <em>{LEVEL_COPY[evidence.level][language]}</em>
                    </span>
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SessionSummary({ results, graph, ledger, now, suggestion, language, onStart, onMap }: {
  results: readonly SessionResult[];
  graph: CurriculumGraph;
  ledger: UnderstandingLedger;
  now: number;
  suggestion: ClimbSuggestion;
  language: NarrationLanguage;
  onStart: (items: SessionItem[], title: LocalizedText) => void;
  onMap: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const topicIds = [...new Set(results.map((result) => result.topicId))];
  const held = results.filter((result) => result.correct).length;

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const nextReview = nextReviewAt(ledger, now, new Set(topicIds));
  return (
    <section className={styles.summary} aria-labelledby="climb-summary-title">
      <div className={styles.summaryHead}>
        <BodhMark pose="celebrate" size="medium" motion="celebrate" />
        <div>
          <span className="eyebrow">{language === "hi" ? "आज का evidence" : "Today's evidence"}</span>
          <h1 id="climb-summary-title" tabIndex={-1} ref={headingRef}>{language === "hi" ? `${results.length} में से ${held} checks बैठे।` : `${held} of ${results.length} checks held.`}</h1>
          <p>{language === "hi" ? "गलत जवाब भी evidence है: उसने दिखाया कि कौन-सी idea फिर से बनानी है।" : "Misses are evidence too: they showed which idea to rebuild."}</p>
        </div>
      </div>
      <ul className={styles.summaryTopics}>
        {topicIds.map((topicId) => {
          const evidence = topicEvidence(ledger, topicId, now);
          const copy = climbTopicCopy(topicId)!;
          return (
            <li key={topicId}>
              <div className={styles.summaryTopicHead}>
                <strong>{copy.short[language]}</strong>
                <em>{LEVEL_COPY[evidence.level][language]}</em>
              </div>
              <ol>
                {evidence.states.map((state, index) => (
                  <li key={index}>
                    <i className={styles[`dot_${state}`]} aria-hidden="true" />
                    <span>{copy.evidence[index][language]}</span>
                    <b>{STATE_COPY[state][language]}</b>
                  </li>
                ))}
              </ol>
              <small lang="en">Marble · {graph.topicById.get(topicId)?.name}</small>
            </li>
          );
        })}
      </ul>
      <p className={styles.retention}>
        {nextReview
          ? (language === "hi"
            ? `Bodh ${formatDay(nextReview, "hi")} को इनमें से फिर पूछेगा। समय के बाद याद आना ही बताता है कि समझ टिकी।`
            : `Bodh will ask about these again on ${formatDay(nextReview, "en")}. Remembering after a gap is how we know understanding lasts.`)
          : (language === "hi"
            ? "जो evidence पक्का होगा, Bodh उसे एक दिन बाद फिर पूछेगा।"
            : "Once evidence is firm, Bodh asks about it again a day later.")}
      </p>
      <SuggestionCard suggestion={suggestion} graph={graph} ledger={ledger} now={now} language={language} onStart={onStart} />
      <button className={styles.backButton} type="button" onClick={onMap}><span aria-hidden="true">←</span> {language === "hi" ? "पूरा map देखें" : "See the whole map"}</button>
    </section>
  );
}

function GrownUpPanel({ ledger, now, language }: { ledger: UnderstandingLedger; now: number; language: NarrationLanguage }) {
  const [confirming, setConfirming] = useState(false);
  const misses = (Object.keys(CLIMB_GRAPHS) as ClimbSubject[])
    .flatMap((subject) => CLIMB_GRAPHS[subject].order)
    .flatMap((topicId) => topicEvidence(ledger, topicId, now).misses.map((miss) => ({ ...miss, topicId })))
    .filter((miss) => miss.misconceptionId !== null)
    .sort((left, right) => right.at - left.at)
    .slice(0, 5);
  const hasEvidence = Object.keys(ledger.statements).length > 0;

  return (
    <details className={styles.grownUps}>
      <summary>{language === "hi" ? "बड़ों के लिए: Bodh यह evidence कैसे गिनता है" : "For grown-ups: how Bodh counts this evidence"}</summary>
      <div className={styles.grownUpsBody}>
        <ul className={styles.stateLegend}>
          {(["unseen", "emerging", "fragile", "firm", "lasting"] as const).map((state) => (
            <li key={state}><i className={styles[`dot_${state}`]} aria-hidden="true" /><strong>{STATE_COPY[state][language]}</strong><span>{STATE_MEANING[state][language]}</span></li>
          ))}
        </ul>
        <p>{language === "hi"
          ? "हर check एक Marble evidence statement से जुड़ा है। Maths के numbers code से बनते और जाँचे जाते हैं; कोई AI answer key नहीं बनाता। \"कितना पक्का?\" का जवाब अंदाज़े से सही हुए जवाब को असली समझ से अलग करता है, और गलत-पर-पक्का जवाब Bodh को बताता है कि कौन-सी belief बदलनी है।"
          : "Every check is tied to one Marble evidence statement. Maths numbers are generated and verified by code; no AI writes an answer key. The \"how sure?\" answer separates a lucky guess from real understanding, and a confident miss tells Bodh which belief to rebuild."}</p>
        {misses.length > 0 && (
          <div className={styles.missList}>
            <strong>{language === "hi" ? "हाल की ideas जिन्हें फिर से बनाना है" : "Recent ideas to rebuild"}</strong>
            <ul>
              {misses.map((miss) => (
                <li key={`${miss.topicId}-${miss.evidenceIndex}`}>
                  {MISCONCEPTIONS[miss.misconceptionId!].label[language]} <small>· {topicShort(miss.topicId, language)}{miss.confidence === "sure" ? (language === "hi" ? " · पक्के भरोसे से" : " · said with confidence") : ""}</small>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className={styles.privacy}>{language === "hi"
          ? "यह evidence सिर्फ इसी device पर रहता है: topic IDs, सही/गलत, भरोसा, hint और समय। कोई लिखा हुआ text नहीं, और server पर कुछ नहीं जाता।"
          : "This evidence stays on this device only: topic IDs, right or not yet, confidence, hints, and time. No written text, and nothing is sent to a server."}</p>
        {hasEvidence && (
          confirming ? (
            <div className={styles.clearConfirm}>
              <span>{language === "hi" ? "पक्का? यह इस device का सारा Climb evidence मिटा देगा।" : "Sure? This erases all Climb evidence on this device."}</span>
              <button className="button button-secondary" type="button" onClick={() => { clearUnderstandingLedger(); setConfirming(false); }}>{language === "hi" ? "हाँ, मिटाओ" : "Yes, erase"}</button>
              <button className={styles.textButton} type="button" onClick={() => setConfirming(false)}>{language === "hi" ? "रहने दो" : "Keep it"}</button>
            </div>
          ) : (
            <button className={styles.textButton} type="button" onClick={() => setConfirming(true)}>{language === "hi" ? "इस device का evidence मिटाएँ" : "Erase this device's evidence"}</button>
          )
        )}
      </div>
    </details>
  );
}

export function UnderstandingClimb() {
  const language = useNarrationLanguage();
  const ledger = useUnderstandingLedger();
  const now = useClimbClock();
  const hydrated = useSyncExternalStore(subscribeToHydration, browserHydrated, serverHydrated);
  const intent = useMemo<UrlIntent>(() => (hydrated ? readUrlIntent() : { subject: null, topicId: null }), [hydrated]);
  const [chosenSubject, setChosenSubject] = useState<ClimbSubject | null>(null);
  const [mode, setMode] = useState<ClimbMode>({ kind: "map" });
  const [sessionCount, setSessionCount] = useState(0);

  const subject = chosenSubject ?? intent.subject ?? "mathematics";
  const graph = CLIMB_GRAPHS[subject];
  const focusTopicId = intent.topicId && graph.topicById.has(intent.topicId) ? intent.topicId : null;
  const suggestion = nextClimbSuggestion(graph, ledger, now, focusTopicId);
  const suggestedTopicId = "topicId" in suggestion ? suggestion.topicId : null;

  const statementTotal = graph.order.length * 3;
  const firmCount = graph.order.reduce((sum, topicId) => sum + topicEvidence(ledger, topicId, now).states.filter((state) => state === "firm" || state === "lasting").length, 0);
  const lastingCount = graph.order.reduce((sum, topicId) => sum + topicEvidence(ledger, topicId, now).states.filter((state) => state === "lasting").length, 0);

  const startSession = (items: SessionItem[], title: LocalizedText) => {
    if (items.length === 0) return;
    setSessionCount((count) => count + 1);
    setMode({ kind: "session", id: sessionCount + 1, items, title });
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  const openTopic = (topicId: string) => startSession(visitItems(ledger, topicId, now), hiEn(topicShort(topicId, "hi"), topicShort(topicId, "en")));

  const chooseSubject = (next: ClimbSubject) => {
    setChosenSubject(next);
    setMode({ kind: "map" });
  };

  return (
    <main className={`journey-shell ${styles.shell}`} id="main-content" lang={language}>
      <header className="journey-header">
        <Link className="back-link" href="/"><span aria-hidden="true">←</span> {language === "hi" ? "Home" : "Home"}</Link>
        <Link className="brand brand-compact" href="/" aria-label="Bodh home">
          <BodhMark size="mark" motion="still" priority />
          <span className="brand-copy"><strong>BODH</strong></span>
        </Link>
        <div className="journey-header-tools"><span className="fixture-label">{language === "hi" ? "Understanding Climb" : "Understanding Climb"}</span><NarrationLanguageToggle compact /></div>
      </header>

      {mode.kind === "session" ? (
        <ClimbSession
          key={mode.id}
          items={mode.items}
          graph={graph}
          language={language}
          title={mode.title}
          onExit={() => setMode({ kind: "map" })}
          onFinish={(results) => setMode({ kind: "summary", results })}
        />
      ) : mode.kind === "summary" ? (
        <SessionSummary
          results={mode.results}
          graph={graph}
          ledger={ledger}
          now={now}
          suggestion={suggestion}
          language={language}
          onStart={startSession}
          onMap={() => setMode({ kind: "map" })}
        />
      ) : (
        <>
          <section className={styles.hero} aria-labelledby="climb-title">
            <div>
              <span className="eyebrow">{language === "hi" ? "वही Marble curriculum · अब समझ जो टिके" : "The same Marble curriculum · understanding that lasts"}</span>
              <h1 id="climb-title">{language === "hi" ? "समझ की चढ़ाई" : "The Understanding Climb"}</h1>
              <p>{language === "hi"
                ? "हर Marble topic के तीन evidence statements हैं। हर एक को दिखाओ—picture में देखकर, क्यों समझाकर, और नई जगह लगाकर। Bodh एक दिन बाद और फिर कुछ दिन बाद पूछता है, ताकि पता चले समझ टिकी या नहीं।"
                : "Every Marble topic has three evidence statements. Show each one—by seeing it in a picture, explaining why, and using it somewhere new. Bodh checks again a day later, then days later, to find out whether the understanding lasts."}</p>
            </div>
            <dl className={styles.heroStats}>
              <div><dt>{language === "hi" ? "पक्के evidence" : "Firm evidence"}</dt><dd>{firmCount}<small>/{statementTotal}</small></dd></div>
              <div><dt>{language === "hi" ? "टिके हुए" : "Lasting"}</dt><dd>{lastingCount}<small>/{statementTotal}</small></dd></div>
            </dl>
          </section>

          <div className={styles.subjectSwitch} role="group" aria-label={language === "hi" ? "विषय चुनें" : "Choose a subject"}>
            {(["mathematics", "science"] as const).map((option) => (
              <button className={option === subject ? styles.subjectActive : ""} type="button" aria-pressed={option === subject} onClick={() => chooseSubject(option)} key={option}>
                <strong>{SUBJECT_COPY[option].name[language]}</strong>
                <small>{SUBJECT_COPY[option].slice[language]} · {CLIMB_GRAPHS[option].order.length} Marble topics</small>
              </button>
            ))}
          </div>

          <SuggestionCard suggestion={suggestion} graph={graph} ledger={ledger} now={now} language={language} onStart={startSession} />

          <div className={styles.legendRow} aria-hidden="true">
            {(["unseen", "emerging", "fragile", "firm", "lasting"] as const).map((state) => (
              <span key={state}><i className={styles[`dot_${state}`]} />{STATE_COPY[state][language]}</span>
            ))}
          </div>

          <ClimbMap
            graph={graph}
            ledger={ledger}
            now={now}
            suggestedTopicId={suggestedTopicId}
            focusTopicId={focusTopicId}
            language={language}
            onOpen={openTopic}
          />

          <GrownUpPanel ledger={ledger} now={now} language={language} />

          <p className={styles.boundary}>{language === "hi"
            ? "यह इस device पर हुए checks का evidence है—grade, score, या mastery certificate नहीं। Bodh यह नहीं कहता कि बच्चा \"कमज़ोर\" है; वह सिर्फ बताता है कि अगली कौन-सी idea बनानी है।"
            : "This is evidence from checks on this device—not a grade, a score, or a mastery certificate. Bodh never calls a learner \"weak\"; it only shows which idea to build next."}</p>
        </>
      )}
    </main>
  );
}
