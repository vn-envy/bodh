"use client";

import Link from "next/link";
import { JUDGE_TOUR_HREF } from "../../lib/judge-experience";
import { setNarrationLanguage } from "./NarrationLanguageToggle";
import styles from "./JudgeExperience.module.css";

export function JudgeLaneLink() {
  return (
    <Link
      className={styles.laneLink}
      href={JUDGE_TOUR_HREF}
      lang="en"
      onClick={() => setNarrationLanguage("en")}
    >
      <span className={styles.laneDot} aria-hidden="true" />
      <span>
        <span className={styles.laneLabel}>Evaluating Bodh?</span>
        {" · "}Maths + science · one guided journey
      </span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}
