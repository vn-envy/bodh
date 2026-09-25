"use client";

import Link from "next/link";
import type { NarrationLanguage } from "../../lib/narration-language";
import { dueStatements, statementState } from "../../lib/understanding-evidence";
import { useClimbClock, useUnderstandingLedger } from "../climb/understanding-ledger-store";
import { BodhMark } from "./BodhMark";
import styles from "./ClimbInvite.module.css";

const FACETS = [
  { hi: ["देखो", "Picture में पहचानो और बनाओ"], en: ["See it", "Spot it and build it in a picture"] },
  { hi: ["समझाओ", "\"क्यों?\"—और कौन सही है"], en: ["Explain it", "Say why—and who is right"] },
  { hi: ["लगाओ", "नई कहानी, नए numbers"], en: ["Use it", "A new story, new numbers"] },
  { hi: ["टिकाओ", "एक दिन बाद, फिर कुछ दिन बाद"], en: ["Keep it", "A day later, then days later"] },
] as const;

export function ClimbInvite({ language }: { language: NarrationLanguage }) {
  const ledger = useUnderstandingLedger();
  const now = useClimbClock();
  const due = now > 0 ? dueStatements(ledger, now).length : 0;
  const firm = Object.values(ledger.statements).filter((record) => {
    const state = statementState(record);
    return state === "firm" || state === "lasting";
  }).length;

  return (
    <section className={styles.invite} aria-labelledby="climb-invite-title">
      <div className={styles.copy}>
        <span className={styles.kicker}>{language === "hi" ? "वही Marble curriculum · 54 evidence statements" : "The same Marble curriculum · 54 evidence statements"}</span>
        <h2 id="climb-invite-title">{language === "hi" ? "एक बार समझना काफी नहीं। समझ टिकनी चाहिए।" : "Understanding once is not enough. It has to last."}</h2>
        <p>{language === "hi"
          ? "Understanding Climb हर Marble topic के तीन evidence statements को तीन तरह से जाँचता है, पूछता है कि तुम कितने पक्के हो, और गलत-पर-पक्के जवाब पर एक कदम नीचे असली prerequisite तक ले जाता है।"
          : "The Understanding Climb checks each Marble topic's three evidence statements three ways, asks how sure you feel, and when a confident answer misses, steps down to the real prerequisite."}</p>
        <ol className={styles.facets}>
          {FACETS.map((facet, index) => (
            <li key={facet.en[0]}><b>{index + 1}</b><strong>{facet[language][0]}</strong><span>{facet[language][1]}</span></li>
          ))}
        </ol>
        <div className={styles.actions}>
          <Link className="button button-primary" href="/climb">
            {due > 0
              ? (language === "hi" ? `आज की ${due} याद-जाँच करें` : `Do today's ${due} memory ${due === 1 ? "check" : "checks"}`)
              : (language === "hi" ? "समझ की चढ़ाई शुरू करें" : "Start the Understanding Climb")}
            <span aria-hidden="true">→</span>
          </Link>
          {firm > 0 && <span className={styles.progress}>{language === "hi" ? `${firm} evidence पक्के · इसी device पर` : `${firm} evidence ${firm === 1 ? "statement" : "statements"} firm · on this device`}</span>}
        </div>
      </div>
      <div className={styles.visual} aria-hidden="true">
        <div className={styles.hill}>
          {[3, 2, 1].map((tier) => (
            <span className={styles[`tier${tier}`]} key={tier}>
              {Array.from({ length: 3 }, (_, dot) => <i className={dot < 4 - tier ? styles.dotFirm : ""} key={dot} />)}
            </span>
          ))}
        </div>
        <BodhMark className={styles.bodh} pose="guide" size="medium" motion="guide" />
      </div>
    </section>
  );
}
