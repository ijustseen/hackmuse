import type { CriterionId } from "./rubric";

export type JudgeId = "chair" | "shark" | "builder" | "visionary";
export type VotingJudgeId = Exclude<JudgeId, "chair">;

export interface Judge {
  id: JudgeId;
  name: string;
  role: string;
  glyph: string;
  /** Tailwind-safe CSS color used for the judge's seat, tags and beams. */
  color: string;
  catchphrase: string;
  owns: CriterionId[];
  /** Persona brief handed to Gemma. */
  brief: string;
  /** Default ElevenLabs premade voice; override per judge with ELEVENLABS_VOICE_<ID>. */
  voiceId: string;
  voiceName: string;
}

export const JUDGES: Record<JudgeId, Judge> = {
  chair: {
    id: "chair",
    name: "The Chair",
    role: "Moderator",
    glyph: "§",
    color: "#e9b949",
    catchphrase: "Order. The idea is on the table.",
    owns: [],
    brief:
      "the moderator. Opens the session in one line and closes with the verdict. Measured, dry wit, never rambles.",
    voiceId: "onwK4e9ZLuTAKqWW03F9",
    voiceName: "Daniel",
  },
  shark: {
    id: "shark",
    name: "The Shark",
    role: "Skeptical VC",
    glyph: "$",
    color: "#e8736a",
    catchphrase: "Who pays for this, and why now?",
    owns: ["impact"],
    brief:
      "a skeptical venture capitalist. Cares about who pays, market size, distribution and why now. Blunt, dry, short sentences.",
    voiceId: "nPczCjzI2devNBz1zQrb",
    voiceName: "Brian",
  },
  builder: {
    id: "builder",
    name: "The Builder",
    role: "Pragmatic engineer",
    glyph: "#",
    color: "#7fb3a5",
    catchphrase: "Cool. What's the hard part?",
    owns: ["feasibility", "techDepth"],
    brief:
      "a pragmatic senior engineer. Cares whether it can be built in a hackathon, which APIs and data it needs, and where it breaks. Concrete, names specific tech.",
    voiceId: "IKne3meq5aSn9XLyUdCD",
    voiceName: "Charlie",
  },
  visionary: {
    id: "visionary",
    name: "The Visionary",
    role: "Product designer",
    glyph: "*",
    color: "#b9a6e8",
    catchphrase: "Forget the spec. Show me the moment.",
    owns: ["originality", "demoWow"],
    brief:
      "a product designer and hype person. Cares about delight, novelty and the one demo moment people remember. Energetic, vivid.",
    voiceId: "cgSgspJ2msm6clMCkdW9",
    voiceName: "Jessica",
  },
};

export const JUDGE_ORDER: JudgeId[] = ["chair", "shark", "builder", "visionary"];
export const VOTING_JUDGES: VotingJudgeId[] = ["shark", "builder", "visionary"];

export function isJudgeId(v: unknown): v is JudgeId {
  return typeof v === "string" && v in JUDGES;
}
