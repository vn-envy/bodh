import type { Metadata } from "next";
import { DiagnosticIntake } from "./DiagnosticIntake";

export const metadata: Metadata = {
  title: "Bring a maths doubt",
  description: "Share a fraction question in Hindi or Hinglish and let Bodh find the idea to check first.",
};

export default function DiagnosePage() {
  return <DiagnosticIntake />;
}
