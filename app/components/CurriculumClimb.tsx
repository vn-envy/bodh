"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import taxonomy from "../../data/taxonomy/fractions-division.slice.json";
import type { LocalizedText, NarrationLanguage } from "../../lib/narration-language";
import { BodhMark } from "./BodhMark";

type Topic = (typeof taxonomy.topics)[number];
type TopicId = Topic["id"];
type GraphPoint = Readonly<{ x: number; y: number; order: number }>;

const hiEn = (hi: string, en: string): LocalizedText => ({ hi, en });

const TOPIC_COPY: Record<TopicId, Readonly<{
  short: LocalizedText;
  meaning: LocalizedText;
  prompt: LocalizedText;
}>> = {
  "mt_ndGqFPWyen": {
    short: hiEn("एक whole के बराबर हिस्से", "Equal parts of one whole"),
    meaning: hiEn("पहले तय करो कि पूरा क्या है, फिर उसे बराबर हिस्सों में बाँटो।", "Choose the whole first, then partition it into equal parts."),
    prompt: hiEn("क्या तुम 6 बराबर slices में 1/6 और 4/6 दिखा सकते हो?", "Can you show 1/6 and 4/6 on six equal slices?"),
  },
  "mt_09sySPqM9Z": {
    short: hiEn("Unit fractions से amount बनाओ", "Build amounts from unit fractions"),
    meaning: hiEn("3/5 का मतलब 1/5 को तीन बार जोड़ना है।", "Three-fifths means composing three copies of one-fifth."),
    prompt: hiEn("4/5 को चार 1/5 pieces से बना सकते हो?", "Can you build 4/5 from four one-fifth pieces?"),
  },
  "mt_TgHxujL81r": {
    short: hiEn("Fraction को बार-बार जोड़ना", "Repeat a fraction"),
    meaning: hiEn("Fraction × whole को उसी fraction की repeated addition की तरह देखो।", "See fraction × whole as repeated addition of that fraction."),
    prompt: hiEn("तीन 2/3 cups मिलकर कितने होते हैं?", "What amount do three copies of 2/3 make?"),
  },
  "mt_AabJisinfi": {
    short: hiEn("Fraction को fraction से multiply करना", "Multiply a fraction by a fraction"),
    meaning: hiEn("किसी amount का एक fractional हिस्सा picture में ढूँढो।", "Find a fractional part of another amount in a picture."),
    prompt: hiEn("2/3 का 3/4 हिस्सा area model में दिखा सकते हो?", "Can you show three-fourths of two-thirds in an area model?"),
  },
  "mt_9Y96vxG_LH": {
    short: hiEn("Fractions को divide करना", "Divide fractions"),
    meaning: hiEn("पूछो: इस amount में divisor-size के कितने बराबर groups fit होते हैं?", "Ask how many equal groups of the divisor's size fit inside the amount."),
    prompt: hiEn("Picture से बता सकते हो कि एक fraction में दूसरा कितनी बार fit होता है?", "Can you use a picture to show how many times one fraction fits inside another?"),
  },
  "mt_4Km38F4L-6": {
    short: hiEn("Fraction भी division है", "A fraction is also division"),
    meaning: hiEn("3/4 को 3 wholes को 4 लोगों में बराबर बाँटने की तरह देखो।", "See 3/4 as sharing three wholes equally among four people."),
    prompt: hiEn("3 pizzas को 4 friends में बाँटने पर हर एक को कितना मिलेगा?", "What does each friend get when three pizzas are shared among four friends?"),
  },
  "mt_ifPDOYvUqm": {
    short: hiEn("एक unit fraction को बाँटना", "Share one unit fraction"),
    meaning: hiEn("एक छोटे fraction को और बराबर groups में बाँटने पर हर हिस्सा और छोटा होता है।", "When one unit fraction is shared equally, each new share is smaller."),
    prompt: hiEn("1/3 को 4 बराबर groups में picture से बाँट सकते हो?", "Can you split one-third into four equal groups in a picture?"),
  },
  "mt_1PAWhRhpdg": {
    short: hiEn("Whole में unit fractions गिनना", "Count unit fractions in a whole"),
    meaning: hiEn("छोटा group-size हो तो एक whole में बहुत से groups fit हो सकते हैं।", "A small group size can fit many times inside one whole."),
    prompt: hiEn("4 wholes में कितने 1/5 groups fit होते हैं—picture से दिखाओ।", "Show how many one-fifth groups fit inside four wholes."),
  },
  "mt_iNdrM2-oJf": {
    short: hiEn("Division के दो meanings", "Two meanings of division"),
    meaning: hiEn("Division sharing भी हो सकती है और बराबर groups गिनना भी।", "Division can mean sharing equally or counting equal groups."),
    prompt: hiEn("56 ÷ 8 की sharing और grouping pictures बना सकते हो?", "Can you draw both sharing and grouping pictures for 56 ÷ 8?"),
  },
  "mt_GDG9_SZmsO": {
    short: hiEn("Division में छुपा multiplier", "The hidden multiplier in division"),
    meaning: hiEn("32 ÷ 8 को 8 × ? = 32 की तरह सोचो।", "Think of 32 ÷ 8 as the missing factor in 8 × ? = 32."),
    prompt: hiEn("कौन-सा number 8 से multiply होकर 32 बनाता है?", "What number multiplied by 8 makes 32?"),
  },
};

const GRAPH_LAYOUT: Record<TopicId, GraphPoint> = {
  "mt_ndGqFPWyen": { x: 12, y: 83, order: 1 },
  "mt_09sySPqM9Z": { x: 29, y: 69, order: 2 },
  "mt_TgHxujL81r": { x: 45, y: 55, order: 3 },
  "mt_AabJisinfi": { x: 63, y: 39, order: 5 },
  "mt_9Y96vxG_LH": { x: 84, y: 15, order: 8 },
  "mt_4Km38F4L-6": { x: 43, y: 84, order: 4 },
  "mt_ifPDOYvUqm": { x: 65, y: 67, order: 6 },
  "mt_1PAWhRhpdg": { x: 85, y: 49, order: 7 },
  "mt_iNdrM2-oJf": { x: 12, y: 43, order: 9 },
  "mt_GDG9_SZmsO": { x: 30, y: 27, order: 10 },
};

const TOPICS = new Map(taxonomy.topics.map((topic) => [topic.id, topic]));
const ORDERED_TOPICS = [...taxonomy.topics].sort((left, right) =>
  GRAPH_LAYOUT[left.id as TopicId].order - GRAPH_LAYOUT[right.id as TopicId].order);
const FORWARD_EDGES = taxonomy.dependencies.map((edge) => ({
  from: edge.prerequisiteId as TopicId,
  to: edge.topicId as TopicId,
  strength: edge.strength,
  reason: edge.reason,
}));

function isTopicId(value: unknown): value is TopicId {
  return typeof value === "string" && TOPICS.has(value as TopicId);
}

function pathBetween(start: TopicId, goal: TopicId) {
  if (start === goal) return [start];
  const queue: TopicId[][] = [[start]];
  const visited = new Set<TopicId>([start]);
  while (queue.length > 0) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    for (const edge of FORWARD_EDGES.filter((candidate) => candidate.from === last)) {
      if (visited.has(edge.to)) continue;
      const next = [...path, edge.to];
      if (edge.to === goal) return next;
      visited.add(edge.to);
      queue.push(next);
    }
  }
  return [start];
}

function prerequisiteIds(topicId: TopicId) {
  const found = new Set<TopicId>();
  const pending = [topicId];
  while (pending.length > 0) {
    const current = pending.pop()!;
    for (const edge of FORWARD_EDGES.filter((candidate) => candidate.to === current)) {
      if (found.has(edge.from)) continue;
      found.add(edge.from);
      pending.push(edge.from);
    }
  }
  return found;
}

function edgeStyle(from: GraphPoint, to: GraphPoint): CSSProperties {
  const dx = to.x - from.x;
  const scaledDy = (to.y - from.y) * 0.62;
  const width = Math.sqrt(dx * dx + scaledDy * scaledDy);
  const angle = Math.atan2(scaledDy, dx) * 180 / Math.PI;
  return {
    "--edge-x": `${from.x}%`,
    "--edge-y": `${from.y}%`,
    "--edge-width": `${width}%`,
    "--edge-angle": `${angle}deg`,
  } as CSSProperties;
}

function statusCopy(status: "ready" | "here" | "next" | "goal" | "nearby", language: NarrationLanguage) {
  const copy = {
    ready: hiEn("नींव", "Foundation"),
    here: hiEn("शुरुआत का सुझाव", "Suggested start"),
    next: hiEn("अगली पकड़", "Next foothold"),
    goal: hiEn("आज की चोटी", "Today's summit"),
    nearby: hiEn("पास की skill", "Nearby skill"),
  } as const;
  return copy[status][language];
}

export function CurriculumClimb({
  language,
  focusTopicId = "mt_ndGqFPWyen",
  goalTopicId = "mt_9Y96vxG_LH",
}: {
  language: NarrationLanguage;
  focusTopicId?: string;
  goalTopicId?: string;
}) {
  const focus = isTopicId(focusTopicId) ? focusTopicId : "mt_ndGqFPWyen";
  const goal = isTopicId(goalTopicId) ? goalTopicId : "mt_9Y96vxG_LH";
  const route = useMemo(() => pathBetween(focus, goal), [focus, goal]);
  const hasCanonicalRoute = route.at(-1) === goal;
  const routeSet = useMemo(() => new Set(route), [route]);
  const readySet = useMemo(() => prerequisiteIds(focus), [focus]);
  const [selection, setSelection] = useState<Readonly<{ focus: TopicId; selected: TopicId }>>({
    focus,
    selected: focus,
  });
  const selectedTopicId = selection.focus === focus ? selection.selected : focus;

  const selected = TOPICS.get(selectedTopicId)!;
  const selectedCopy = TOPIC_COPY[selectedTopicId];
  const selectedStatus = selectedTopicId === focus
    ? "here"
    : selectedTopicId === goal
      ? "goal"
      : routeSet.has(selectedTopicId)
        ? "next"
        : readySet.has(selectedTopicId)
          ? "ready"
          : "nearby";

  const routePairs = new Set(route.slice(0, -1).map((topicId, index) => `${topicId}:${route[index + 1]}`));

  return (
    <section className="curriculum-climb" aria-labelledby="curriculum-climb-title" lang={language}>
      <div className="curriculum-climb-heading">
        <div>
          <span className="eyebrow">{language === "hi" ? "तुम्हारा Marble concept map" : "Your Marble concept map"}</span>
          <h2 id="curriculum-climb-title">{language === "hi" ? "Bodh के साथ समझ की पहाड़ी चढ़ो।" : "Climb the understanding hill with Bodh."}</h2>
          <p>{language === "hi"
            ? "हर पड़ाव os-taxonomy का असली concept है। यह suggested route एक inspectable prerequisite से शुरू होता है; learner evidence इसे refine कर सकता है।"
            : "Every foothold is a real os-taxonomy concept. This suggested route begins with an inspectable prerequisite; learner evidence can refine it."}</p>
        </div>
        <div className="climb-source-note" lang="en">
          <strong>{taxonomy.topics.length} Marble topics</strong>
          <span>{taxonomy.dependencies.length} canonical dependencies</span>
        </div>
      </div>

      <div className="climb-legend" aria-label={language === "hi" ? "Map संकेत" : "Map legend"}>
        <span className="climb-legend-ready">{statusCopy("ready", language)}</span>
        <span className="climb-legend-here">{statusCopy("here", language)}</span>
        <span className="climb-legend-next">{statusCopy("next", language)}</span>
        <span className="climb-legend-goal">{statusCopy("goal", language)}</span>
      </div>

      <div className="climb-workspace">
        <div className="climb-canvas" role="group" aria-label={language === "hi" ? "Marble prerequisite graph" : "Marble prerequisite graph"}>
          <div className="climb-sky" aria-hidden="true"><i /><i /><i /></div>
          <div className="climb-ground" aria-hidden="true" />
          <div className="climb-edges" aria-hidden="true">
            {FORWARD_EDGES.map((edge) => (
              <span
                className={`climb-edge climb-edge-${edge.strength} ${routePairs.has(`${edge.from}:${edge.to}`) ? "climb-edge-route" : ""}`}
                style={edgeStyle(GRAPH_LAYOUT[edge.from], GRAPH_LAYOUT[edge.to])}
                key={`${edge.from}-${edge.to}`}
              />
            ))}
          </div>

          <div className="climb-nodes">
            {ORDERED_TOPICS.map((topic) => {
              const topicId = topic.id as TopicId;
              const point = GRAPH_LAYOUT[topicId];
              const status = topicId === focus
                ? "here"
                : topicId === goal
                  ? "goal"
                  : routeSet.has(topicId)
                    ? "next"
                    : readySet.has(topicId)
                      ? "ready"
                      : "nearby";
              const nodeStyle = {
                "--node-x": `${point.x}%`,
                "--node-y": `${point.y}%`,
                "--node-order": point.order,
              } as CSSProperties;
              return (
                <button
                  className={`climb-node climb-node-${status} ${selectedTopicId === topicId ? "climb-node-selected" : ""}`}
                  style={nodeStyle}
                  type="button"
                  aria-pressed={selectedTopicId === topicId}
                  aria-label={`${TOPIC_COPY[topicId].short[language]}. Marble: ${topic.name}. ${statusCopy(status, language)}.`}
                  onClick={() => setSelection({ focus, selected: topicId })}
                  key={topicId}
                >
                  {status === "here" && <span className="climb-bodh"><BodhMark pose="guide" size="mark" motion="guide" /></span>}
                  <small>{statusCopy(status, language)}</small>
                  <strong>{TOPIC_COPY[topicId].short[language]}</strong>
                  <span>{topic.ageRangeStart}–{topic.ageRangeEnd}</span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className={`climb-detail climb-detail-${selectedStatus}`} aria-live="polite">
          <span>{statusCopy(selectedStatus, language)}</span>
          <h3>{selectedCopy.short[language]}</h3>
          <small lang="en">Marble · {selected.name} · ages {selected.ageRangeStart}–{selected.ageRangeEnd}</small>
          <p>{selectedCopy.meaning[language]}</p>
          <div>
            <strong>{language === "hi" ? "Bodh यहाँ क्या देखेगा" : "What Bodh looks for here"}</strong>
            <p>{selectedCopy.prompt[language]}</p>
          </div>
          {!hasCanonicalRoute && <p className="climb-route-warning">{language === "hi"
            ? "इस slice में suggested start से goal तक canonical dependency path नहीं है, इसलिए Bodh सीधी line का दावा नहीं करता।"
            : "This slice has no canonical dependency path from the suggested start to the goal, so Bodh does not draw a direct route."}</p>}
        </aside>
      </div>

      <details className="climb-dependencies">
        <summary>{language === "hi"
          ? `${taxonomy.dependencies.length} canonical dependencies देखें`
          : `Inspect ${taxonomy.dependencies.length} canonical dependencies`}</summary>
        <ol>
          {FORWARD_EDGES.map((edge) => (
            <li key={`${edge.from}-${edge.to}`}>
              <span>
                <strong>{TOPIC_COPY[edge.from].short[language]}</strong>
                <b aria-hidden="true">→</b>
                <strong>{TOPIC_COPY[edge.to].short[language]}</strong>
              </span>
              <small lang="en">{edge.strength} dependency · {edge.reason}</small>
            </li>
          ))}
        </ol>
      </details>

      <p className="climb-boundary">{language === "hi"
        ? "यह marker suggested starting context दिखाता है—grade, validated diagnosis, mastery score, या पूरा curriculum coverage नहीं।"
        : "The marker shows a suggested starting context—not a grade, validated diagnosis, mastery score, or claim of complete curriculum coverage."}</p>
    </section>
  );
}

const LESSON_CLIMB_TOPIC_IDS = [
  "mt_ndGqFPWyen",
  "mt_09sySPqM9Z",
  "mt_TgHxujL81r",
  "mt_AabJisinfi",
  "mt_9Y96vxG_LH",
] as const satisfies readonly TopicId[];

const STAGE_TO_CLIMB_INDEX = [0, 0, 1, 1, 2, 3, 4] as const;

export function LessonClimb({ stageIndex, language }: { stageIndex: number; language: NarrationLanguage }) {
  const currentIndex = STAGE_TO_CLIMB_INDEX[Math.max(0, Math.min(stageIndex, STAGE_TO_CLIMB_INDEX.length - 1))];
  return (
    <section className="lesson-climb" aria-labelledby="lesson-climb-title">
      <div className="lesson-climb-heading">
        <div>
          <span>{language === "hi" ? "आज का curriculum context" : "Today's curriculum context"}</span>
          <strong id="lesson-climb-title">{language === "hi" ? "यह lesson यहाँ की ideas इस्तेमाल कर रहा है" : "This lesson draws on ideas around here"}</strong>
        </div>
        <small>{language === "hi" ? "Marble map · mastery score नहीं" : "Marble map · not a mastery score"}</small>
      </div>
      <ol className="lesson-climb-path">
        {LESSON_CLIMB_TOPIC_IDS.map((topicId, index) => {
          const state = index < currentIndex ? "visited" : index === currentIndex ? "current" : "ahead";
          return (
            <li className={`lesson-climb-${state}`} aria-current={state === "current" ? "step" : undefined} key={topicId}>
              <span aria-hidden="true">{state === "visited" ? "✓" : index + 1}</span>
              <strong>{TOPIC_COPY[topicId].short[language]}</strong>
              {state === "current" && <BodhMark pose="guide" size="mark" motion="guide" />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
