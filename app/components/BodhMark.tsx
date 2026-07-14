type BodhMarkProps = {
  size?: "small" | "large";
};

export function BodhMark({ size = "small" }: BodhMarkProps) {
  return (
    <span
      className={`bodh-mark bodh-mark-${size}`}
      role="img"
      aria-label="Bodh, a friendly elephant mentor"
    >
      <span className="bodh-ear bodh-ear-left" />
      <span className="bodh-ear bodh-ear-right" />
      <span className="bodh-head">
        <span className="bodh-eye bodh-eye-left" />
        <span className="bodh-eye bodh-eye-right" />
        <span className="bodh-trunk" />
      </span>
    </span>
  );
}
