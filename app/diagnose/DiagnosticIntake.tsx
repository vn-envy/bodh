"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { BodhMark } from "../components/BodhMark";

type Trace = {
  id: string;
  model: string;
  promptVersion: string;
  taxonomyIds: string[];
  persisted: boolean;
};

type LiveResult = {
  mode: "live";
  diagnosis: {
    inputFidelity: { canonicalEquation: string; preservedTokens: string[]; confidence: number };
    concepts: Array<{ id: string; name: string; domain: string }>;
    hypotheses: Array<{ id: string; labelHi: string; evidence: { source: string; quote: string } }>;
    languageBridge: {
      learnerRegister: "hindi" | "hinglish" | "english";
      terms: Array<{ id: string; hindi: string; english: string; childMeaningHi: string }>;
    };
    probe: { questionHi: string; optionLabelsHi: string[]; distinction: string };
  };
  next: { kind: "curated_artifact" | "curated_demo"; href: string; artifactKey?: string };
  trace: Trace;
};

type FallbackResult = {
  mode: "curated_fallback";
  messageHi: string;
  next: { kind: "curated_demo"; href: string };
  trace: Trace;
};

type ApiResult = LiveResult | FallbackResult;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function dataUrlFor(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("photo_read_failed"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export function DiagnosticIntake() {
  const [problemText, setProblemText] = useState("");
  const [learnerReasoning, setLearnerReasoning] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageMessage, setImageMessage] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProbe, setSelectedProbe] = useState<string | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (result) resultHeadingRef.current?.focus();
  }, [result]);

  const chooseImage = (file: File | null) => {
    setImageMessage("");
    if (!file) {
      setImageFile(null);
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setImageFile(null);
      setImageMessage("PNG, JPG, या WebP photo चुनें — 4 MB तक।");
      return;
    }
    setImageFile(file);
    setImageMessage(`Photo ready: ${file.name}`);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setResult(null);
    setSelectedProbe(null);

    if (!problemText.trim() && !imageFile) {
      setError("सवाल लिखो या उसकी photo जोड़ो।");
      return;
    }

    setIsSubmitting(true);
    try {
      const imageDataUrl = imageFile ? await dataUrlFor(imageFile) : undefined;
      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ problemText, learnerReasoning, imageDataUrl }),
      });
      const body = (await response.json()) as ApiResult & { messageHi?: string };
      if (!response.ok) {
        setError(body.messageHi || "अभी यह सवाल नहीं पढ़ पाए। एक बार फिर कोशिश करें।");
        return;
      }
      setResult(body);
    } catch {
      setError("Connection रुक गया। थोड़ा बाद फिर कोशिश करें, या curated demo खोलें।");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="journey-shell diagnose-shell" id="main-content">
      <header className="journey-header">
        <Link className="back-link" href="/" aria-label="Bodh home पर वापस जाएँ">
          <span aria-hidden="true">←</span> वापस
        </Link>
        <Link className="brand brand-compact" href="/" aria-label="Bodh home">
          <BodhMark size="mark" motion="still" priority />
          <span className="brand-copy"><strong>BODH</strong></span>
        </Link>
        <span className="fixture-label">Listen first</span>
      </header>

      <section className="diagnose-layout" aria-live="polite">
        <article className="diagnose-card diagnose-intake-card">
          <div className="stage-with-bodh">
            <div>
              <span className="eyebrow">तुम्हारा homework doubt</span>
              <h1>सवाल लिखो। फिर बताओ कि कहाँ अटक गए।</h1>
              <p className="stage-lead">
                Hindi, Hinglish, या English—जिसमें तुम्हें आसान लगे। Bodh अभी answer नहीं देगा; पहले सही छोटी idea ढूँढेगा।
              </p>
            </div>
            <BodhMark
              pose={isSubmitting ? "tinker" : "listen"}
              size="medium"
              motion={isSubmitting ? "tinker" : "listen"}
            />
          </div>

          <form className="intake-form" onSubmit={submit}>
            <label className="input-label" htmlFor="problem-text">
              <span>Maths का सवाल</span>
              <small>जैसे 3/4 ÷ 1/8 = ?</small>
              <input
                id="problem-text"
                name="problemText"
                value={problemText}
                maxLength={500}
                onChange={(event) => setProblemText(event.target.value)}
                placeholder="अपना exact question लिखो"
              />
            </label>

            <label className="input-label" htmlFor="reasoning-text">
              <span>तुम कहाँ अटके?</span>
              <small>optional, but your own words help Bodh listen better</small>
              <textarea
                id="reasoning-text"
                name="learnerReasoning"
                value={learnerReasoning}
                maxLength={1000}
                onChange={(event) => setLearnerReasoning(event.target.value)}
                placeholder="जैसे: मुझे समझ नहीं आता कि इसे उल्टा करके multiply क्यों करते हैं"
                rows={4}
              />
            </label>

            <label className="photo-drop" htmlFor="homework-photo">
              <input
                id="homework-photo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => chooseImage(event.target.files?.[0] ?? null)}
              />
              <span aria-hidden="true">⌁</span>
              <strong>Photo जोड़ना चाहो तो जोड़ो</strong>
              <small>PNG, JPG, या WebP · 4 MB तक · photo को trace में save नहीं किया जाता</small>
              {imageMessage && <em>{imageMessage}</em>}
            </label>

            {error && <p className="form-feedback" role="alert">{error}</p>}

            <button className="button button-primary diagnostic-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Bodh ध्यान से देख रहा है…" : "Bodh को समझने दें"} <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="privacy-note">No account. Raw सवाल, photo, और तुम्हारे शब्द long-term trace में नहीं रखे जाते।</p>
        </article>

        {result?.mode === "live" && (
          <article className="diagnose-card diagnosis-result-card">
            <div className="stage-with-bodh diagnosis-result-heading">
              <div>
                <span className="eyebrow">Bodh ने पहले क्या सुना</span>
                <h2 ref={resultHeadingRef} tabIndex={-1}>चलो इस idea को एक छोटी जाँच से समझें।</h2>
              </div>
              <BodhMark pose="guide" size="medium" motion="guide" />
            </div>
            <div className="readback-equation">
              <span>Bodh read this as</span>
              <strong>{result.diagnosis.inputFidelity.canonicalEquation}</strong>
              {result.diagnosis.inputFidelity.confidence < 0.85 && (
                <small>Photo से पढ़ा गया है—आगे बढ़ने से पहले notation check कर लेना।</small>
              )}
            </div>

            <div className="diagnosis-section">
              <span className="reasoning-label">जिस idea को check करें</span>
              <ul className="concept-pills">
                {result.diagnosis.concepts.map((concept) => (
                  <li key={concept.id}><strong>{concept.name}</strong><small>{concept.domain}</small></li>
                ))}
              </ul>
            </div>

            <div className="diagnosis-section hypothesis-section">
              <span className="reasoning-label">Bodh की tentative सोच</span>
              {result.diagnosis.hypotheses.map((hypothesis) => (
                <div className="hypothesis" key={hypothesis.id}>
                  <strong>{hypothesis.labelHi}</strong>
                  <span>तुम्हारे शब्द: “{hypothesis.evidence.quote}”</span>
                </div>
              ))}
            </div>

            <section className="diagnosis-section bridge-section" aria-labelledby="bridge-title">
              <span className="reasoning-label">Bodh के शब्द</span>
              <h3 id="bridge-title">Hindi में समझें, किताब वाले शब्द भी साथ रखें।</h3>
              <div className="bridge-terms">
                {result.diagnosis.languageBridge.terms.map((term) => (
                  <article key={term.id}>
                    <strong>{term.hindi}</strong>
                    <span>{term.english}</span>
                    <p>{term.childMeaningHi}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="live-probe" aria-labelledby="live-probe-title">
              <span className="reasoning-label">पहले एक छोटी जाँच</span>
              <h3 id="live-probe-title">{result.diagnosis.probe.questionHi}</h3>
              <div className="live-probe-options" role="group" aria-label={result.diagnosis.probe.questionHi}>
                {result.diagnosis.probe.optionLabelsHi.map((option) => (
                  <button
                    className={selectedProbe === option ? "live-probe-selected" : ""}
                    type="button"
                    key={option}
                    aria-pressed={selectedProbe === option}
                    onClick={() => setSelectedProbe(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {selectedProbe && <p>ठीक है—Bodh इस answer को सीखने की अगली छोटी step में इस्तेमाल करेगा।</p>}
            </section>

            <Link className="button button-primary next-lab-action" href={result.next.href}>
              {result.next.kind === "curated_artifact" ? "guided fraction lab खोलें" : "curated fraction demo देखें"}
              <span aria-hidden="true">→</span>
            </Link>
            <TraceDetails trace={result.trace} />
          </article>
        )}

        {result?.mode === "curated_fallback" && (
          <article className="diagnose-card fallback-card">
            <BodhMark pose="listen" size="medium" motion="listen" />
            <span className="eyebrow">सुरक्षित रास्ता</span>
            <h2 ref={resultHeadingRef} tabIndex={-1}>इस बार हम guess नहीं करेंगे।</h2>
            <p>{result.messageHi}</p>
            <Link className="button button-primary next-lab-action" href={result.next.href}>
              curated fraction demo खोलें <span aria-hidden="true">→</span>
            </Link>
            <TraceDetails trace={result.trace} />
          </article>
        )}
      </section>
    </main>
  );
}

function TraceDetails({ trace }: { trace: Trace }) {
  return (
    <details className="trace-details">
      <summary>Demo trace देखें</summary>
      <p>Model: {trace.model} · Prompt: {trace.promptVersion}</p>
      <p>Taxonomy IDs: {trace.taxonomyIds.join(", ") || "fallback"}</p>
      <p>{trace.persisted ? "Privacy-minimised trace saved." : "Trace storage is not available in this environment."}</p>
      {trace.persisted && <a href={`/api/trace/${trace.id}`} target="_blank" rel="noreferrer">JSON trace खोलें</a>}
    </details>
  );
}
