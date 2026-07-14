const stages = ["देखें", "समझें", "आज़माएँ", "खुद करें"];

export function ProgressPath({ active = 1 }: { active?: number }) {
  return (
    <ol className="progress-path" aria-label="सीखने की journey">
      {stages.map((stage, index) => {
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
