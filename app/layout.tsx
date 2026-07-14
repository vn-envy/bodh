import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "bodh-learning.neekhil007.chatgpt.site";
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  const metadataBase = new URL(`${protocol}://${host}`);
  const title = "Bodh — That which is truly understood";
  const description = "A Hindi-first visual tutor that finds the concept beneath a maths doubt and helps the learner understand it for good.";

  return {
    metadataBase,
    title: { default: title, template: "%s · Bodh" },
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Bodh the elephant mentor with a fraction visual" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hi">
      <body>
        <a className="skip-link" href="#main-content">मुख्य content पर जाएँ</a>
        {children}
      </body>
    </html>
  );
}
