import type { NarrationLanguage } from "../../lib/narration-language";

const stages = {
  hi: ["देखें", "समझें", "आज़माएँ", "खुद करें"],
  en: ["Check", "Understand", "Try", "Do it yourself"],
} as const;

export function ProgressPath({
  active = 1,
  language = "hi",
}: {
  active?: number;
  language?: NarrationLanguage;
}) {
  return (
    <ol
      className="progress-path"
      aria-label={language === "hi" ? "सीखने की journey" : "Learning journey"}
      lang={language}
    >
      {stages[language].map((stage, index) => {
        const position = index + 1;
        const state = position < active ? "complete" : position === active ? "active" : "future";
        return (
          <li
            className={`progress-stage progress-stage-${state}`}
            key={stage}
            aria-current={state === "active" ? "step" : undefined}
          >
            <span className="progress-dot" aria-hidden="true" />
            <span>{stage}</span>
          </li>
        );
      })}
    </ol>
  );
}
