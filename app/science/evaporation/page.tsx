import type { Metadata } from "next";
import { EvaporationJourney } from "./EvaporationJourney";

export const metadata: Metadata = {
  title: "Where did the puddle go?",
  description: "Follow water from a sunny puddle through evaporation, condensation, clouds, and rain with Bodh.",
};

export default function EvaporationPage() {
  return <EvaporationJourney />;
}
