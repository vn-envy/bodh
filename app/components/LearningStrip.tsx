type LearningStripProps = {
  total: number;
  filled: number;
  unit: string;
  label: string;
  tone?: "peach" | "olive" | "blue";
  compact?: boolean;
  showUnits?: boolean;
};

export function LearningStrip({
  total,
  filled,
  unit,
  label,
  tone = "peach",
  compact = false,
  showUnits = true,
}: LearningStripProps) {
  return (
    <div
      className={`learning-strip learning-strip-${tone} ${compact ? "learning-strip-compact" : ""}`}
      role="img"
      aria-label={`${label}: ${filled} groups of ${unit} shown in ${total} equal parts`}
    >
      <div className="learning-strip-copy" aria-hidden="true">
        <strong>{label}</strong>
        <span>{filled} × {unit}</span>
      </div>
      <div
        className="learning-strip-rail"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
        aria-hidden="true"
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            className={index < filled ? "learning-segment learning-segment-filled" : "learning-segment"}
            key={index}
          >
            {showUnits && index < filled ? <small>{unit}</small> : null}
          </span>
        ))}
      </div>
    </div>
  );
}
