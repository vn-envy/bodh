import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Bodh — That which is truly understood",
    template: "%s · Bodh",
  },
  description:
    "A Hindi-first visual tutor that finds the concept beneath a maths doubt and helps the learner understand it for good.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hi">
      <body>{children}</body>
    </html>
  );
}
