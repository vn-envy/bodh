import { TAMIL_OVERLAY_ENTRIES } from "./i18n/ta-overlay.data.ts";

/**
 * Tamil copy is layered over authored English by exact source match. Entries
 * are either hand-written (`reviewed: true`) or produced by
 * `scripts/generate-tamil-overlay.mjs` through Sarvam-Translate with glossary
 * pinning (`reviewed: false`). A missing entry falls back to English so a
 * Tamil learner never sees a blank.
 */
export type TamilOverlayEntry = Readonly<{
  ta: string;
  reviewed: boolean;
}>;

const overlay: ReadonlyMap<string, TamilOverlayEntry> = new Map(
  Object.entries(TAMIL_OVERLAY_ENTRIES),
);

export function tamilOverlayFor(englishSource: string): string | null {
  return overlay.get(englishSource)?.ta ?? null;
}

export function tamilOverlayIsReviewed(englishSource: string): boolean {
  return overlay.get(englishSource)?.reviewed ?? false;
}

export function tamilOverlaySize() {
  return overlay.size;
}
