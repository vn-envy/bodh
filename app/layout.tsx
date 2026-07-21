import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { LocalizedSkipLink } from "./components/LocalizedSkipLink";
import "./globals.css";
import "./design-refinement.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fdf7ec",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "bodh-learning.neekhil007.chatgpt.site";
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  const metadataBase = new URL(`${protocol}://${host}`);
  const title = "Bodh — That which is truly understood";
  const description = "A Hindi-first visual tutor that finds the concept beneath a homework doubt and helps the learner understand it for good.";

  return {
    metadataBase,
    title: { default: title, template: "%s · Bodh" },
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: "/og-science.png", width: 1200, height: 630, alt: "Bodh the elephant mentor making maths and science ideas visible" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og-science.png"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hi">
      <body>
        <LocalizedSkipLink />
        {children}
      </body>
    </html>
  );
}
