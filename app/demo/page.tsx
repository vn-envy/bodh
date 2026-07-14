import type { Metadata } from "next";
import { DemoJourney } from "./DemoJourney";

export const metadata: Metadata = {
  title: "Curated fraction journey",
  description: "A deterministic Bodh learning journey for understanding fraction division.",
};

export default function DemoPage() {
  return <DemoJourney />;
}
