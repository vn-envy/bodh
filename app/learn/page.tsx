import type { Metadata } from "next";
import { SeededLearningJourney } from "./SeededLearningJourney";

export const metadata: Metadata = {
  title: "Your visual repair",
  description: "A live, seed-preserving Bodh learning journey built from the learner's exact doubt.",
};

export default function LearnPage() {
  return <SeededLearningJourney />;
}
