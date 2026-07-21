import type { Metadata } from "next";
import { JudgeJourney } from "./JudgeJourney";

export const metadata: Metadata = {
  title: "Guided judge journey",
  description: "A concise, evidence-gated journey through Bodh's mathematics and science learning experiences.",
};

export default function JudgeTourPage() {
  return <JudgeJourney />;
}
