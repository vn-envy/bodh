import type { Metadata } from "next";
import { HowItWorksContent } from "./HowItWorksContent";

export const metadata: Metadata = {
  title: "How Bodh works",
  description: "A small, visual path from a homework doubt to durable mathematical understanding.",
};

export default function HowItWorksPage() {
  return <HowItWorksContent />;
}
