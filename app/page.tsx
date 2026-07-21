"use client";

import Link from "next/link";
import { BodhMark } from "./components/BodhMark";
import { HomepagePathfinder } from "./components/HomepagePathfinder";
import { JudgeLaneLink } from "./components/JudgeLaneLink";
import { NarrationLanguageToggle, useNarrationLanguage } from "./components/NarrationLanguageToggle";
import styles from "./home.module.css";

function FractionTile({ value }: { value: "1/4" | "1/8" }) {
  const [numerator, denominator] = value.split("/");
  return (
    <span className={styles.fractionTile} aria-hidden="true">
      <span>{numerator}</span>
      <i />
      <span>{denominator}</span>
    </span>
  );
}

export default function Home() {
  const language = useNarrationLanguage();
  const english = language === "en";

  return (
    <main className={`site-shell ${styles.page}`} id="main-content" lang={language}>
      <header className={`site-header ${styles.header}`} aria-label="Bodh header">
        <Link className="brand" href="/" aria-label="Bodh home">
          <BodhMark size="mark" motion="still" priority />
          <span className="brand-copy">
            <strong>BODH</strong>
            <span lang="en">That which is truly understood</span>
          </span>
        </Link>
        <NarrationLanguageToggle />
      </header>

      <section className={styles.hero} aria-labelledby="hero-title">
        <span className={`${styles.orbit} ${styles.orbitPink}`} aria-hidden="true" />
        <span className={`${styles.orbit} ${styles.orbitOlive}`} aria-hidden="true" />
        <span className={styles.oliveDot} aria-hidden="true" />

        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>{english ? "Hindi-first · Concept-first" : "Hindi-first · Concept-first"}</span>
          <h1 id="hero-title" className={styles.wordmark}>BODH</h1>
          <p className={styles.tagline} lang="en">That which is truly understood</p>
          <p className={styles.promise}>
            {english ? "Bring your question. Leave with understanding." : "अपना सवाल लाओ। समझकर वापस जाओ।"}
          </p>
          <p className={styles.intro}>
            {english
              ? "Tell Bodh what feels confusing—in Hindi, Hinglish, or English. Together, you will find the small idea underneath and rebuild it visually."
              : "Hindi, Hinglish या English में बताओ कि कहाँ confusion है। Bodh नीचे छुपी छोटी idea ढूँढकर उसे pictures के साथ फिर से बनाता है।"}
          </p>

          <div className={styles.actions}>
            <Link className="button button-primary" href="/diagnose">
              {english ? "Understand my question" : "अपना सवाल समझें"}
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="button button-secondary" href="/how-it-works">
              {english ? "See how Bodh helps" : "देखें Bodh कैसे मदद करता है"}
            </Link>
          </div>

          <div className={styles.trust} aria-label={english ? "Bodh learner fit" : "Bodh learner fit"}>
            <span><i aria-hidden="true" />{english ? "Grounded in Marble concepts" : "Marble concepts पर आधारित"}</span>
            <span><i aria-hidden="true" />{english ? "Built for ages 8–12" : "उम्र 8–12 के लिए"}</span>
          </div>
          <JudgeLaneLink />
        </div>

        <Link
          className={styles.teachingScene}
          href="/demo"
          aria-label={english
            ? "Open the curated fraction demo: see three quarters as six eighths"
            : "Curated fraction demo खोलें: तीन चौथाई को छह eighths की तरह देखें"}
        >
          <div className={styles.sceneTop}>
            <span lang="en">Curated demo · Fraction journey</span>
            <span>{english ? "Open journey" : "Journey खोलें"} <b aria-hidden="true">→</b></span>
          </div>

          <div className={styles.sceneCanvas} aria-hidden="true">
            <div className={styles.lessonLabel}>
              <small>{english ? "Same amount, smaller pieces" : "वही amount, छोटे pieces"}</small>
              <strong>3/4 = 6/8</strong>
            </div>

            <div className={styles.fractionBoard}>
              <div className={styles.quarterLabel}><span>3/4</span></div>
              <div className={styles.quarterRail}>
                {Array.from({ length: 4 }, (_, index) => (
                  <span className={index < 3 ? styles.quarterFilled : ""} key={index} />
                ))}
              </div>
              <div className={styles.eighthRail}>
                {Array.from({ length: 8 }, (_, index) => (
                  <span className={index < 6 ? styles.eighthFilled : styles.eighthEmpty} key={index}>
                    <FractionTile value="1/8" />
                  </span>
                ))}
              </div>
            </div>

            <BodhMark className={styles.heroMascot} pose="tinker" size="hero" motion="tinker" priority />
            <span className={styles.pointer} />
          </div>

          <div className={styles.sceneCaption}>
            <div>
              <span>{english ? "Today's demo doubt" : "आज का demo doubt"}</span>
              <strong>{english ? "See 3/4 as eighths" : "3/4 को eighths में देखें"}</strong>
            </div>
            <blockquote lang={language}>
              {english
                ? "“Why do we flip it and multiply?”"
                : "“उल्टा करके multiply क्यों करते हैं?”"}
            </blockquote>
          </div>
        </Link>
      </section>

      <section className={styles.scienceBridge} aria-labelledby="science-bridge-title">
        <div className={styles.scienceCopy}>
          <span className={styles.scienceKicker}>
            <i aria-hidden="true" />
            {english ? "Science works here, too" : "Bodh science भी समझता है"}
          </span>
          <h2 id="science-bridge-title">
            {english ? "A puddle shrinks. Did the water vanish?" : "धूप में puddle छोटा हुआ। पानी गया कहाँ?"}
          </h2>
          <p>
            {english
              ? "Bodh listens to the child’s idea, then helps them track one drop—from puddle, to air, to cloud."
              : "Bodh पहले बच्चे की idea सुनता है, फिर एक बूंद को puddle से हवा और cloud तक track करने में मदद करता है।"}
          </p>

          <div className={styles.scienceFact} role="note">
            <span className={styles.scienceFactMark} aria-hidden="true"><i /></span>
            <p>
              <strong>{english ? "Invisible does not mean gone." : "न दिखना, खत्म होना नहीं है।"}</strong>
              {english
                ? " Real water vapour is invisible. The dots in this picture are Bodh’s tracker view—not what our eyes actually see."
                : " असली जलवाष्प दिखाई नहीं देती। इस picture के dots Bodh का tracker view हैं—वे आँखों को सच में नहीं दिखते।"}
            </p>
          </div>

          <div className={styles.scienceActions}>
            <Link className="button button-primary" href="/diagnose#seeded-doubt">
              {english ? "Try a real science doubt" : "असली science doubt आज़माएँ"}
              <span aria-hidden="true">→</span>
            </Link>
            <Link className={styles.scienceJourneyLink} href="/science/evaporation">
              {english ? "Walk through evaporation" : "Evaporation journey देखें"}
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <small className={styles.scienceHint}>
            {english ? "In examples, choose “Puddle water”." : "Examples में “Puddle water” चुनें।"}
          </small>
        </div>

        <div
          className={styles.scienceVisual}
          role="img"
          aria-label={english
            ? "A warm puddle becomes invisible water vapour, shown only through Bodh’s tracker dots, then gathers in a cool cloud."
            : "गरम puddle का पानी अदृश्य जलवाष्प बनता है, Bodh के tracker dots से दिखाया गया है, फिर ठंडे cloud में इकट्ठा होता है।"}
        >
          <div className={styles.sciencePrompt} aria-hidden="true">
            <span>{english ? "TRACK ONE DROP" : "एक बूंद TRACK करें"}</span>
            <strong>{english ? "Where did it go?" : "यह गई कहाँ?"}</strong>
          </div>

          <div className={styles.scienceFlow} aria-hidden="true">
            <span className={`${styles.scienceConnector} ${styles.scienceConnectorOne}`} />
            <span className={`${styles.scienceConnector} ${styles.scienceConnectorTwo}`} />

            <div className={styles.scienceStep}>
              <div className={styles.puddleScene}>
                <span className={styles.scienceSun} />
                <span className={styles.sciencePuddle}><i /></span>
              </div>
              <span className={styles.scienceStepCount}>1</span>
              <b>{english ? "Warm puddle" : "गरम puddle"}</b>
            </div>

            <div className={`${styles.scienceStep} ${styles.trackerStep}`}>
              <div className={styles.trackerScene}>
                <span className={styles.trackerHalo} />
                <span className={`${styles.vapourDot} ${styles.vapourDotOne}`} />
                <span className={`${styles.vapourDot} ${styles.vapourDotTwo}`} />
                <span className={`${styles.vapourDot} ${styles.vapourDotThree}`} />
                <BodhMark className={styles.scienceBodh} pose="guide" size="medium" motion="guide" />
              </div>
              <span className={styles.scienceStepCount}>2</span>
              <b>{english ? "Bodh’s tracker" : "Bodh tracker"}</b>
              <small>{english ? "vapour is invisible" : "vapour अदृश्य है"}</small>
            </div>

            <div className={styles.scienceStep}>
              <div className={styles.cloudScene}>
                <span className={styles.scienceCloud} />
                <span className={`${styles.cloudDrop} ${styles.cloudDropOne}`} />
                <span className={`${styles.cloudDrop} ${styles.cloudDropTwo}`} />
                <span className={`${styles.cloudDrop} ${styles.cloudDropThree}`} />
              </div>
              <span className={styles.scienceStepCount}>3</span>
              <b>{english ? "Cool cloud" : "ठंडा cloud"}</b>
            </div>
          </div>

          <div className={styles.trackerLegend} aria-hidden="true">
            <span><i />{english ? "Bodh’s tracker view" : "Bodh का tracker view"}</span>
            <b>{english ? "not visible to our eyes" : "आँखों को नहीं दिखता"}</b>
          </div>
        </div>
      </section>

      <section className={styles.method} aria-labelledby="method-title">
        <div className={styles.methodIntro}>
          <div>
            <span className={styles.eyebrow}>{english ? "One mentor · Three roles" : "एक mentor · तीन भूमिकाएँ"}</span>
            <h2 id="method-title">{english ? "Bodh meets the child where the confusion begins." : "Bodh वहीं मिलता है जहाँ confusion शुरू होता है।"}</h2>
          </div>
          <p>{english
            ? "Listen without judgment. Find the hidden prerequisite. Tinker with one visual idea until it clicks."
            : "बिना judge किए सुनना। छुपी prerequisite ढूँढना। एक visual idea के साथ तब तक खेलना, जब तक वह सच में समझ न आए।"}</p>
        </div>

        <div className={styles.roleGrid} role="list" aria-label={english ? "How Bodh helps" : "Bodh कैसे मदद करता है"}>
          <article className={`${styles.roleCard} ${styles.listenerCard}`} role="listitem">
            <span className={styles.rolePill}><b aria-hidden="true">1</b>{english ? "The listener" : "ध्यान से सुनने वाला"}</span>
            <BodhMark className={styles.listenerMascot} pose="listen" size="small" motion="listen" />
            <div className={styles.roleCopy}>
              <span className={styles.speechBubble}>{english ? "Tell me what feels strange." : "बताओ, क्या अजीब लग रहा है?"}</span>
              <h3>{english ? "First, preserve the child's words." : "पहले, बच्चे की अपनी बात बचाओ।"}</h3>
              <p>{english
                ? "Bodh listens for the reasoning beneath the answer—not a label like ‘wrong’."
                : "Bodh answer के नीचे की reasoning सुनता है—‘गलत’ जैसा label नहीं लगाता।"}</p>
            </div>
          </article>

          <HomepagePathfinder language={language} />

          <article className={`${styles.roleCard} ${styles.tinkererCard}`} role="listitem">
            <span className={styles.rolePill}><b aria-hidden="true">3</b>{english ? "The gentle tinkerer" : "प्यार से साथ बनाने वाला"}</span>
            <div className={styles.tinkerStage} aria-hidden="true">
              <BodhMark className={styles.tinkerMascot} pose="tinker" size="small" motion="tinker" />
              <div className={styles.quarterTiles}>
                {Array.from({ length: 4 }, (_, index) => (
                  <span className={index === 1 ? styles.liftedTile : ""} key={index}>
                    <FractionTile value="1/4" />
                  </span>
                ))}
              </div>
            </div>
            <div className={styles.roleCopy}>
              <h3>{english ? "Build it, try it, then transfer it." : "बनाओ, आज़माओ, फिर नई जगह लगाओ।"}</h3>
              <p>{english
                ? "Bodh changes the picture and prompt—not the child's dignity—until the idea becomes usable."
                : "Bodh picture और prompt बदलता है—बच्चे की dignity नहीं—जब तक idea इस्तेमाल करने लायक न हो जाए।"}</p>
            </div>
          </article>
        </div>

        <div className={styles.traitLine} aria-label="Bodh qualities">
          <span><i className={styles.gentle} aria-hidden="true" />Gentle</span>
          <b aria-hidden="true" />
          <span><i className={styles.curious} aria-hidden="true" />Curious</span>
          <b aria-hidden="true" />
          <span><i className={styles.understanding} aria-hidden="true" />Understanding</span>
        </div>

        <div className={styles.methodAction}>
          <p>{english ? "Every journey begins with one honest doubt." : "हर journey एक सच्चे doubt से शुरू होती है।"}</p>
          <Link className="button button-primary" href="/diagnose">
            {english ? "Show Bodh where I'm stuck" : "Bodh को बताएं कहाँ अटके हैं"}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <footer className={`site-footer ${styles.footer}`}>
        <span>{english ? "Concept grounding with the Marble Skill Taxonomy" : "Marble Skill Taxonomy से concept grounding"}</span>
        <span aria-hidden="true">•</span>
        <span lang="en">Built for learners aged 8–12</span>
      </footer>
    </main>
  );
}
