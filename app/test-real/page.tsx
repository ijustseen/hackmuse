import type { Metadata } from "next";
import { RealBoard } from "./real-board";

export const metadata: Metadata = {
  title: "Hackmuse — live Gemma review",
  description: "Score a hackathon idea with Gemma and Google Search.",
};

export default function TestRealPage() {
  return <RealBoard />;
}
