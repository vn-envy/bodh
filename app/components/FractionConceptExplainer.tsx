"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  completedVisualState,
  FRACTION_CONCEPT_STAGES,
  FRACTION_MODEL,
  FRACTION_NARRATION_VERSION,
  type FractionCueTarget,
  type FractionNarrationBeat,
  type FractionVisualState,
} from "../../lib/fraction-concept";

type FractionConceptExplainerProps = {
  onFinish: () => void;
};

type VoiceState = "idle" | "loading" | "ready" | "playing" | "paused" | "ended" | "unavailable";
type VoiceSource = "openai" | "device" | null;
type PlaybackResult = "ended" | "failed" | "cancelled";
type ActivePlayer =
  | { kind: "audio"; media: HTMLAudioElement; run: number; resolve: (result: PlaybackResult) => void }
  | { kind: "speech"; utterance: SpeechSynthesisUtterance; run: number; resolve: (result: PlaybackResult) => void };
type PreparedVoice = { stageId: string; source: Exclude<VoiceSource, null>; urls?: string[] };
type PointerPosition = { x: number; top: number; length: number; angle: number };

const visualLabels: Record<FractionVisualState, string> = {
  blank: "एक खाली फ्रैक्शन पट्टी, जिसमें अभी पूरा चुना जाना है",
  whole: "पूरी पट्टी को एक पूरा चुना गया है",
  quarters: "वही पूरा चार एक-जैसे आकार के बराबर हिस्सों में बँटा है",
  unit: "चार बराबर हिस्सों में पहला एक-चौथाई चुना हुआ है",
  fraction: "चार बराबर हिस्सों में पहले तीन हिस्से चुने हुए हैं",
  eighths: "तीन चौथाई को छोटे आठवें हिस्सों में बाँटा गया है; मात्रा वही है और समीकरण तीन चौथाई बराबर सवाल बटे आठ है",
  multiply: "एक बटा आठ के बराबर हिस्से बार-बार रखे गए हैं; गिनती अभी सवाल है",
  divide: "तीन चौथाई में एक बटा आठ आकार के कितने हिस्से हैं, यह पूछा गया है",
};

const pointerLabel: Record<FractionCueTarget, string> = {
  whole: "यही पूरा",
  "equal-parts": "बराबर हिस्से",
  "unit-quarter": "एक चौथाई",
  denominator: "नीचे का 4",
  "selected-three": "तीन हिस्से",
  numerator: "ऊपर का 3",
  amount: "वही मात्रा",
  "eighth-seams": "नई रेखा",
  "eighth-unit": "एक बटा आठ",
  "eighth-units": "वही हिस्सा, बार-बार",
  equivalence: "अलग नाम",
  times: "गुणा",
  divide: "भाग",
  unknown: "कितने?",
};

const pointerAnchor: Record<FractionCueTarget, string> = {
  whole: "whole",
  "equal-parts": "whole",
  "unit-quarter": "unit-quarter",
  denominator: "denominator",
  "selected-three": "selected-three",
  numerator: "numerator",
  amount: "amount",
  "eighth-seams": "eighth-seam",
  "eighth-unit": "eighth-unit",
  "eighth-units": "eighth-units",
  equivalence: "equivalence",
  times: "times",
  divide: "divide",
  unknown: "unknown",
};

function FractionGlyph({
  numerator,
  denominator,
  numeratorTarget,
  denominatorTarget,
}: {
  numerator: string;
  denominator: string;
  numeratorTarget?: boolean;
  denominatorTarget?: boolean;
}) {
  return (
    <span className="atomic-fraction" aria-label={`${numerator} बटे ${denominator}`}>
      <span data-bodh-anchor={numeratorTarget ? "numerator" : undefined}>{numerator}</span>
      <span data-bodh-anchor={denominatorTarget ? "denominator" : undefined}>{denominator}</span>
    </span>
  );
}

function EquationFor({ state }: { state: FractionVisualState }) {
  if (state === "blank") return <span className="atomic-equation-muted">एक whole चुनें</span>;
  if (state === "whole") return <strong>1 whole</strong>;
  if (state === "quarters") {
    return <strong className="atomic-equation-small">1/4 + 1/4 + 1/4 + 1/4 = 1</strong>;
  }
  if (state === "unit") {
    return (
      <div className="atomic-symbol-teaching">
        <FractionGlyph numerator="1" denominator="4" denominatorTarget />
        <span className="atomic-term-tag atomic-term-denominator">हर · 4 बराबर हिस्से</span>
      </div>
    );
  }
  if (state === "fraction") {
    return (
      <div className="atomic-symbol-teaching">
        <FractionGlyph numerator="3" denominator="4" numeratorTarget denominatorTarget />
        <span className="atomic-term-tag atomic-term-numerator">अंश · 3 हिस्से</span>
        <span className="atomic-term-tag atomic-term-denominator">हर · हिस्से का आकार</span>
      </div>
    );
  }
  if (state === "eighths") {
    return (
      <strong className="atomic-equivalence" data-bodh-anchor="equivalence">
        <FractionGlyph numerator="3" denominator="4" />
        <span>=</span>
        <FractionGlyph numerator="?" denominator="8" />
      </strong>
    );
  }
  if (state === "multiply") {
    return (
      <strong className="atomic-operation">
        <span data-bodh-anchor="unknown">?</span>
        <span data-bodh-anchor="times">×</span>
        <FractionGlyph numerator="1" denominator="8" />
        <span>=</span>
        <FractionGlyph numerator="3" denominator="4" />
      </strong>
    );
  }
  return (
    <strong className="atomic-operation">
      <FractionGlyph numerator="3" denominator="4" />
      <span data-bodh-anchor="divide">÷</span>
      <FractionGlyph numerator="1" denominator="8" />
      <span>=</span>
      <span data-bodh-anchor="unknown">?</span>
    </strong>
  );
}

function ArtifactPointer({
  beat,
  position,
}: {
  beat: FractionNarrationBeat | null;
  position: PointerPosition | null;
}) {
  if (!beat || !position) return null;

  const style = {
    left: `${position.x}px`,
    top: `${position.top}px`,
    "--atomic-pointer-length": `${position.length}px`,
    "--atomic-pointer-angle": `${position.angle}deg`,
  } as CSSProperties;

  return (
    <div className="atomic-pointer" key={beat.id} style={style} aria-hidden="true">
      <span className="atomic-pointer-label">{pointerLabel[beat.target]}</span>
      <span className="atomic-pointer-line" />
    </div>
  );
}

function FractionArtifact({
  state,
  beat,
}: {
  state: FractionVisualState;
  beat: FractionNarrationBeat | null;
}) {
  const showEighthLabels = state === "multiply" || state === "divide";
  const quarters = Array.from({ length: FRACTION_MODEL.quarterCount });
  const artifactRef = useRef<HTMLDivElement>(null);
  const [pointerPosition, setPointerPosition] = useState<PointerPosition | null>(null);

  useEffect(() => {
    const root = artifactRef.current;
    if (!root || !beat) {
      setPointerPosition(null);
      return;
    }

    let frame = 0;
    const measure = () => {
      const target = root.querySelector<HTMLElement>(
        `[data-bodh-anchor~="${pointerAnchor[beat.target]}"]`,
      );
      if (!target) {
        setPointerPosition(null);
        return;
      }
      const rootRect = root.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const targetX = beat.target === "eighth-seams"
        ? targetRect.left - rootRect.left
        : targetRect.left - rootRect.left + targetRect.width / 2;
      const targetY = targetRect.top - rootRect.top + targetRect.height / 2;
      const x = Math.min(Math.max(targetX, 68), Math.max(68, rootRect.width - 68));
      const top = Math.max(8, targetY - 72);
      const deltaX = targetX - x;
      const deltaY = Math.max(18, targetY - top - 29);
      setPointerPosition({
        x,
        top,
        length: Math.hypot(deltaX, deltaY),
        angle: Math.atan2(deltaY, deltaX) * (180 / Math.PI),
      });
    };
    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleMeasure);
    observer?.observe(root);
    window.addEventListener("resize", scheduleMeasure);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [beat, state]);

  return (
    <div
      ref={artifactRef}
      className={`atomic-artifact atomic-visual-${state} ${beat ? `atomic-cue-${beat.target}` : ""}`}
      role="img"
      aria-label={visualLabels[state]}
      data-cue-target={beat?.target}
    >
      <div className="atomic-whole-label" aria-hidden="true">
        <span>वही एक पूरा</span>
        <i />
      </div>
      <div className="atomic-bar" aria-hidden="true" data-bodh-anchor="whole">
        {quarters.map((_, quarterIndex) => (
          <span
            className={`atomic-quarter atomic-quarter-${quarterIndex + 1}`}
            data-bodh-anchor={[
              quarterIndex === 0 ? "unit-quarter" : "",
              quarterIndex < FRACTION_MODEL.selectedQuarters ? "selected-three" : "",
            ].filter(Boolean).join(" ") || undefined}
            key={quarterIndex}
          >
            {Array.from({ length: FRACTION_MODEL.eighthsPerQuarter }).map((__, eighthIndex) => (
              <i
                className="atomic-eighth"
                data-bodh-anchor={[
                  quarterIndex === 0 && eighthIndex === 0 ? "eighth-unit" : "",
                  quarterIndex === 0 && eighthIndex === 1 ? "eighth-seam" : "",
                  quarterIndex < FRACTION_MODEL.selectedQuarters ? "eighth-units" : "",
                ].filter(Boolean).join(" ") || undefined}
                key={eighthIndex}
              >
                {showEighthLabels && quarterIndex < FRACTION_MODEL.selectedQuarters ? <small>1/8</small> : null}
              </i>
            ))}
          </span>
        ))}
      </div>
      <div className="atomic-amount-brace" aria-hidden="true" data-bodh-anchor="amount">
        <i /><span>रँगी मात्रा = 3/4</span>
      </div>
      <div className="atomic-equation" key={state} aria-hidden="true">
        <EquationFor state={state} />
      </div>
      <ArtifactPointer beat={beat} position={pointerPosition} />
    </div>
  );
}

function voiceButtonLabel(state: VoiceState) {
  if (state === "loading") return "तैयारी रोकें";
  if (state === "ready") return "अब सुनो";
  if (state === "playing") return "रोकें";
  if (state === "paused") return "आगे सुनो";
  if (state === "ended") return "फिर सुनो";
  if (state === "unavailable") return "फिर कोशिश करें";
  return "Bodh से सुनो";
}

function detachPlayerHandlers(player: ActivePlayer) {
  if (player.kind === "audio") {
    player.media.onplaying = null;
    player.media.onended = null;
    player.media.onerror = null;
  } else {
    player.utterance.onstart = null;
    player.utterance.onend = null;
    player.utterance.onerror = null;
  }
}

export function FractionConceptExplainer({ onFinish }: FractionConceptExplainerProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [proved, setProved] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceSource, setVoiceSource] = useState<VoiceSource>(null);
  const [activeBeatIndex, setActiveBeatIndex] = useState(-1);
  const stage = FRACTION_CONCEPT_STAGES[stageIndex];
  const isLastStage = stageIndex === FRACTION_CONCEPT_STAGES.length - 1;
  const visualState = useMemo(() => completedVisualState(stageIndex, proved), [stageIndex, proved]);
  const activeBeat = activeBeatIndex >= 0 ? stage.narration[activeBeatIndex] ?? null : null;
  const pointerBeat = activeBeat;
  const visibleKey = activeBeat?.key ?? stage.screenKey;
  const voiceAnnouncement = voiceState === "loading"
    ? "Bodh की आवाज़ तैयार हो रही है। तैयार होने पर फिर दबाएँ।"
    : voiceState === "ready"
      ? "Bodh की आवाज़ तैयार है। अब सुनो बटन फिर दबाएँ।"
      : voiceState === "unavailable"
        ? "आवाज़ उपलब्ध नहीं है। Bodh की पूरी बात नीचे पढ़ी जा सकती है।"
        : "";

  const runRef = useRef(0);
  const playerRef = useRef<ActivePlayer | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const clipCacheRef = useRef(new Map<string, Promise<string | null>>());
  const objectUrlsRef = useRef(new Set<string>());
  const remoteVoiceAvailableRef = useRef<boolean | null>(null);
  const preparedVoiceRef = useRef<PreparedVoice | null>(null);
  const stageIdRef = useRef(stage.id);
  const mountedRef = useRef(true);

  const settlePlayer = useCallback((player: ActivePlayer, result: PlaybackResult) => {
    if (playerRef.current !== player || player.run !== runRef.current) return;
    playerRef.current = null;
    detachPlayerHandlers(player);
    player.resolve(result);
  }, []);

  const cancelPlayer = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    playerRef.current = null;
    detachPlayerHandlers(player);
    if (player.kind === "audio") {
      player.media.pause();
      player.media.removeAttribute("src");
      player.media.load();
    } else if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
    player.resolve("cancelled");
  }, []);

  const stopNarration = useCallback(() => {
    runRef.current += 1;
    cancelPlayer();
    setVoiceState("idle");
    setVoiceSource(null);
    setActiveBeatIndex(-1);
  }, [cancelPlayer]);

  const loadClip = useCallback((stageId: string, beatId: string) => {
    const cacheKey = `${stageId}/${beatId}`;
    const cached = clipCacheRef.current.get(cacheKey);
    if (cached) return cached;
    if (remoteVoiceAvailableRef.current === false) return Promise.resolve(null);

    const request = fetch(
      `/api/narration/${FRACTION_NARRATION_VERSION}/${stageId}/${beatId}.mp3`,
      {
        headers: { accept: "audio/mpeg" },
        signal: AbortSignal.timeout(15_000),
      },
    )
      .then(async (response) => {
        if (!response.ok || !/^audio\//i.test(response.headers.get("content-type") || "")) {
          if (response.status === 503) remoteVoiceAvailableRef.current = false;
          clipCacheRef.current.delete(cacheKey);
          return null;
        }
        remoteVoiceAvailableRef.current = true;
        const objectUrl = URL.createObjectURL(await response.blob());
        if (!mountedRef.current) {
          URL.revokeObjectURL(objectUrl);
          return null;
        }
        objectUrlsRef.current.add(objectUrl);
        return objectUrl;
      })
      .catch(() => {
        clipCacheRef.current.delete(cacheKey);
        return null;
      });

    clipCacheRef.current.set(cacheKey, request);
    return request;
  }, []);

  const playAudio = useCallback((url: string, run: number, beatIndex: number) => new Promise<PlaybackResult>((resolve) => {
    if (run !== runRef.current) {
      resolve("cancelled");
      return;
    }

    const media = audioElementRef.current ?? new Audio();
    audioElementRef.current = media;
    media.src = url;
    media.preload = "auto";
    const player: ActivePlayer = { kind: "audio", media, run, resolve };
    playerRef.current = player;
    media.onplaying = () => {
      if (playerRef.current !== player || run !== runRef.current) return;
      setActiveBeatIndex(beatIndex);
      setVoiceSource("openai");
      setVoiceState("playing");
    };
    media.onended = () => settlePlayer(player, "ended");
    media.onerror = () => settlePlayer(player, "failed");

    media.load();
    void media.play()
      .catch(() => settlePlayer(player, "failed"));
  }), [settlePlayer]);

  const playDeviceSpeech = useCallback((text: string, run: number, beatIndex: number) => new Promise<PlaybackResult>((resolve) => {
    if (run !== runRef.current || typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve(run === runRef.current ? "failed" : "cancelled");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "hi-IN";
    utterance.rate = 0.88;
    utterance.pitch = 0.96;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith("hi")) ?? null;
    const player: ActivePlayer = { kind: "speech", utterance, run, resolve };
    playerRef.current = player;
    utterance.onstart = () => {
      if (playerRef.current !== player || run !== runRef.current) return;
      setActiveBeatIndex(beatIndex);
      setVoiceSource("device");
      setVoiceState("playing");
    };
    utterance.onend = () => settlePlayer(player, "ended");
    utterance.onerror = () => settlePlayer(player, "failed");
    window.speechSynthesis.speak(utterance);
  }), [settlePlayer]);

  const playNarration = useCallback(async (prepared: PreparedVoice) => {
    const run = runRef.current + 1;
    runRef.current = run;
    cancelPlayer();
    setProved(true);
    setActiveBeatIndex(-1);
    setVoiceSource(prepared.source);
    setVoiceState("loading");

    for (let index = 0; index < stage.narration.length; index += 1) {
      if (run !== runRef.current) return;
      const beat = stage.narration[index];
      const result = prepared.source === "openai" && prepared.urls?.[index]
        ? await playAudio(prepared.urls[index], run, index)
        : await playDeviceSpeech(beat.text, run, index);
      if (result === "cancelled" || run !== runRef.current) return;
      if (result === "failed") {
        setActiveBeatIndex(-1);
        if (prepared.source === "openai") {
          preparedVoiceRef.current = { stageId: stage.id, source: "device" };
          setVoiceSource("device");
          setVoiceState("ready");
        } else {
          setVoiceState("unavailable");
          setVoiceSource(null);
        }
        return;
      }
    }

    if (run === runRef.current) setVoiceState("ended");
  }, [cancelPlayer, playAudio, playDeviceSpeech, stage]);

  const prepareNarration = useCallback(async () => {
    const run = runRef.current + 1;
    runRef.current = run;
    cancelPlayer();
    setProved(true);
    setActiveBeatIndex(-1);
    setVoiceSource(null);
    setVoiceState("loading");

    const urls = await Promise.all(stage.narration.map((beat) => loadClip(stage.id, beat.id)));
    if (run !== runRef.current) return;

    if (urls.every((url): url is string => Boolean(url))) {
      preparedVoiceRef.current = { stageId: stage.id, source: "openai", urls };
      setVoiceSource("openai");
    } else {
      preparedVoiceRef.current = { stageId: stage.id, source: "device" };
      setVoiceSource("device");
    }
    setVoiceState("ready");
  }, [cancelPlayer, loadClip, stage]);

  const handleVoiceButton = () => {
    const player = playerRef.current;
    if (voiceState === "loading") {
      stopNarration();
      return;
    }
    if (voiceState === "playing" && player) {
      if (player.kind === "audio") player.media.pause();
      else window.speechSynthesis.pause();
      setVoiceState("paused");
      return;
    }
    if (voiceState === "paused" && player) {
      if (player.kind === "audio") {
        void player.media.play().catch(() => settlePlayer(player, "failed"));
      } else {
        window.speechSynthesis.resume();
        setVoiceState("playing");
      }
      return;
    }

    const prepared = preparedVoiceRef.current?.stageId === stage.id ? preparedVoiceRef.current : null;
    if (prepared) {
      void playNarration(prepared);
      return;
    }
    if (remoteVoiceAvailableRef.current === true) {
      void prepareNarration();
      return;
    }

    const deviceVoice: PreparedVoice = { stageId: stage.id, source: "device" };
    preparedVoiceRef.current = deviceVoice;
    void playNarration(deviceVoice);
  };

  const goBack = () => {
    stopNarration();
    if (proved) {
      setProved(false);
      return;
    }
    if (stageIndex > 0) {
      setStageIndex((current) => current - 1);
      setProved(true);
    }
  };

  const takePrimaryAction = () => {
    stopNarration();
    if (!proved) {
      setProved(true);
      return;
    }
    if (isLastStage) {
      onFinish();
      return;
    }
    setStageIndex((current) => current + 1);
    setProved(false);
  };

  useEffect(() => {
    stageIdRef.current = stage.id;
    remoteVoiceAvailableRef.current = null;
    const controller = new AbortController();
    const firstBeat = stage.narration[0];
    const path = `/api/narration/${FRACTION_NARRATION_VERSION}/${stage.id}/${firstBeat.id}.mp3`;
    void fetch(path, { method: "HEAD", signal: controller.signal })
      .then(async (response) => {
        if (stageIdRef.current !== stage.id) return;
        if (response.status === 200 && response.headers.get("x-bodh-voice-source") === "static") {
          remoteVoiceAvailableRef.current = true;
          const urls = await Promise.all(stage.narration.map((beat) => loadClip(stage.id, beat.id)));
          if (stageIdRef.current === stage.id && urls.every((url): url is string => Boolean(url))) {
            preparedVoiceRef.current = { stageId: stage.id, source: "openai", urls };
          }
          return;
        }
        remoteVoiceAvailableRef.current = response.status === 200 || response.status === 204;
      })
      .catch(() => {
        if (!controller.signal.aborted && stageIdRef.current === stage.id) {
          remoteVoiceAvailableRef.current = false;
        }
      });
    return () => controller.abort();
  }, [loadClip, stage]);

  useEffect(() => {
    mountedRef.current = true;
    const objectUrls = objectUrlsRef.current;
    return () => {
      mountedRef.current = false;
      runRef.current += 1;
      cancelPlayer();
      audioElementRef.current = null;
      for (const objectUrl of objectUrls) URL.revokeObjectURL(objectUrl);
    };
  }, [cancelPlayer]);

  return (
    <section className="atomic-explainer" aria-label="Fraction concept explainer">
      <header className="atomic-explainer-header">
        <div className="atomic-motion-note">
          <span aria-hidden="true" />
          <div>
            <strong>Bodh समझाएगा · चित्र दिखाएगा</strong>
            <small>आवाज़ तभी चलेगी जब तुम दबाओगे</small>
          </div>
        </div>
        <div className="atomic-voice-control">
          <button
            className="atomic-play"
            type="button"
            aria-pressed={voiceState === "playing" || voiceState === "paused"}
            aria-describedby="bodh-voice-disclosure"
            onClick={handleVoiceButton}
          >
            <span aria-hidden="true">{voiceState === "playing" ? "Ⅱ" : "▶"}</span>
            {voiceButtonLabel(voiceState)}
          </button>
          <small id="bodh-voice-disclosure">AI से बनी Bodh की आवाज़ · इंसान की recording नहीं</small>
        </div>
        <span className="atomic-voice-announcement" role="status" aria-live="polite" aria-atomic="true">
          {voiceAnnouncement}
        </span>
      </header>

      <ol className="atomic-progress" aria-label={`Concept step ${stageIndex + 1} of ${FRACTION_CONCEPT_STAGES.length}`}>
        {FRACTION_CONCEPT_STAGES.map((conceptStage, index) => {
          const state = index < stageIndex || (index === stageIndex && proved)
            ? "complete"
            : index === stageIndex
              ? "active"
              : "future";
          return <li className={`atomic-progress-${state}`} key={conceptStage.id}><span>{index + 1}</span></li>;
        })}
      </ol>

      <div className="atomic-explainer-grid">
        <div className="atomic-stage-copy">
          <span className="atomic-step-count">बात {stageIndex + 1} / {FRACTION_CONCEPT_STAGES.length}</span>
          <p className="atomic-eyebrow">{stage.eyebrow}</p>
          <h2>{stage.title}</h2>
          <p className="atomic-key-copy" aria-live="polite">{visibleKey}</p>
          <div className="atomic-speaking-line">
            <span className={voiceState === "playing" ? "atomic-wave-active" : ""} aria-hidden="true">•••</span>
            <small>
              {voiceState === "loading"
                ? "Bodh की आवाज़ तैयार हो रही है… तैयार होने पर फिर दबाओ"
                : voiceState === "ready"
                  ? voiceSource === "openai"
                    ? "शांत AI आवाज़ तैयार है—अब सुनो दबाओ"
                    : "इस डिवाइस की आवाज़ तैयार है—अब सुनो दबाओ"
                : voiceState === "playing"
                  ? `Bodh समझा रहा है · ${activeBeatIndex + 1}/${stage.narration.length}`
                  : voiceState === "paused"
                    ? "यहीं रुका है—जब चाहो आगे सुनो"
                    : voiceState === "unavailable"
                      ? "आवाज़ नहीं चली—नीचे पूरी बात पढ़ सकते हो"
                      : voiceSource === "device"
                        ? "इस डिवाइस की आवाज़ इस्तेमाल हुई"
                        : "Bodh से सुनो, या चित्र खुद चलाओ"}
            </small>
          </div>
          <details className="atomic-transcript" open={voiceState === "unavailable" || undefined}>
            <summary>Bodh की पूरी बात पढ़ें</summary>
            <div>
              {stage.narration.map((beat) => <p key={beat.id}>{beat.text}</p>)}
            </div>
          </details>
          <div className={`atomic-evidence ${proved ? "atomic-evidence-earned" : ""}`}>
            <span aria-hidden="true">{proved ? "✓" : "○"}</span>
            <div>
              <small>{proved ? "तुमने चित्र में देखा" : "पहले चित्र पर यह करके देखो"}</small>
              <strong>{proved ? stage.evidence : stage.action}</strong>
            </div>
          </div>
        </div>

        <FractionArtifact state={visualState} beat={pointerBeat} />
      </div>

      <footer className="atomic-actions">
        <button className="atomic-back" type="button" onClick={goBack} disabled={stageIndex === 0 && !proved}>
          <span aria-hidden="true">←</span> पीछे
        </button>
        {(voiceState === "playing" || voiceState === "paused" || voiceState === "loading") && (
          <span className="atomic-playing-status">
            {voiceState === "paused" ? "Bodh यहीं रुका है" : "आवाज़ और इशारा साथ चल रहे हैं"}
          </span>
        )}
        <button className="button button-primary atomic-primary" type="button" onClick={takePrimaryAction}>
          {!proved
            ? stage.action
            : isLastStage
              ? "अब खुद बनाकर देखें"
              : "अगली बात"}
          <span aria-hidden="true">→</span>
        </button>
      </footer>
    </section>
  );
}
