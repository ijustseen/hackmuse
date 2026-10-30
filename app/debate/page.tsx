import type { Metadata } from "next";
import { DebateRoom } from "@/components/debate/debate-room";

export const metadata: Metadata = {
  title: "The debate room — HACKMUSE",
};

export default function DebatePage() {
  return <DebateRoom />;
}
