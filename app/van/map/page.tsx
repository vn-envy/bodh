import type { Metadata } from "next";
import { GrowthMap } from "./GrowthMap";

export const metadata: Metadata = {
  title: "Your growth map · Bodh Van",
  description: "The god's-eye view of Bodh Van: every concept as a hill, lit as you understand, never a score.",
};

export default function GrowthMapPage() {
  return <GrowthMap />;
}
