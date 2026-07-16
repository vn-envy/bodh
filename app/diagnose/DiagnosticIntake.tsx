"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ADAPTIVE_SESSION_STORAGE_KEY,
  adaptiveProbeById,
  serializeAdaptiveSessionPayload,
  sessionPayloadForSelection,
  type AdaptiveProbeId,
} from "../../lib/adaptive-repair";
import type { NarrationLanguage } from "../../lib/narration-language";
import { BodhMark } from "../components/BodhMark";
import { NarrationLanguageToggle, useNarrationLanguage } from "../components/NarrationLanguageToggle";

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
    adaptiveProbeId: AdaptiveProbeId | null;
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
  const language = useNarrationLanguage();
  const [problemText, setProblemText] = useState("");
  const [learnerReasoning, setLearnerReasoning] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageMessage, setImageMessage] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProbe, setSelectedProbe] = useState<string | null>(null);
  const [notationConfirmed, setNotationConfirmed] = useState(false);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const problemInputRef = useRef<HTMLInputElement>(null);
  const liveDiagnosis = result?.mode === "live" ? result.diagnosis : null;
  const adaptiveProbe = liveDiagnosis ? adaptiveProbeById(liveDiagnosis.adaptiveProbeId) : null;
  const probeLanguage: NarrationLanguage = adaptiveProbe ? language : "hi";
  const needsNotationConfirmation = Boolean(
    imageFile && liveDiagnosis && liveDiagnosis.inputFidelity.confidence < 0.85,
  );
  const canUseProbe = !needsNotationConfirmation || notationConfirmed;
  const visibleProbe = liveDiagnosis
    ? {
        question: adaptiveProbe?.question[probeLanguage] ?? liveDiagnosis.probe.questionHi,
        options: adaptiveProbe
          ? adaptiveProbe.options.map((option) => ({ id: option.id, label: option.label[probeLanguage] }))
          : liveDiagnosis.probe.optionLabelsHi.map((label, index) => ({ id: `generated-${index}`, label })),
      }
    : null;

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
    setNotationConfirmed(false);
    try {
      window.sessionStorage.removeItem(ADAPTIVE_SESSION_STORAGE_KEY);
    } catch {
      // A fresh diagnosis still works when session storage is unavailable.
    }

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

  const prepareLearningHandoff = () => {
    if (!adaptiveProbe || !selectedProbe || !canUseProbe) return;
    const payload = sessionPayloadForSelection(adaptiveProbe.id, selectedProbe);
    const serialized = serializeAdaptiveSessionPayload(payload);
    if (!serialized) return;
    try {
      window.sessionStorage.setItem(ADAPTIVE_SESSION_STORAGE_KEY, serialized);
    } catch {
      // The destination safely falls back to the full curated journey.
    }
  };

  const toggleNotationConfirmation = () => {
    if (notationConfirmed) setSelectedProbe(null);
    setNotationConfirmed(!notationConfirmed);
  };

  const editNotation = () => {
    setNotationConfirmed(false);
    setSelectedProbe(null);
    window.requestAnimationFrame(() => problemInputRef.current?.focus());
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
        <div className="journey-header-tools">
          <span className="fixture-label">Listen first</span>
          <NarrationLanguageToggle compact />
        </div>
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
                ref={problemInputRef}
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
            {needsNotationConfirmation && (
              <section
                className="notation-confirmation"
                aria-labelledby="notation-confirmation-title"
                lang={language}
              >
                <p id="notation-confirmation-title">
                  {language === "hi"
                    ? "Photo से पढ़ी notation पर confidence कम है। छोटी जाँच से पहले ऊपर की equation को ध्यान से मिलाएँ।"
                    : "Bodh is less confident about the notation read from this photo. Check the equation before the short probe."}
                </p>
                <div className="notation-confirmation-actions">
                  <button
                    className={notationConfirmed ? "notation-confirmed" : ""}
                    type="button"
                    aria-pressed={notationConfirmed}
                    onClick={toggleNotationConfirmation}
                  >
                    {notationConfirmed
                      ? language === "hi" ? "✓ Notation confirm हो गई" : "✓ Notation confirmed"
                      : language === "hi" ? "हाँ, notation बिल्कुल सही है" : "Yes, the notation is exact"}
                  </button>
                  <button type="button" onClick={editNotation}>
                    {language === "hi" ? "सवाल लिखकर ठीक करूँ" : "I’ll type a correction"}
                  </button>
                </div>
              </section>
            )}

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
                    <strong lang="hi">{term.hindi}</strong>
                    <span lang="en">{term.english}</span>
                    <p lang="hi">{term.childMeaningHi}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="live-probe" aria-labelledby="live-probe-title">
              <span className="reasoning-label" lang="hi">पहले एक छोटी जाँच</span>
              <h3 id="live-probe-title" lang={probeLanguage}>{visibleProbe?.question}</h3>
              <div
                className="live-probe-options"
                role="group"
                aria-label={visibleProbe?.question}
                aria-describedby={needsNotationConfirmation && !notationConfirmed ? "notation-confirmation-title" : undefined}
                lang={probeLanguage}
              >
                {visibleProbe?.options.map((option) => (
                  <button
                    className={selectedProbe === option.id ? "live-probe-selected" : ""}
                    type="button"
                    key={option.id}
                    aria-pressed={selectedProbe === option.id}
                    disabled={!canUseProbe}
                    onClick={() => setSelectedProbe(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {selectedProbe && (
                <p lang={probeLanguage}>
                  {adaptiveProbe
                    ? probeLanguage === "hi"
                      ? "ठीक है—यह सही या गलत का label नहीं है। इससे Bodh तय करेगा कि समझ की यात्रा कहाँ से शुरू हो।"
                      : "This is not a right-or-wrong label. Bodh will use it only to choose where the learning journey begins."
                    : "ठीक है—Bodh इस answer को सीखने की अगली छोटी step में इस्तेमाल करेगा।"}
                </p>
              )}
            </section>

            {selectedProbe && canUseProbe ? (
              <Link
                className="button button-primary next-lab-action"
                href={result.next.href}
                lang={probeLanguage}
                onClick={prepareLearningHandoff}
              >
                {result.next.kind === "curated_artifact"
                  ? language === "hi" ? "मेरी starting point से शुरू करें" : "Start from my learning point"
                  : "curated fraction demo देखें"}
                <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <button
                className="button button-primary next-lab-action"
                type="button"
                disabled
                lang={probeLanguage}
              >
                {needsNotationConfirmation && !notationConfirmed
                  ? probeLanguage === "hi" ? "पहले notation confirm करें" : "Confirm the notation first"
                  : probeLanguage === "hi" ? "पहले छोटी जाँच चुनें" : "Choose the short probe first"}
                <span aria-hidden="true">→</span>
              </button>
            )}
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
