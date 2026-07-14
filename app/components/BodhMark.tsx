import Image from "next/image";

export type BodhPose = "welcome" | "listen" | "guide" | "tinker" | "celebrate";
export type BodhSize = "mark" | "small" | "medium" | "large" | "hero";
export type BodhMotion = "still" | "breathe" | "listen" | "guide" | "tinker" | "celebrate";

type BodhMarkProps = {
  pose?: BodhPose;
  size?: BodhSize;
  motion?: BodhMotion;
  priority?: boolean;
  className?: string;
  decorative?: boolean;
};

const sizeHints: Record<BodhSize, string> = {
  mark: "48px",
  small: "88px",
  medium: "148px",
  large: "260px",
  hero: "300px",
};

export function BodhMark({
  pose = "welcome",
  size = "small",
  motion = "breathe",
  priority = false,
  className = "",
  decorative = true,
}: BodhMarkProps) {
  const assetSize = size === "mark" || size === "small" ? 512 : 1024;
  const src = `/art/bodh/bodh-${pose}-${assetSize}.webp`;

  return (
    <span
      className={`bodh-mark bodh-mark-${size} bodh-motion-${motion} bodh-pose-${pose} ${className}`.trim()}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "Bodh, a friendly elephant mentor"}
      aria-hidden={decorative ? "true" : undefined}
    >
      <Image
        className="bodh-mascot-image"
        src={src}
        alt=""
        width={assetSize}
        height={assetSize}
        sizes={sizeHints[size]}
        priority={priority}
        unoptimized
      />
    </span>
  );
}
