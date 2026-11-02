import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter, Space_Mono } from "next/font/google";
import { Suspense } from "react";
import { Cursor } from "@/components/effects/cursor";
import { Noise } from "@/components/effects/noise";
import { SmoothScroll } from "@/components/effects/smooth-scroll";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  style: ["normal", "italic"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  // Absolute URLs for share images and canonical links; set NEXT_PUBLIC_SITE_URL in production.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "HACKMUSE — throw your hackathon idea to the sharks",
  description:
    "Five AI sharks argue about your hackathon idea and 30 simulated people from social media react to it. See what survived and what to fix before the judges see it. Free.",
  openGraph: {
    type: "website",
    siteName: "HACKMUSE",
    title: "Throw your hackathon idea to the sharks",
    description: "Five AI sharks argue about it, 30 people from the feed react, and you see what to fix before the judges do.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#3d5e56",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${barlow.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SmoothScroll>{children}</SmoothScroll>
        <Noise />
        {/* Reads the URL, which a dynamic route like /v/[id] only knows at request time. */}
        <Suspense fallback={null}>
          <Cursor />
        </Suspense>
      </body>
    </html>
  );
}
