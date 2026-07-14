"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { HERO_FIXTURE, isCorrectWholeNumberAnswer, isLabComplete } from "../../lib/phase1-fixture";
import { BodhMark } from "../components/BodhMark";
import { LearningStrip } from "../components/LearningStrip";
import { ProgressPath } from "../components/ProgressPath";

type JourneyStep = "confirm" | "path" | "probe" | "lab" | "transfer" | "return" | "receipt";
type CheckState = "idle" | "try-again" | "correct";

const probeOptions = [
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "8", label: "8" },
];

function progressFor(step: JourneyStep) {
  if (step === "confirm") return 1;
  if (step === "path" || step === "probe") return 2;
  if (step === "lab") return 3;
  return 4;
}

export function DemoJourney() {
  const [step, setStep] = useState<JourneyStep>("confirm");
  const [probeAnswer, setProbeAnswer] = useState<string | null>(null);
  const [tileSelected, setTileSelected] = useState(false);
  const [placedSlots, setPlacedSlots] = useState<number[]>([]);
  const [transferAnswer, setTransferAnswer] = useState("");
  const [returnAnswer, setReturnAnswer] = useState("");
  const [transferState, setTransferState] = useState<CheckState>("idle");
  const [returnState, setReturnState] = useState<CheckState>("idle");
  const stageHeadingRef = useRef<HTMLHeadingElement>(null);

  const labComplete = useMemo(() => isLabComplete(placedSlots), [placedSlots]);

  useEffect(() => {
    stageHeadingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const chooseProbe = (value: string) => setProbeAnswer(value);
  const placeTile = (slot: number) => {
    if (!tileSelected || slot >= HERO_FIXTURE.targetSlots || placedSlots.includes(slot)) return;
    setPlacedSlots((current) => [...current, slot]);
  };

  const checkTransfer = () => {
    setTransferState(
      isCorrectWholeNumberAnswer(transferAnswer, HERO_FIXTURE.transferAnswer) ? "correct" : "try-again",
    );
  };

  const checkReturn = () => {
    setReturnState(
      isCorrectWholeNumberAnswer(returnAnswer, HERO_FIXTURE.originalAnswer) ? "correct" : "try-again",
    );
  };

  return (
    <main className="journey-shell" id="main-content">
      <header className="journey-header">
        <Link className="back-link" href="/" aria-label="Bodh home पर वापस जाएँ">
          <span aria-hidden="true">←</span> वापस
        </Link>
        <Link className="brand brand-compact" href="/" aria-label="Bodh home">
          <BodhMark size="mark" motion="still" priority />
          <span className="brand-copy"><strong>BODH</strong></span>
        </Link>
        <span className="fixture-label">Curated demo</span>
      </header>

      <ProgressPath active={progressFor(step)} />

      <section className="journey-stage" aria-live="polite">
        {step === "confirm" && (
          <article className="journey-card journey-card-confirm">
            <div className="stage-topline">
              <span className="eyebrow">तुम्हारा सवाल</span>
              <span className="stage-counter">1 / 4</span>
            </div>
            <div className="stage-with-bodh">
              <div>
                <h1 ref={stageHeadingRef} tabIndex={-1}>पहले जाँच लें कि हमने सही सुना।</h1>
                <p className="stage-lead">तुम्हारा original सवाल और तुम्हारे शब्द, बिल्कुल वैसे ही रखे गए हैं।</p>
              </div>
              <BodhMark pose="listen" size="medium" motion="listen" />
            </div>
            <div className="confirmed-equation journey-equation" aria-label="three quarters divided by one eighth">
              <span>3/4</span><span>÷</span><span>1/8</span><span>= ?</span>
            </div>
            <div className="reasoning-box">
              <span className="reasoning-label">तुमने कहा</span>
              <p>“{HERO_FIXTURE.learnerReasoning}”</p>
            </div>
            <p className="calm-note">Bodh तुम्हें grade नहीं कर रहा। वह बस यह देख रहा है कि कौन-सी छोटी idea पहले काम आएगी।</p>
            <button className="button button-primary journey-primary" type="button" onClick={() => setStep("path")}>
              हाँ, यही मेरा सवाल है <span aria-hidden="true">→</span>
            </button>
          </article>
        )}

        {step === "path" && (
          <article className="journey-card journey-card-path">
            <div className="stage-topline">
              <span className="eyebrow">छुपी हुई idea</span>
              <span className="stage-counter">2 / 4</span>
            </div>
            <div className="stage-with-bodh">
              <div>
                <h1 ref={stageHeadingRef} tabIndex={-1}>शायद हमें इस छोटी-सी idea को पहले देखना चाहिए।</h1>
                <p className="stage-lead">यह कोई कमी नहीं है—बस एक connection है जो अभी दिखाई नहीं दिया।</p>
              </div>
              <BodhMark pose="guide" size="medium" motion="guide" />
            </div>
            <ol className="journey-concept-path">
              <li className="concept-node node-olive">
                <span>1</span>
                <div><strong>1/8 एक size है</strong><small>इकाई भिन्न · unit fraction</small></div>
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
            <div className="concept-evidence-row">
              <LearningStrip total={8} filled={1} unit="1/8" label="एक इकाई भिन्न" tone="olive" compact showUnits={false} />
              <LearningStrip total={8} filled={6} unit="1/8" label="3/4 = six eighths" tone="peach" compact showUnits={false} />
            </div>
            <div className="path-reason">
              <strong>क्यों यह रास्ता?</strong>
              <span>तुम्हारा सवाल rule के बारे में है; पहले हम rule के पीछे की grouping देखेंगे।</span>
            </div>
            <button className="button button-primary journey-primary" type="button" onClick={() => setStep("probe")}>
              एक छोटी जाँच करें <span aria-hidden="true">→</span>
            </button>
          </article>
        )}

        {step === "probe" && (
          <article className="journey-card journey-card-probe">
            <div className="stage-topline">
              <span className="eyebrow">एक छोटी जाँच</span>
              <span className="stage-counter">2 / 4</span>
            </div>
            <div className="stage-with-bodh">
              <div>
                <h1 ref={stageHeadingRef} tabIndex={-1}>एक whole में कितने 1/4 आते हैं?</h1>
                <p className="stage-lead">यह test नहीं है। इससे Bodh को सही picture चुनने में मदद मिलती है।</p>
              </div>
              <BodhMark
                pose={probeAnswer === "4" ? "celebrate" : "listen"}
                size="medium"
                motion={probeAnswer === "4" ? "celebrate" : "listen"}
              />
            </div>
            <LearningStrip total={4} filled={4} unit="1/4" label="एक पूरा whole" tone="blue" compact />
            <div className="probe-options" role="group" aria-label="एक whole में कितने एक बटे चार">
              {probeOptions.map((option) => (
                <button
                  className={`probe-option ${probeAnswer === option.value ? "probe-option-selected" : ""}`}
                  type="button"
                  key={option.value}
                  aria-pressed={probeAnswer === option.value}
                  onClick={() => chooseProbe(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {probeAnswer && (
              <div className={`probe-response ${probeAnswer === "4" ? "probe-response-right" : ""}`}>
                {probeAnswer === "4"
                  ? "हाँ—चार बराबर 1/4 मिलकर एक whole बनाते हैं। अब यही सोच 1/8 और 3/4 पर लगाएँ।"
                  : "करीब है। एक whole को चार बराबर हिस्सों में बाँटकर फिर देखो—तुम answer बदल सकते हो।"}
              </div>
            )}
            <button
              className="button button-primary journey-primary"
              type="button"
              disabled={probeAnswer !== "4"}
              onClick={() => setStep("lab")}
            >
              यही idea अपने सवाल पर लगाएँ <span aria-hidden="true">→</span>
            </button>
          </article>
        )}

        {step === "lab" && (
          <article className="journey-card journey-card-lab">
            <div className="stage-topline">
              <span className="eyebrow">खुद करके देखो</span>
              <span className="stage-counter">3 / 4</span>
            </div>
            <div className="stage-with-bodh stage-with-bodh-lab">
              <div>
                <h1 ref={stageHeadingRef} tabIndex={-1}>3/4 के अंदर कितने 1/8 पूरे-पूरा बैठते हैं?</h1>
                <p className="stage-lead">पहले एक tile चुनो, फिर peach वाली जगहों पर tap करके उसे रखो।</p>
              </div>
              <BodhMark
                pose={labComplete ? "celebrate" : "tinker"}
                size="medium"
                motion={labComplete ? "celebrate" : "tinker"}
              />
            </div>
            <div className="lab-equation" aria-live="polite">
              <span>{placedSlots.length || "?"}</span> × <span>1/8</span> = <span>3/4</span>
            </div>
            <button
              className={`tile-picker ${tileSelected ? "tile-picker-selected" : ""}`}
              type="button"
              aria-pressed={tileSelected}
              onClick={() => setTileSelected(true)}
            >
              <span className="tile-swatch">1/8</span>
              {tileSelected ? "Tile चुना गया है—अब जगह tap करो" : "एक 1/8 tile चुनें"}
            </button>
            <div className="fraction-bar-wrap">
              <div className="fraction-bar-labels" aria-hidden="true"><span>3/4</span><span>पूरा whole</span></div>
              <div className="fraction-bar-scroll">
                <div className="fraction-bar" aria-label="eight-part whole with three-quarters available for tiles">
                  {Array.from({ length: HERO_FIXTURE.totalSlots }, (_, slot) => {
                    const inTarget = slot < HERO_FIXTURE.targetSlots;
                    const placed = placedSlots.includes(slot);
                    return (
                      <button
                        className={`fraction-slot ${inTarget ? "fraction-slot-target" : "fraction-slot-outside"} ${placed ? "fraction-slot-placed" : ""}`}
                        type="button"
                        key={slot}
                        disabled={!inTarget || placed || !tileSelected}
                        aria-label={
                          placed
                            ? `जगह ${slot + 1}: एक बटे आठ रखा गया`
                            : inTarget
                              ? `जगह ${slot + 1} में एक बटे आठ रखें`
                              : `जगह ${slot + 1}, तीन बटे चार से बाहर`
                        }
                        onClick={() => placeTile(slot)}
                      >
                        {placed && <span>1/8</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {labComplete && (
              <div className="lab-success">
                <strong>तुमने देख लिया:</strong> 3/4 में छह 1/8 बैठते हैं। इसलिए <span>3/4 ÷ 1/8 = 6</span>।
              </div>
            )}
            <div className="lab-actions">
              <button className="quiet-action" type="button" onClick={() => setPlacedSlots([])}>फिर से देखें</button>
              <button className="button button-primary journey-primary" type="button" disabled={!labComplete} onClick={() => setStep("transfer")}>
                एक नए सवाल में आज़माएँ <span aria-hidden="true">→</span>
              </button>
            </div>
          </article>
        )}

        {step === "transfer" && (
          <article className="journey-card journey-card-transfer">
            <div className="stage-topline">
              <span className="eyebrow">अब एक नया सवाल</span>
              <span className="stage-counter">4 / 4</span>
            </div>
            <div className="stage-with-bodh">
              <div>
                <h1 ref={stageHeadingRef} tabIndex={-1}>क्या वही idea नई कहानी में भी काम करती है?</h1>
                <p className="stage-lead">पहले अपने दम पर कोशिश करो। जरूरत हुई तो वही tool वापस आएगा।</p>
              </div>
              <BodhMark
                pose={transferState === "correct" ? "celebrate" : "guide"}
                size="medium"
                motion={transferState === "correct" ? "celebrate" : "guide"}
              />
            </div>
            <div className="word-problem">
              <p>{HERO_FIXTURE.transferProblem}</p>
              <strong>2/3 ÷ 1/6 = ?</strong>
            </div>
            <LearningStrip total={6} filled={4} unit="1/6" label="2/3 को sixths में देखें" tone="olive" compact />
            <label className="answer-field">
              <span>तुम्हारा जवाब</span>
              <input
                inputMode="numeric"
                value={transferAnswer}
                onChange={(event) => {
                  setTransferAnswer(event.target.value);
                  setTransferState("idle");
                }}
                aria-describedby="transfer-feedback"
                placeholder="जैसे 4"
              />
            </label>
            {transferState === "try-again" && (
              <p className="answer-feedback" id="transfer-feedback">एक बार वही representation देखो: 2/3 = 4/6. अब 1/6 के कितने groups दिखते हैं?</p>
            )}
            {transferState === "correct" && (
              <p className="answer-feedback answer-feedback-correct" id="transfer-feedback">तुमने नई कहानी में भी वही relationship पहचान लिया।</p>
            )}
            <button
              className="button button-primary journey-primary"
              type="button"
              onClick={transferState === "correct" ? () => setStep("return") : checkTransfer}
            >
              {transferState === "correct" ? "अब अपना पहला सवाल करें" : "अपना जवाब जाँचें"} <span aria-hidden="true">→</span>
            </button>
          </article>
        )}

        {step === "return" && (
          <article className="journey-card journey-card-return">
            <div className="stage-topline">
              <span className="eyebrow">वही सवाल, अब तुम्हारी समझ के साथ</span>
              <span className="stage-counter">4 / 4</span>
            </div>
            <div className="stage-with-bodh">
              <h1 ref={stageHeadingRef} tabIndex={-1}>अब वही सवाल—लेकिन idea तुम्हारे पास है।</h1>
              <BodhMark
                pose={returnState === "correct" ? "celebrate" : "listen"}
                size="medium"
                motion={returnState === "correct" ? "celebrate" : "listen"}
              />
            </div>
            <div className="confirmed-equation journey-equation">
              <span>3/4</span><span>÷</span><span>1/8</span><span>= ?</span>
            </div>
            <label className="answer-field">
              <span>तुम्हारा जवाब</span>
              <input
                inputMode="numeric"
                value={returnAnswer}
                onChange={(event) => {
                  setReturnAnswer(event.target.value);
                  setReturnState("idle");
                }}
                aria-describedby="return-feedback"
                placeholder="जैसे 6"
              />
            </label>
            {returnState === "try-again" && (
              <p className="answer-feedback" id="return-feedback">एक hint: सोचो कि 3/4 के अंदर कितने 1/8 पूरे-पूरा बैठते हैं।</p>
            )}
            {returnState === "correct" && (
              <p className="answer-feedback answer-feedback-correct" id="return-feedback">हाँ। तुमने rule नहीं, relationship इस्तेमाल किया।</p>
            )}
            <button
              className="button button-primary journey-primary"
              type="button"
              onClick={returnState === "correct" ? () => setStep("receipt") : checkReturn}
            >
              {returnState === "correct" ? "आज की समझ देखें" : "अपना जवाब जाँचें"} <span aria-hidden="true">→</span>
            </button>
          </article>
        )}

        {step === "receipt" && (
          <article className="journey-card journey-card-receipt">
            <div className="receipt-heading">
              <BodhMark pose="celebrate" size="medium" motion="celebrate" />
              <div>
                <span className="eyebrow">आज सच में क्या समझा</span>
                <h1 ref={stageHeadingRef} tabIndex={-1}>तुमने एक idea को दो अलग सवालों में इस्तेमाल किया।</h1>
              </div>
            </div>
            <div className="receipt-artifacts">
              <LearningStrip total={8} filled={6} unit="1/8" label="तुम्हारा fraction evidence" tone="peach" compact showUnits={false} />
              <LearningStrip total={6} filled={4} unit="1/6" label="तुम्हारा transfer evidence" tone="olive" compact showUnits={false} />
            </div>
            <div className="receipt-grid">
              <section>
                <span>IDEA</span>
                <strong>Division पूछ सकती है: इस size के कितने groups यहाँ fit होते हैं?</strong>
              </section>
              <section>
                <span>तुमने evidence दिया</span>
                <strong>तुमने 3/4 में छह 1/8 रखे और 2/3 में चार 1/6 groups पहचाने।</strong>
              </section>
              <section>
                <span>शब्द जो याद रखें</span>
                <strong>इकाई भिन्न <em>(unit fraction)</em></strong>
              </section>
            </div>
            <div className="receipt-problems">
              <span>तुम्हारा original: <strong>3/4 ÷ 1/8 = 6</strong></span>
              <span>तुम्हारा transfer: <strong>2/3 ÷ 1/6 = 4</strong></span>
            </div>
            <Link className="button button-primary journey-primary" href="/">
              एक और doubt <span aria-hidden="true">→</span>
            </Link>
          </article>
        )}
      </section>
    </main>
  );
}
