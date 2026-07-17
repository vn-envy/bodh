"use client";

import Link from "next/link";
import { BodhMark } from "../components/BodhMark";
import {
  NarrationLanguageToggle,
  useNarrationLanguage,
} from "../components/NarrationLanguageToggle";

const copy = {
  hi: {
    back: "वापस",
    eyebrow: "Bodh का छोटा promise",
    title: "सिर्फ़ “कैसे” नहीं।",
    titleAccent: "“क्यों” भी अपना बनाना।",
    intro:
      "Homework doubt को answer-dispenser की तरह नहीं लेते। Bodh पहले उस idea को ढूँढता है जो अभी छिपी हुई है, फिर बच्चे को उसे picture में इस्तेमाल करने देता है।",
    moments: [
      ["Bodh सुनता है", "बच्चे का असली सवाल और उसके अपने शब्द सामने रखता है।"],
      ["छुपी idea ढूँढता है", "अगले कदम को curriculum के एक छोटे, नाम वाले concept से जोड़ता है।"],
      ["पहले एक छोटी जाँच", "एक ऐसा सवाल पूछता है जो teaching route बदले—यह test नहीं है।"],
      ["फिर खुद से करके दिखाओ", "Picture में idea आज़माओ, नए सवाल पर लगाओ, फिर original doubt पर लौटो।"],
    ],
    mentor: "“मैं तुम्हें grade नहीं कर रहा। मैं सही अगली picture ढूँढ रहा हूँ।”",
    evidence:
      "हर next screen में बच्चे की अपनी evidence दिखती है: उनके शब्द → छोटा probe → visual evidence → transfer → original question।",
    safetyTitle: "Bodh समाधान दिखाने से पहले समझ की रक्षा करता है।",
    safetySummary: "इसलिए demo में answer पहले नहीं आता।",
    safetyBody:
      "Diagnosis schema में कोई solution field नहीं है। अगर model response target answer leak करता है, Bodh उसे learner तक पहुँचने से पहले reject कर देता है।",
    measured: "Measured release evidence",
    evaluationIntro: "यहाँ इस्तेमाल हुई unchanged diagnostic policy और model pair को frozen, versioned corpus पर जाँचा गया।",
    allCases: "सभी synthetic cases पास",
    holdout: "Frozen holdout पास",
    boundary:
      "ये results synthetic cases पर safety guardrails और diagnostic behavior मापते हैं। ये learner outcomes या classroom efficacy की research नहीं हैं।",
    taxonomyTitle: "एक असली prerequisite path से lesson को ground करना",
    taxonomyBoundary:
      "यह पाँच-topic chain curriculum grounding है। Lesson की सात authored teaching ideas presentation steps हैं—taxonomy nodes नहीं।",
    primary: "अपना सवाल लाएँ",
    secondary: "Curated fraction journey देखें",
  },
  en: {
    back: "Back",
    eyebrow: "Bodh's small promise",
    title: "Not only “how.”",
    titleAccent: "Make the “why” your own.",
    intro:
      "Bodh does not treat a homework doubt like an answer dispenser. It first finds the idea hidden underneath, then lets the learner use that idea in a picture.",
    moments: [
      ["Bodh listens", "Keep the learner's exact question and words visible."],
      ["Find the hidden idea", "Ground the next step in a small, named curriculum path."],
      ["Ask one small probe", "Ask a question that changes what should be taught—not a test."],
      ["Show it independently", "Use a deterministic visual, transfer it, then return to the original question."],
    ],
    mentor: "“I am not grading you. I am finding the right next picture.”",
    evidence:
      "Every next screen shows the learner's own evidence: their words → a small probe → visual evidence → transfer → the original question.",
    safetyTitle: "Bodh protects understanding before a solution can appear.",
    safetySummary: "That is why the demo does not show the answer first.",
    safetyBody:
      "There is no solution field in the diagnosis schema. If a model response leaks the target answer, Bodh rejects it before anything reaches the learner.",
    measured: "Measured release evidence",
    evaluationIntro:
      "The unchanged diagnostic policy and model pair used here were checked with a frozen, versioned corpus.",
    allCases: "All synthetic cases passed",
    holdout: "Frozen holdout passed",
    boundary:
      "These results measure safety guardrails and diagnostic behavior on synthetic cases. They are not learner-outcome research or evidence of classroom efficacy.",
    taxonomyTitle: "Ground the lesson in a real prerequisite path",
    taxonomyBoundary:
      "This five-topic chain is curriculum grounding. The lesson's seven authored teaching ideas are presentation steps—not taxonomy nodes.",
    primary: "Bring my question",
    secondary: "See the curated fraction journey",
  },
} as const;

const colors = ["pink", "olive", "peach", "blue"] as const;

export function HowItWorksContent() {
  const language = useNarrationLanguage();
  const text = copy[language];

  return (
    <main className="guide-shell" id="main-content" lang={language}>
      <header className="journey-header">
        <Link className="back-link" href="/" aria-label={language === "en" ? "Back to Bodh home" : "Bodh home पर वापस जाएँ"}>
          <span aria-hidden="true">←</span> {text.back}
        </Link>
        <Link className="brand brand-compact" href="/" aria-label="Bodh home">
          <BodhMark size="mark" motion="still" priority />
          <span className="brand-copy"><strong>BODH</strong></span>
        </Link>
        <div className="journey-header-tools">
          <span className="fixture-label" lang="en">90-second journey</span>
          <NarrationLanguageToggle compact />
        </div>
      </header>

      <section className="guide-hero" aria-labelledby="guide-title">
        <div className="guide-hero-copy">
          <span className="eyebrow">{text.eyebrow}</span>
          <h1 id="guide-title">{text.title} <span>{text.titleAccent}</span></h1>
          <p>{text.intro}</p>
        </div>
      </section>

      <ol className="guide-moments" aria-label="Bodh learning journey">
        {text.moments.map((moment, index) => (
          <li className={`guide-moment guide-moment-${colors[index]}`} key={colors[index]}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2>{moment[0]}</h2>
              <p>{moment[1]}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="guide-mentor-note" aria-label="Bodh's learning promise">
        <BodhMark pose="guide" size="medium" motion="guide" priority />
        <div>
          <strong>{text.mentor}</strong>
          <span>{text.evidence}</span>
        </div>
      </section>

      <section className="taxonomy-proof" aria-labelledby="taxonomy-proof-title">
        <div className="taxonomy-proof-heading">
          <span className="proof-kicker" lang="en">Committed curriculum grounding</span>
          <h2 id="taxonomy-proof-title">{text.taxonomyTitle}</h2>
          <p lang="en">Bounded Marble slice: 10 topics, 12 canonical dependencies.</p>
        </div>
        <ol className="taxonomy-chain" aria-label="Canonical prerequisite chain" lang="en">
          <li>Fractions of a whole</li>
          <li>Understanding fractions</li>
          <li>Multiplying fractions</li>
          <li>Multiplying fractions (age 10+)</li>
          <li>Dividing fractions</li>
        </ol>
        <p className="taxonomy-boundary">{text.taxonomyBoundary}</p>
      </section>

      <section className="answer-safety" aria-labelledby="answer-safety-title">
        <div className="answer-safety-copy">
          <span className="proof-kicker" lang="en">Answer safety · enforced in code</span>
          <h2 id="answer-safety-title">{text.safetyTitle}</h2>
          <strong className="answer-safety-summary">{text.safetySummary}</strong>
          <p>{text.safetyBody}</p>
        </div>
        <div className="answer-safety-path" aria-label="Answer-safety enforcement path" lang="en">
          <span>Model diagnosis</span>
          <i aria-hidden="true">→</i>
          <span>Leakage guard</span>
          <i aria-hidden="true">→</i>
          <strong>Safe learner step</strong>
        </div>
      </section>

      <section className="evaluation-proof" aria-labelledby="evaluation-title">
        <div className="evaluation-heading">
          <span className="proof-kicker" lang="en">{text.measured}</span>
          <h2 id="evaluation-title" lang="en">Synthetic safety &amp; diagnostic evaluation</h2>
          <p>{text.evaluationIntro}</p>
        </div>
        <div className="evaluation-cards">
          <article>
            <strong>32/32</strong>
            <span>{text.allCases}</span>
          </article>
          <article>
            <strong>8/8</strong>
            <span>{text.holdout}</span>
          </article>
          <p className="evaluation-boundary">{text.boundary}</p>
        </div>
      </section>

      <div className="guide-actions">
        <Link className="button button-primary" href="/diagnose">{text.primary} <span aria-hidden="true">→</span></Link>
        <Link className="button button-secondary" href="/demo">{text.secondary}</Link>
      </div>
    </main>
  );
}
