import type { Metadata } from "next";
import { UnderstandingClimb } from "./UnderstandingClimb";

export const metadata: Metadata = {
  title: "Understanding Climb",
  description: "Show every Marble evidence statement three ways, climb the prerequisite graph, and check that understanding lasts.",
};

export default function ClimbPage() {
  return <UnderstandingClimb />;
}
