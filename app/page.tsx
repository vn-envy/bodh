"use client";

import Link from "next/link";
import { BodhMark } from "./components/BodhMark";
import { JudgeLaneLink } from "./components/JudgeLaneLink";
import { LearningStrip } from "./components/LearningStrip";
import { NarrationLanguageToggle, useNarrationLanguage } from "./components/NarrationLanguageToggle";

export default function Home() {
  const language = useNarrationLanguage();
  const english = language === "en";

  return (
    <main className="site-shell" id="main-content" lang={language}>
      <header className="site-header" aria-label="Bodh header">
        <Link className="brand" href="/" aria-label="Bodh home">
          <BodhMark size="mark" motion="still" priority />
          <span className="brand-copy">
            <strong>BODH</strong>
            <span lang="en">That which is truly understood</span>
          </span>
        </Link>
        <NarrationLanguageToggle />
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow">{english ? "Understanding, not just answers" : "समझना, सिर्फ़ जवाब नहीं"}</span>
          <h1 id="hero-title">
            {english ? "Bring your question." : "अपना सवाल लाओ।"}
            <span>{english ? "Leave with understanding." : "समझकर वापस जाओ।"}</span>
          </h1>
          <p>
            {english
              ? "Share an English-homework doubt in Hindi, Hinglish, or English. Bodh helps uncover the small idea hidden underneath the confusion."
              : "English homework का doubt Hindi या Hinglish में बताओ। Bodh उस confusion के नीचे छुपी छोटी-सी idea ढूँढने में मदद करेगा।"}
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/diagnose">
              {english ? "Understand my question" : "अपना सवाल समझें"}
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="button button-secondary" href="/how-it-works">
              {english ? "How Bodh helps" : "Bodh कैसे मदद करता है"}
            </Link>
          </div>
          <div className="hero-trust" aria-label="Bodh learner fit">
            <span><i aria-hidden="true" /><span lang="en">Concept grounding: Marble taxonomy</span></span>
            <span><i aria-hidden="true" />{english ? "Ages 8–12" : "उम्र 8–12"}</span>
          </div>
          <JudgeLaneLink />
        </div>

        <Link
          className="doubt-card demo-card-link"
          href="/demo"
          aria-labelledby="doubt-title"
        >
          <div className="doubt-card-mentor">
            <BodhMark pose="listen" size="medium" motion="listen" priority />
            <div>
              <span className="speech-pill">{english ? "First, I listen." : "पहले सुनते हैं।"}</span>
              <span className="card-kicker" id="doubt-title">{english ? "Today's demo doubt" : "आज का demo doubt"}</span>
            </div>
          </div>
          <div className="doubt-card-body">
            <div className="card-label-row">
              <span className="demo-card-invitation" lang="en">Curated demo · Fraction journey</span>
              <span className="seed-badge">Curated seed</span>
            </div>
            <p
              className="equation"
              aria-label={english ? "three quarters divided by one eighth" : "तीन चौथाई को एक बटे आठ से भाग"}
            >
              3/4 <span>÷</span> 1/8 = ?
            </p>
            <LearningStrip
              total={8}
              filled={6}
              unit="1/8"
              label={english ? "See 3/4 as eighths" : "3/4 को eighths में देखें"}
              tone="peach"
              compact
              language={language}
            />
            <blockquote lang={language}>
              {english
                ? "“I don't understand why we flip it and multiply.”"
                : "“मुझे समझ नहीं आता कि इसे उल्टा करके multiply क्यों करते हैं।”"}
            </blockquote>
            <div className="concept-preview" aria-label="Bodh learning promise">
              <span>{english ? "Question" : "सवाल"}</span>
              <i aria-hidden="true" />
              <span>{english ? "Hidden idea" : "छुपी idea"}</span>
              <i aria-hidden="true" />
              <span>{english ? "Your understanding" : "अपनी समझ"}</span>
            </div>
            <span className="demo-card-cta">{english ? "Open demo journey" : "Demo journey खोलें"} <span aria-hidden="true">→</span></span>
          </div>
        </Link>
      </section>

      <footer className="site-footer">
        <span>{english ? "Concept grounding with the Marble Skill Taxonomy" : "Marble Skill Taxonomy से concept grounding"}</span>
        <span aria-hidden="true">•</span>
        <span lang="en">Built for learners aged 8–12</span>
      </footer>
    </main>
  );
}
