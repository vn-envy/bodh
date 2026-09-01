import { authoredLanguageFor, type NarrationLanguage } from "../../lib/narration-language";
import { BodhMark, type BodhPose } from "./BodhMark";

const stages = {
  hi: ["सवाल", "समझो", "बनाओ", "नया सवाल", "फिर अपना सवाल"],
  en: ["Question", "Understand", "Build", "New question", "Yours again"],
} as const;

const poses = ["listen", "guide", "tinker", "guide", "listen"] as const satisfies readonly BodhPose[];

export function ProgressPath({
  active = 1,
  language = "hi",
}: {
  active?: number;
  language?: NarrationLanguage;
}) {
  const stageLabels = stages[authoredLanguageFor(language)];
  const journeyComplete = active > stageLabels.length;
  const bodhPosition = journeyComplete
    ? stageLabels.length
    : Math.max(1, Math.min(active, stageLabels.length));

  return (
    <ol
      className="progress-path"
      aria-label={language === "hi" ? "सीखने की journey" : "Learning journey"}
      lang={language}
    >
      {stageLabels.map((stage, index) => {
        const position = index + 1;
        const state = position < active ? "complete" : position === active ? "active" : "future";
        const carriesBodh = position === bodhPosition;
        return (
          <li
            className={`progress-stage progress-stage-${state} ${carriesBodh ? "progress-stage-with-bodh" : ""} ${journeyComplete && carriesBodh ? "progress-stage-finished" : ""}`}
            key={stage}
            aria-current={state === "active" ? "step" : undefined}
          >
            <span className="progress-bodh-slot" aria-hidden="true">
              {carriesBodh && (
                <BodhMark
                  pose={journeyComplete ? "celebrate" : poses[index]}
                  size="mark"
                  motion={journeyComplete ? "celebrate" : poses[index] === "listen" ? "listen" : poses[index]}
                />
              )}
            </span>
            <span className="progress-dot" aria-hidden="true" />
            <span>{stage}</span>
          </li>
        );
      })}
    </ol>
  );
}
