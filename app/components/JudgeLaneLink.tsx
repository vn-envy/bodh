"use client";

import Link from "next/link";
import { SELECTED_JUDGE_SEED } from "../../lib/judge-experience";
import { setNarrationLanguage } from "./NarrationLanguageToggle";
import styles from "./JudgeExperience.module.css";

export function JudgeLaneLink() {
  return (
    <Link
      className={styles.laneLink}
      href={SELECTED_JUDGE_SEED.tourHref}
      lang="en"
      onClick={() => setNarrationLanguage("en")}
    >
      <span className={styles.laneDot} aria-hidden="true" />
      <span>
        <span className={styles.laneLabel}>Evaluating Bodh?</span>
        {" · "}90-second guided path
      </span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}
