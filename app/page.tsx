import Link from "next/link";
import { BodhMark } from "./components/BodhMark";

export default function Home() {
  return (
    <main className="site-shell" id="main-content">
      <header className="site-header" aria-label="Bodh header">
        <Link className="brand" href="/" aria-label="Bodh home">
          <BodhMark size="small" />
          <span className="brand-copy">
            <strong>BODH</strong>
            <span>That which is truly understood</span>
          </span>
        </Link>
        <span className="language-chip">हिंदी + English</span>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow">समझना, सिर्फ़ जवाब नहीं</span>
          <h1 id="hero-title">
            अपना सवाल लाओ।
            <span>समझकर वापस जाओ।</span>
          </h1>
          <p>
            English homework का doubt Hindi या Hinglish में बताओ। Bodh उस
            confusion के नीचे छुपी छोटी-सी idea ढूँढने में मदद करेगा।
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/diagnose">
              अपना सवाल समझें
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="quiet-link" href="/demo">पहले Curated demo देखें</Link>
            <Link className="quiet-link" href="/how-it-works">Bodh कैसे मदद करता है</Link>
          </div>
        </div>

        <article className="doubt-card" aria-labelledby="doubt-title">
          <div className="mascot-corner">
            <BodhMark size="large" />
            <span className="speech-pill">पहले सुनते हैं।</span>
          </div>
          <div className="card-label-row">
            <span className="card-kicker" id="doubt-title">
              आज का demo doubt
            </span>
            <span className="seed-badge">Curated seed</span>
          </div>
          <p className="equation" aria-label="three quarters divided by one eighth">
            3/4 <span>÷</span> 1/8 = ?
          </p>
          <blockquote>
            “मुझे समझ नहीं आता कि इसे उल्टा करके multiply क्यों करते हैं।”
          </blockquote>
          <div className="concept-preview" aria-label="Bodh learning promise">
            <span>सवाल</span>
            <i aria-hidden="true" />
            <span>छुपी idea</span>
            <i aria-hidden="true" />
            <span>अपनी समझ</span>
          </div>
        </article>
      </section>

      <footer className="site-footer">
        <span>Marble Skill Taxonomy से concept grounding</span>
        <span aria-hidden="true">•</span>
        <span>Built for learners aged 8–12</span>
      </footer>
    </main>
  );
}
