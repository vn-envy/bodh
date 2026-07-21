"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  ADAPTIVE_SESSION_STORAGE_KEY,
  serializeAdaptiveSessionPayload,
  sessionPayloadForSelection,
} from "../../lib/adaptive-repair";
import type { LocalizedText, NarrationLanguage } from "../../lib/narration-language";
import {
  SEEDED_DOUBTS,
  learningHrefForSeed,
  seededDoubtById,
  type SeededDoubtId,
} from "../../lib/seeded-doubts";
import {
  SEEDED_JOURNEY_STORAGE_KEY,
  SEEDED_JOURNEY_VERSION,
  parseSeedJourneyHandoff,
  serializeSeedJourneyHandoff,
} from "../../lib/seeded-journey";
import { reviewedProbeById } from "../../lib/reviewed-probes";
import { BodhMark } from "../components/BodhMark";
import { CurriculumClimb } from "../components/CurriculumClimb";
import { EvaporationCurriculumClimb } from "../components/EvaporationCurriculumClimb";
import { NarrationLanguageToggle, useNarrationLanguage } from "../components/NarrationLanguageToggle";
import { ReasoningVoiceControl } from "./ReasoningVoiceControl";
import { useReasoningSpeechInput } from "./useReasoningSpeechInput";

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
    source: "openai" | "reviewed_recovery";
    inputFidelity: { canonicalEquation: string; preservedTokens: string[]; confidence: number };
    concepts: Array<{ id: string; name: string; domain: string }>;
    hypotheses: Array<{ id: string; labelHi: string; evidence: { source: string; quote: string } }>;
    languageBridge: {
      learnerRegister: "hindi" | "hinglish" | "english";
      terms: Array<{ id: string; hindi: string; english: string; childMeaningHi: string }>;
    };
    probe: { questionHi: string; optionLabelsHi: string[]; distinction: string };
    adaptiveProbeId: string | null;
  };
  next: { kind: "seeded_artifact" | "curated_artifact" | "curated_demo"; href: string; artifactKey?: string };
  trace: Trace;
};

type FallbackResult = {
  mode: "curated_fallback";
  messageHi: string;
  messageEn: string;
  next: { kind: "curated_demo" | "curated_science"; href: string; artifactKey?: string };
  trace: Trace;
};

type ClarifyResult = {
  mode: "clarify_input";
  messageHi: string;
  messageEn: string;
  next: { kind: "retry_input"; href: "/diagnose" };
  trace: Trace;
};

type ApiResult = LiveResult | FallbackResult | ClarifyResult;
type SubmissionStage = "idle" | "listening" | "mapping";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const CLIENT_TIMEOUT_MS = 45_000;

const text = (hi: string, en: string): LocalizedText => ({ hi, en });
const ui = (copy: LocalizedText, language: NarrationLanguage) => copy[language];

const INTAKE_COPY = {
  back: text("वापस", "Back"),
  eyebrow: text("तुम्हारा homework doubt", "Your homework doubt"),
  title: text("सवाल लिखो। फिर बताओ कि कहाँ अटक गए।", "Write the question. Then tell Bodh where you got stuck."),
  lead: text(
    "Hindi, Hinglish, या English—जिसमें तुम्हें आसान लगे। Bodh अभी answer नहीं देगा; पहले सही छोटी idea ढूँढेगा।",
    "Use Hindi, Hinglish, or English—whichever feels easiest. Bodh will not give the answer; it will first find the small idea to rebuild.",
  ),
  problem: text("Maths का सवाल", "Maths question"),
  problemExample: text("जैसे 3/4 ÷ 1/8 = ?", "For example, 3/4 ÷ 1/8 = ?"),
  problemPlaceholder: text("अपना exact question लिखो", "Type the exact question"),
  reasoning: text("तुम कहाँ अटके?", "Where did you get stuck?"),
  reasoningHelp: text("optional, पर तुम्हारे अपने शब्द Bodh को बेहतर सुनने में मदद करते हैं", "Optional, but your own words help Bodh listen better"),
  reasoningPlaceholder: text(
    "जैसे: मुझे समझ नहीं आता कि इसे उल्टा करके multiply क्यों करते हैं",
    "For example: I do not understand why we flip it and multiply",
  ),
  sample: text("Reviewed sample doubt", "Reviewed sample doubt"),
  sampleHelp: text(
    "कोई reviewed doubt चुनो। Bodh real API से उसे सुनेगा और उसी सवाल की matching visual repair बनाएगा।",
    "Choose any reviewed doubt. Bodh will listen through the real API and carry that exact question into a matching visual repair.",
  ),
  samplePlaceholder: text("अपना सवाल लिखूँगा / लिखूँगी", "I’ll use my own question"),
  working: text("तुमने क्या try किया?", "What did you try?"),
  workingHelp: text("optional · exact working Bodh को arithmetic और concept में फर्क करने देता है", "Optional · exact working helps Bodh separate an arithmetic slip from a concept gap"),
  workingPlaceholder: text("जैसे: 3/4 × 8/1", "For example: 3/4 × 8/1"),
  photo: text("चाहो तो photo जोड़ो", "Add a photo if you want"),
  photoHelp: text(
    "PNG, JPG, या WebP · 4 MB तक · photo को trace में save नहीं किया जाता",
    "PNG, JPG, or WebP · up to 4 MB · the photo is not saved in the trace",
  ),
  submit: text("Bodh को समझने दें", "Let Bodh understand"),
  listening: text("Bodh ध्यान से सुन रहा है…", "Bodh is listening carefully…"),
  mapping: text("अभी भी सुन रहा है—सही learning idea मिला रहा है…", "Still listening—matching the right learning idea…"),
  privacy: text(
    "कोई account नहीं। Raw सवाल, photo, और तुम्हारे शब्द long-term trace में नहीं रखे जाते।",
    "No account. The raw question, photo, and your words are not kept in the long-term trace.",
  ),
  invalidQuestion: text("सवाल लिखो या उसकी photo जोड़ो।", "Type the question or add a photo."),
  invalidPhoto: text("PNG, JPG, या WebP photo चुनें — 4 MB तक।", "Choose a PNG, JPG, or WebP photo up to 4 MB."),
  connectionError: text(
    "Connection रुक गया। थोड़ा बाद फिर कोशिश करें, या curated demo खोलें।",
    "The connection paused. Try again shortly, or open the curated demo.",
  ),
  timeoutError: text(
    "Bodh को थोड़ा ज़्यादा समय लग रहा है। फिर कोशिश करें, या curated demo खोलें।",
    "Bodh is taking a little too long. Try again, or open the curated demo.",
  ),
  malformedResponse: text(
    "Bodh को अधूरा response मिला। सुरक्षित रहने के लिए एक बार फिर कोशिश करें।",
    "Bodh received an incomplete response. Please try once more so the journey stays safe.",
  ),
} as const;

function dataUrlFor(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("photo_read_failed"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isTrace(value: unknown): value is Trace {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.model === "string"
    && typeof value.promptVersion === "string"
    && isStringArray(value.taxonomyIds)
    && typeof value.persisted === "boolean";
}

function decodeApiResult(value: unknown): ApiResult | null {
  if (!isRecord(value) || !isTrace(value.trace) || !isRecord(value.next) || typeof value.next.href !== "string") {
    return null;
  }

  if (value.mode === "curated_fallback") {
    const validFallback = value.next.kind === "curated_demo"
      ? value.next.href === "/demo"
      : value.next.kind === "curated_science" && value.next.href === "/science/evaporation";
    return typeof value.messageHi === "string"
      && typeof value.messageEn === "string"
      && validFallback
      ? value as unknown as FallbackResult
      : null;
  }

  if (value.mode === "clarify_input") {
    return typeof value.messageHi === "string"
      && typeof value.messageEn === "string"
      && value.next.kind === "retry_input"
      && value.next.href === "/diagnose"
      ? value as unknown as ClarifyResult
      : null;
  }

  if (
    value.mode !== "live"
    || !isRecord(value.diagnosis)
    || !["seeded_artifact", "curated_artifact", "curated_demo"].includes(String(value.next.kind))
  ) {
    return null;
  }

  const seededDestination = value.next.kind === "seeded_artifact"
    && typeof value.next.artifactKey === "string"
    && seededDoubtById(value.next.artifactKey) !== null
    && value.next.href === learningHrefForSeed(seededDoubtById(value.next.artifactKey)!);
  const curatedDestination = value.next.kind !== "seeded_artifact" && value.next.href === "/demo";
  if (!seededDestination && !curatedDestination) return null;

  const diagnosis = value.diagnosis;
  const fidelity = diagnosis.inputFidelity;
  const bridge = diagnosis.languageBridge;
  const probe = diagnosis.probe;
  const adaptiveProbeId = diagnosis.adaptiveProbeId;
  const validAdaptiveProbe = adaptiveProbeId === null
    || typeof adaptiveProbeId === "string" && reviewedProbeById(adaptiveProbeId) !== null;

  if (
    !["openai", "reviewed_recovery"].includes(String(diagnosis.source))
    || !isRecord(fidelity)
    || typeof fidelity.canonicalEquation !== "string"
    || !isStringArray(fidelity.preservedTokens)
    || typeof fidelity.confidence !== "number"
    || !Number.isFinite(fidelity.confidence)
    || fidelity.confidence < 0
    || fidelity.confidence > 1
    || !Array.isArray(diagnosis.concepts)
    || !diagnosis.concepts.every((concept) => isRecord(concept) && typeof concept.id === "string" && typeof concept.name === "string" && typeof concept.domain === "string")
    || !Array.isArray(diagnosis.hypotheses)
    || !diagnosis.hypotheses.every((hypothesis) => isRecord(hypothesis)
      && typeof hypothesis.id === "string"
      && typeof hypothesis.labelHi === "string"
      && isRecord(hypothesis.evidence)
      && typeof hypothesis.evidence.source === "string"
      && typeof hypothesis.evidence.quote === "string")
    || !isRecord(bridge)
    || !["hindi", "hinglish", "english"].includes(String(bridge.learnerRegister))
    || !Array.isArray(bridge.terms)
    || !bridge.terms.every((term) => isRecord(term)
      && typeof term.id === "string"
      && typeof term.hindi === "string"
      && typeof term.english === "string"
      && typeof term.childMeaningHi === "string")
    || !isRecord(probe)
    || typeof probe.questionHi !== "string"
    || !isStringArray(probe.optionLabelsHi)
    || typeof probe.distinction !== "string"
    || !validAdaptiveProbe
  ) {
    return null;
  }

  return value as unknown as LiveResult;
}

export function DiagnosticIntake() {
  const language = useNarrationLanguage();
  const [problemText, setProblemText] = useState("");
  const [learnerReasoning, setLearnerReasoning] = useState("");
  const [visibleWorkText, setVisibleWorkText] = useState("");
  const [selectedSeedId, setSelectedSeedId] = useState<SeededDoubtId | "">("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageMessage, setImageMessage] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<SubmissionStage>("idle");
  const [selectedProbe, setSelectedProbe] = useState<string | null>(null);
  const [notationConfirmed, setNotationConfirmed] = useState(false);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const problemInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestAbortRef = useRef<AbortController | null>(null);
  const liveDiagnosis = result?.mode === "live" ? result.diagnosis : null;
  const selectedSeed = seededDoubtById(selectedSeedId);
  const scienceSelected = selectedSeed?.subject === "science";
  const mapFocusTopicId = selectedSeed?.focusTopicId ?? "mt_ndGqFPWyen";
  const mapGoalTopicId = selectedSeed?.goalTopicId ?? liveDiagnosis?.concepts[0]?.id ?? "mt_9Y96vxG_LH";
  const adaptiveProbe = liveDiagnosis ? reviewedProbeById(liveDiagnosis.adaptiveProbeId) : null;
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

  const invalidateDiagnosis = useCallback(() => {
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    setResult(null);
    setSelectedProbe(null);
    setNotationConfirmed(false);
    setError("");
    setSubmissionStage("idle");
    setIsSubmitting(false);
  }, []);

  const updateReasoningFromSpeech = useCallback((nextValue: string) => {
    setLearnerReasoning(nextValue);
    setSelectedSeedId("");
    invalidateDiagnosis();
  }, [invalidateDiagnosis]);

  const reasoningSpeech = useReasoningSpeechInput({
    language,
    value: learnerReasoning,
    maxLength: 1000,
    onValueChange: updateReasoningFromSpeech,
  });

  useEffect(() => {
    if (result) resultHeadingRef.current?.focus();
  }, [result]);

  useEffect(() => {
    if (!isSubmitting) return;
    const stagedMessage = window.setTimeout(() => setSubmissionStage("mapping"), 6_000);
    return () => window.clearTimeout(stagedMessage);
  }, [isSubmitting]);

  useEffect(() => () => requestAbortRef.current?.abort(), []);

  const chooseImage = (file: File | null) => {
    reasoningSpeech.cancel();
    invalidateDiagnosis();
    setImageMessage("");
    if (!file) {
      setImageFile(null);
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setImageFile(null);
      setImageMessage(ui(INTAKE_COPY.invalidPhoto, language));
      return;
    }
    setImageFile(file);
    setImageMessage(language === "hi" ? `Photo तैयार है: ${file.name}` : `Photo ready: ${file.name}`);
  };

  const chooseSeededDoubt = (seedId: string) => {
    reasoningSpeech.cancel();
    invalidateDiagnosis();
    const sample = seededDoubtById(seedId);
    setSelectedSeedId(sample?.id ?? "");
    setImageFile(null);
    setImageMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setProblemText(sample?.problemText ?? "");
    setLearnerReasoning(sample?.learnerReasoning ?? "");
    setVisibleWorkText(sample?.visibleWorkText ?? "");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    reasoningSpeech.cancel();
    setError("");
    setResult(null);
    setSelectedProbe(null);
    setNotationConfirmed(false);
    try {
      window.sessionStorage.removeItem(ADAPTIVE_SESSION_STORAGE_KEY);
      window.sessionStorage.removeItem(SEEDED_JOURNEY_STORAGE_KEY);
    } catch {
      // A fresh diagnosis still works when session storage is unavailable.
    }

    if (!problemText.trim() && !imageFile) {
      setError(ui(INTAKE_COPY.invalidQuestion, language));
      return;
    }

    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    let didTimeout = false;
    const clientTimeout = window.setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, CLIENT_TIMEOUT_MS);
    setSubmissionStage("listening");
    setIsSubmitting(true);
    try {
      const imageDataUrl = imageFile ? await dataUrlFor(imageFile) : undefined;
      const response = await fetch("/api/diagnose", {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          problemText,
          learnerReasoning,
          visibleWorkText,
          imageDataUrl,
          reviewedSeedId: selectedSeedId || undefined,
        }),
      });
      const rawBody: unknown = await response.json();
      if (!response.ok) {
        const responseMessage = language === "hi" ? "messageHi" : "messageEn";
        const message = isRecord(rawBody) && typeof rawBody[responseMessage] === "string"
          ? rawBody[responseMessage]
          : null;
        setError(message || ui(INTAKE_COPY.connectionError, language));
        return;
      }
      const body = decodeApiResult(rawBody);
      if (!body) {
        setError(ui(INTAKE_COPY.malformedResponse, language));
        return;
      }
      setResult(body);
    } catch {
      if (didTimeout) {
        setError(ui(INTAKE_COPY.timeoutError, language));
      } else if (!controller.signal.aborted) {
        setError(ui(INTAKE_COPY.connectionError, language));
      }
    } finally {
      window.clearTimeout(clientTimeout);
      if (requestAbortRef.current === controller) {
        requestAbortRef.current = null;
        setSubmissionStage("idle");
        setIsSubmitting(false);
      }
    }
  };

  const prepareLearningHandoff = () => {
    if (!adaptiveProbe || !selectedProbe || !canUseProbe || result?.mode !== "live") return false;
    if (result.next.kind === "seeded_artifact") {
      if (!selectedSeed || result.diagnosis.source !== "openai") return false;
      const seededHandoff = serializeSeedJourneyHandoff({
        version: SEEDED_JOURNEY_VERSION,
        seedId: selectedSeed.id,
        source: "openai",
        canonicalEquation: result.diagnosis.inputFidelity.canonicalEquation,
        conceptIds: result.diagnosis.concepts.map((concept) => concept.id),
        hypothesisIds: result.diagnosis.hypotheses.map((hypothesis) => hypothesis.id),
        model: result.trace.model,
        promptVersion: result.trace.promptVersion,
        probeId: adaptiveProbe.id,
        optionId: selectedProbe,
      });
      if (!seededHandoff) return false;
      try {
        window.sessionStorage.setItem(SEEDED_JOURNEY_STORAGE_KEY, seededHandoff);
        return parseSeedJourneyHandoff(
          window.sessionStorage.getItem(SEEDED_JOURNEY_STORAGE_KEY),
        )?.seedId === selectedSeed.id;
      } catch {
        return false;
      }
    }
    const payload = sessionPayloadForSelection(adaptiveProbe.id, selectedProbe);
    const serialized = serializeAdaptiveSessionPayload(payload);
    if (!serialized) return false;
    try {
      window.sessionStorage.setItem(ADAPTIVE_SESSION_STORAGE_KEY, serialized);
    } catch {
      // The destination safely falls back to the full curated journey.
    }
    return true;
  };

  const openSeededJourney = () => {
    if (result?.mode !== "live" || result.next.kind !== "seeded_artifact") return;
    if (!prepareLearningHandoff()) {
      setError(language === "hi"
        ? "Visual repair तैयार नहीं हो पाई। इसी button को फिर दबाएँ।"
        : "The visual repair was not ready. Please press this button once more.");
      return;
    }
    window.location.assign(result.next.href);
  };

  const toggleNotationConfirmation = () => {
    if (notationConfirmed) setSelectedProbe(null);
    setNotationConfirmed(!notationConfirmed);
  };

  const editNotation = () => {
    invalidateDiagnosis();
    reasoningSpeech.cancel();
    window.requestAnimationFrame(() => problemInputRef.current?.focus());
  };

  return (
    <main className="journey-shell diagnose-shell" id="main-content">
      <header className="journey-header">
        <Link className="back-link" href="/" aria-label={language === "hi" ? "Bodh home पर वापस जाएँ" : "Return to Bodh home"}>
          <span aria-hidden="true">←</span> {ui(INTAKE_COPY.back, language)}
        </Link>
        <Link className="brand brand-compact" href="/" aria-label="Bodh home">
          <BodhMark size="mark" motion="still" priority />
          <span className="brand-copy"><strong>BODH</strong></span>
        </Link>
        <div className="journey-header-tools">
          <span className="fixture-label">{language === "hi" ? "पहले सुनें" : "Listen first"}</span>
          <NarrationLanguageToggle compact />
        </div>
      </header>

      <section className="diagnose-layout" aria-live="polite" lang={language}>
        <article className="diagnose-card diagnose-intake-card" aria-busy={isSubmitting}>
          <div className="stage-with-bodh">
            <div>
              <span className="eyebrow">{ui(INTAKE_COPY.eyebrow, language)}</span>
              <h1>{ui(INTAKE_COPY.title, language)}</h1>
              <p className="stage-lead">{ui(INTAKE_COPY.lead, language)}</p>
            </div>
            <BodhMark
              pose={isSubmitting ? "tinker" : "listen"}
              size="medium"
              motion={isSubmitting ? "tinker" : "listen"}
            />
          </div>

          <form className="intake-form" onSubmit={submit}>
            <label className="sample-picker" htmlFor="seeded-doubt">
              <span>{ui(INTAKE_COPY.sample, language)}</span>
              <small>{ui(INTAKE_COPY.sampleHelp, language)}</small>
              <select
                id="seeded-doubt"
                value={selectedSeedId}
                onChange={(event) => chooseSeededDoubt(event.target.value)}
              >
                <option value="">{ui(INTAKE_COPY.samplePlaceholder, language)}</option>
                {SEEDED_DOUBTS.map((sample, index) => (
                  <option value={sample.id} key={sample.id}>
                    {index + 1}. {sample.subject === "science" ? "Science · " : ""}{sample.title[language]}
                  </option>
                ))}
              </select>
            </label>

            {selectedSeed && (
              <div className={`sample-readback sample-readback-${selectedSeed.kind} ${scienceSelected ? "sample-readback-science" : ""}`}>
                <span>{selectedSeed.concept[language]}</span>
                <strong>{selectedSeed.kind === "safe-retry"
                    ? language === "hi" ? "Safe retry behavior" : "Safe retry behavior"
                    : language === "hi" ? "Live API · इसी doubt की visual repair" : "Live API · visual repair for this exact doubt"}</strong>
              </div>
            )}

            <label className="input-label" htmlFor="problem-text">
              <span>{scienceSelected
                ? language === "hi" ? "Science का सवाल" : "Science question"
                : ui(INTAKE_COPY.problem, language)}</span>
              <small>{scienceSelected
                ? language === "hi" ? "जैसे: puddle का पानी कहाँ गया?" : "For example: where did the puddle water go?"
                : ui(INTAKE_COPY.problemExample, language)}</small>
              <input
                ref={problemInputRef}
                id="problem-text"
                name="problemText"
                value={problemText}
                maxLength={500}
                onChange={(event) => {
                  reasoningSpeech.cancel();
                  setProblemText(event.target.value);
                  setSelectedSeedId("");
                  invalidateDiagnosis();
                }}
                placeholder={ui(INTAKE_COPY.problemPlaceholder, language)}
              />
            </label>

            <div className="input-label">
              <label htmlFor="reasoning-text">{ui(INTAKE_COPY.reasoning, language)}</label>
              <small id="reasoning-text-help">{ui(INTAKE_COPY.reasoningHelp, language)}</small>
              <textarea
                id="reasoning-text"
                name="learnerReasoning"
                value={learnerReasoning}
                maxLength={1000}
                aria-describedby={`reasoning-text-help${reasoningSpeech.isSupported ? " reasoning-voice-help" : ""}`}
                onChange={(event) => {
                  reasoningSpeech.cancel();
                  setLearnerReasoning(event.target.value);
                  setSelectedSeedId("");
                  invalidateDiagnosis();
                }}
                placeholder={ui(INTAKE_COPY.reasoningPlaceholder, language)}
                rows={4}
              />
              <ReasoningVoiceControl
                language={language}
                isSupported={reasoningSpeech.isSupported}
                status={reasoningSpeech.status}
                error={reasoningSpeech.error}
                liveTranscript={reasoningSpeech.liveTranscript}
                disabled={isSubmitting}
                textareaId="reasoning-text"
                helpId="reasoning-voice-help"
                onStart={reasoningSpeech.start}
                onStop={reasoningSpeech.stop}
              />
            </div>

            <label className="input-label" htmlFor="visible-work-text">
              <span>{scienceSelected
                ? language === "hi" ? "तुमने क्या notice किया?" : "What did you notice?"
                : ui(INTAKE_COPY.working, language)}</span>
              <small>{scienceSelected
                ? language === "hi" ? "optional · observation Bodh को cause और guess अलग करने देती है" : "Optional · an observation helps Bodh separate a cause from a guess"
                : ui(INTAKE_COPY.workingHelp, language)}</small>
              <textarea
                id="visible-work-text"
                name="visibleWorkText"
                value={visibleWorkText}
                maxLength={500}
                onChange={(event) => {
                  reasoningSpeech.cancel();
                  setVisibleWorkText(event.target.value);
                  setSelectedSeedId("");
                  invalidateDiagnosis();
                }}
                placeholder={scienceSelected
                  ? language === "hi" ? "जैसे: धूप आने के बाद puddle छोटा हुआ" : "For example: the puddle became smaller after the Sun came out"
                  : ui(INTAKE_COPY.workingPlaceholder, language)}
                rows={2}
              />
            </label>

            <label className="photo-drop" htmlFor="homework-photo">
              <input
                id="homework-photo"
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => chooseImage(event.target.files?.[0] ?? null)}
              />
              <span aria-hidden="true">⌁</span>
              <strong>{ui(INTAKE_COPY.photo, language)}</strong>
              <small>{ui(INTAKE_COPY.photoHelp, language)}</small>
              {imageMessage && <em>{imageMessage}</em>}
            </label>

            {error && <p className="form-feedback" role="alert">{error}</p>}

            {isSubmitting && (
              <p className="diagnosis-status" role="status" aria-live="polite">
                {submissionStage === "mapping"
                  ? ui(INTAKE_COPY.mapping, language)
                  : ui(INTAKE_COPY.listening, language)}
              </p>
            )}

            <button className="button button-primary diagnostic-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? submissionStage === "mapping"
                  ? ui(INTAKE_COPY.mapping, language)
                  : ui(INTAKE_COPY.listening, language)
                : ui(INTAKE_COPY.submit, language)} <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="privacy-note">{ui(INTAKE_COPY.privacy, language)}</p>
        </article>

        {result?.mode === "live" && (
          <article className="diagnose-card diagnosis-result-card" lang={language}>
            <div className="stage-with-bodh diagnosis-result-heading">
              <div>
                <span className="eyebrow">{result.diagnosis.source === "openai"
                  ? language === "hi" ? "Live OpenAI response · Bodh ने क्या सुना" : "Live OpenAI response · what Bodh heard"
                  : language === "hi" ? "Reviewed recovery · Bodh ने क्या सुना" : "Reviewed recovery · what Bodh heard"}</span>
                <h2 ref={resultHeadingRef} tabIndex={-1}>
                  {language === "hi" ? "चलो इस idea को एक छोटी जाँच से समझें।" : "Let’s understand this idea with one short probe."}
                </h2>
              </div>
              <BodhMark pose="guide" size="medium" motion="guide" />
            </div>
            <div className="readback-equation">
              <span>{language === "hi" ? "Bodh ने इसे ऐसे पढ़ा" : "Bodh read this as"}</span>
              <strong>{result.diagnosis.inputFidelity.canonicalEquation}</strong>
              {result.diagnosis.inputFidelity.confidence < 0.85 && (
                <small>{language === "hi" ? "Photo से पढ़ा गया है—आगे बढ़ने से पहले notation check कर लेना।" : "This was read from a photo—check the notation before continuing."}</small>
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
              <span className="reasoning-label">{language === "hi" ? "जिस idea को check करें" : "Idea to check"}</span>
              <ul className="concept-pills">
                {result.diagnosis.concepts.map((concept) => (
                  <li key={concept.id}><strong>{concept.name}</strong><small>{concept.domain}</small></li>
                ))}
              </ul>
            </div>

            <section className="live-probe" aria-labelledby="live-probe-title">
              <span className="reasoning-label" lang={probeLanguage}>{probeLanguage === "hi" ? "पहले एक छोटी जाँच" : "One short probe first"}</span>
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

            {selectedProbe && (
              <>
                <div className="diagnosis-section hypothesis-section">
                  <span className="reasoning-label">{language === "hi" ? "अब Bodh की tentative सोच" : "Now, Bodh’s tentative hypothesis"}</span>
                  {result.diagnosis.hypotheses.map((hypothesis) => (
                    <div className="hypothesis" key={hypothesis.id}>
                      <strong lang="hi">{hypothesis.labelHi}</strong>
                      <span>{language === "hi" ? "तुम्हारे शब्द" : "Your words"}: “{hypothesis.evidence.quote}”</span>
                    </div>
                  ))}
                </div>

                <section className="diagnosis-section bridge-section" aria-labelledby="bridge-title">
                  <span className="reasoning-label">{language === "hi" ? "Bodh के शब्द" : "Language bridge"}</span>
                  <h3 id="bridge-title">
                    {language === "hi" ? "Hindi में समझें, किताब वाले शब्द भी साथ रखें।" : "Keep the familiar Hindi meaning beside the textbook term."}
                  </h3>
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
              </>
            )}

            {selectedProbe && canUseProbe ? (
              result.next.kind === "seeded_artifact" ? (
                <button
                  className="button button-primary next-lab-action"
                  type="button"
                  lang={probeLanguage}
                  onClick={openSeededJourney}
                >
                  {language === "hi" ? "इसी सवाल की visual repair शुरू करें" : "Rebuild this exact question visually"}
                  <span aria-hidden="true">→</span>
                </button>
              ) : (
                <Link
                  className="button button-primary next-lab-action"
                  href={result.next.href}
                  lang={probeLanguage}
                  onClick={prepareLearningHandoff}
                >
                  {result.next.kind === "curated_artifact"
                    ? language === "hi" ? "मेरी starting point से शुरू करें" : "Start from my learning point"
                    : language === "hi" ? "curated fraction demo देखें" : "Open the guided fraction journey"}
                  <span aria-hidden="true">→</span>
                </Link>
              )
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
            <TraceDetails trace={result.trace} language={language} />
          </article>
        )}

        {result?.mode === "clarify_input" && (
          <article className="diagnose-card clarify-card" lang={language}>
            <BodhMark pose="listen" size="medium" motion="listen" />
            <span className="eyebrow">{language === "hi" ? "Input safety · कोई guess नहीं" : "Input safety · no guessing"}</span>
            <h2 ref={resultHeadingRef} tabIndex={-1}>
              {language === "hi" ? "पहले सवाल साफ़ देख लें।" : "Let’s make the question readable first."}
            </h2>
            <p>{language === "hi" ? result.messageHi : result.messageEn}</p>
            <button className="button button-primary next-lab-action" type="button" onClick={editNotation}>
              {language === "hi" ? "Equation type करूँ" : "Type the equation"} <span aria-hidden="true">→</span>
            </button>
            <TraceDetails trace={result.trace} language={language} />
          </article>
        )}

        {result?.mode === "curated_fallback" && (
          <article className="diagnose-card fallback-card" lang={language}>
            <BodhMark pose="listen" size="medium" motion="listen" />
            <span className="eyebrow">{language === "hi" ? "सुरक्षित रास्ता" : "Safe learning path"}</span>
            <h2 ref={resultHeadingRef} tabIndex={-1}>
              {language === "hi" ? "इस बार हम guess नहीं करेंगे।" : "Bodh will not guess this time."}
            </h2>
            <p lang={language === "hi" ? "hi" : "en"}>
              {language === "hi"
                ? result.messageHi
                : result.messageEn}
            </p>
            <Link className="button button-primary next-lab-action" href={result.next.href}>
              {result.next.kind === "curated_science"
                ? language === "hi" ? "Reviewed puddle journey खोलें" : "Open the reviewed puddle journey"
                : language === "hi" ? "curated fraction demo खोलें" : "Open the curated fraction journey"} <span aria-hidden="true">→</span>
            </Link>
            <TraceDetails trace={result.trace} language={language} />
          </article>
        )}
      </section>

      {scienceSelected ? (
        <EvaporationCurriculumClimb language={language} stageIndex={0} />
      ) : (
        <CurriculumClimb
          language={language}
          focusTopicId={mapFocusTopicId}
          goalTopicId={mapGoalTopicId}
        />
      )}
    </main>
  );
}

function TraceDetails({ trace, language }: { trace: Trace; language: NarrationLanguage }) {
  return (
    <details className="trace-details">
      <summary>{language === "hi" ? "Demo trace देखें" : "View demo trace"}</summary>
      <p>Model: {trace.model} · Prompt: {trace.promptVersion}</p>
      <p>Taxonomy IDs: {trace.taxonomyIds.join(", ") || "fallback"}</p>
      <p>{trace.persisted
        ? language === "hi" ? "Privacy-minimised trace save हुई।" : "Privacy-minimised trace saved."
        : language === "hi" ? "इस environment में trace storage उपलब्ध नहीं है।" : "Trace storage is not available in this environment."}</p>
      {trace.persisted && <a href={`/api/trace/${trace.id}`} target="_blank" rel="noreferrer">{language === "hi" ? "JSON trace खोलें" : "Open JSON trace"}</a>}
    </details>
  );
}
