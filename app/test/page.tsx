import type { Metadata } from "next";
import { PreviewBoard } from "./preview-board";

export const metadata: Metadata = {
  title: "Hackmuse — idea review preview",
  description: "A local walkthrough of an idea review. No requests to models.",
};

export default function TestPage() {
  return <PreviewBoard />;
}
