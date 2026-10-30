import type { Metadata } from "next";
import { Barlow_Condensed, Inter, Space_Mono } from "next/font/google";
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
  title: "HACKMUSE — put your hackathon idea on trial",
  description:
    "Pitch your hackathon idea. A panel of AI judges debates it out loud and hands you a score.",
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
        <Cursor />
      </body>
    </html>
  );
}
