export const HERO_FIXTURE = {
  originalProblem: "3/4 ÷ 1/8 = ?",
  learnerReasoning: "मुझे समझ नहीं आता कि इसे उल्टा करके multiply क्यों करते हैं।",
  transferProblem: "रिया के पास 2/3 metre ribbon है। हर bookmark के लिए 1/6 metre ribbon चाहिए। कितने bookmarks बनेंगे?",
  originalAnswer: 6,
  transferAnswer: 4,
  targetSlots: 6,
  totalSlots: 8,
} as const;

const devanagariDigits: Record<string, string> = {
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
};

export function normaliseWholeNumberAnswer(value: string) {
  const asciiDigits = value.replace(/[०-९]/g, (digit) => devanagariDigits[digit]);
  const compact = asciiDigits.trim().replace(/\s+/g, "");
  const integerFraction = compact.match(/^(\d+)\/1$/);
  return integerFraction ? integerFraction[1] : compact;
}

export function isCorrectWholeNumberAnswer(value: string, expected: number) {
  return normaliseWholeNumberAnswer(value) === String(expected);
}

export function isLabComplete(placedSlots: number[]) {
  const uniqueSlots = new Set(placedSlots);
  return (
    uniqueSlots.size === HERO_FIXTURE.targetSlots &&
    [...uniqueSlots].every((slot) => slot >= 0 && slot < HERO_FIXTURE.targetSlots)
  );
}
