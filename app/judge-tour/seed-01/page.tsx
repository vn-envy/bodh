import type { Metadata } from "next";
import { JudgeTour } from "./JudgeTour";

export const metadata: Metadata = {
  title: "90-second judge tour",
  description: "A concise guided path through one committed Bodh learning fixture.",
};

export default function JudgeSeedTourPage() {
  return <JudgeTour />;
}
