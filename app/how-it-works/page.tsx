import type { Metadata } from "next";
import Link from "next/link";
import { BodhMark } from "../components/BodhMark";
import { LearningStrip } from "../components/LearningStrip";
import { NarrationLanguageToggle } from "../components/NarrationLanguageToggle";

export const metadata: Metadata = {
  title: "How Bodh works",
  description: "A small, visual path from a homework doubt to durable mathematical understanding.",
};

const moments = [
  {
    number: "01",
    title: "Bodh सुनता है",
    english: "Keep the learner's exact question and words visible.",
    color: "pink",
  },
  {
    number: "02",
    title: "छुपी idea ढूँढता है",
    english: "Ground the next step in a small, named curriculum path.",
    color: "olive",
  },
  {
    number: "03",
    title: "पहले एक छोटी जाँच",
    english: "Ask one question that changes what should be taught—not a test.",
    color: "peach",
  },
  {
    number: "04",
    title: "फिर खुद से करके दिखाओ",
    english: "Use a deterministic visual, transfer it, then return to the original question.",
    color: "blue",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="guide-shell" id="main-content">
      <header className="journey-header">
        <Link className="back-link" href="/" aria-label="Bodh home पर वापस जाएँ">
          <span aria-hidden="true">←</span> वापस
        </Link>
        <Link className="brand brand-compact" href="/" aria-label="Bodh home">
          <BodhMark size="mark" motion="still" priority />
          <span className="brand-copy"><strong>BODH</strong></span>
        </Link>
        <div className="journey-header-tools">
          <span className="fixture-label">90-second journey</span>
          <NarrationLanguageToggle compact />
        </div>
      </header>

      <section className="guide-hero" aria-labelledby="guide-title">
        <div>
          <span className="eyebrow">Bodh का छोटा promise</span>
          <h1 id="guide-title">सिर्फ़ “कैसे” नहीं। <span>“क्यों” भी अपना बनाना।</span></h1>
          <p>
            Homework doubt को answer-dispenser की तरह नहीं लेते। Bodh पहले उस idea को ढूँढता है जो अभी छिपी हुई है,
            फिर बच्चे को उसे picture में इस्तेमाल करने देता है।
          </p>
        </div>
        <div className="guide-mascot-card">
          <BodhMark pose="guide" size="large" motion="guide" priority />
          <LearningStrip total={8} filled={6} unit="1/8" label="picture before rule" tone="peach" compact showUnits={false} />
          <strong>“मैं तुम्हें grade नहीं कर रहा। मैं सही अगली picture ढूँढ रहा हूँ।”</strong>
        </div>
      </section>

      <ol className="guide-moments" aria-label="Bodh learning journey">
        {moments.map((moment) => (
          <li className={`guide-moment guide-moment-${moment.color}`} key={moment.number}>
            <span>{moment.number}</span>
            <div>
              <h2>{moment.title}</h2>
              <p>{moment.english}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="guide-note">
        <strong>इसलिए demo में answer पहले नहीं आता।</strong>
        <span>हर next screen में बच्चे की अपनी evidence दिखती है: उनके शब्द → छोटा probe → visual evidence → transfer → original question।</span>
      </section>

      <div className="guide-actions">
        <Link className="button button-primary" href="/diagnose">अपना सवाल लाएँ <span aria-hidden="true">→</span></Link>
        <Link className="quiet-link" href="/demo">Curated fraction journey देखें</Link>
      </div>
    </main>
  );
}
