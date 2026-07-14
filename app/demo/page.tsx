import Link from "next/link";
import { BodhMark } from "../components/BodhMark";
import { ProgressPath } from "../components/ProgressPath";

export default function DemoPage() {
  return (
    <main className="journey-shell">
      <header className="journey-header">
        <Link className="back-link" href="/" aria-label="Bodh home पर वापस जाएँ">
          <span aria-hidden="true">←</span> वापस
        </Link>
        <Link className="brand brand-compact" href="/" aria-label="Bodh home">
          <BodhMark size="small" />
          <span className="brand-copy"><strong>BODH</strong></span>
        </Link>
        <span className="fixture-label">Curated demo</span>
      </header>

      <ProgressPath active={2} />

      <section className="demo-grid" aria-labelledby="demo-title">
        <article className="problem-panel">
          <span className="eyebrow">तुम्हारा सवाल</span>
          <h1 id="demo-title">पहले जाँच लें कि हमने सही सुना।</h1>
          <div className="confirmed-equation">
            <span>3/4</span><span>÷</span><span>1/8</span><span>= ?</span>
          </div>
          <div className="reasoning-box">
            <span className="reasoning-label">तुमने कहा</span>
            <p>“मुझे समझ नहीं आता कि इसे उल्टा करके multiply क्यों करते हैं।”</p>
          </div>
          <p className="calm-note">
            Bodh तुम्हें grade नहीं कर रहा। वह बस यह देख रहा है कि कौन-सी छोटी idea पहले काम आएगी।
          </p>
        </article>

        <aside className="concept-panel" aria-labelledby="concept-title">
          <div className="concept-heading">
            <BodhMark size="small" />
            <div>
              <span className="eyebrow">Bodh का रास्ता</span>
              <h2 id="concept-title">शायद यहाँ एक छोटा connection छूटा है।</h2>
            </div>
          </div>

          <ol className="concept-path">
            <li className="concept-node node-olive">
              <span>1</span>
              <div><strong>1/8 एक size है</strong><small>unit fraction</small></div>
            </li>
            <li className="concept-node node-peach">
              <span>2</span>
              <div><strong>3/4 को eighths में देखो</strong><small>six pieces of 1/8</small></div>
            </li>
            <li className="concept-node node-pink">
              <span>3</span>
              <div><strong>कितने groups बैठते हैं?</strong><small>division as an unknown factor</small></div>
            </li>
          </ol>

          <div className="phase-note">
            <strong>Phase 0 foundation ready</strong>
            <span>अगले phase में यही fixture एक पूरी interactive journey बनेगा।</span>
          </div>
        </aside>
      </section>
    </main>
  );
}
