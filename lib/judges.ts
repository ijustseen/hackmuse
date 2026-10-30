import type { CriterionId } from "./rubric";

// The panel. Add a judge here (plus an avatar in components/judge-avatar.tsx)
// and the prompt, roundtable, chat, call and scorecard all pick it up.
export type JudgeId = "chair" | "shark" | "builder" | "visionary" | "angel" | "operator";
export type VotingJudgeId = Exclude<JudgeId, "chair">;

export interface Judge {
  id: JudgeId;
  name: string;
  /** Short name for tight spots (seats, chat). */
  short: string;
  role: string;
  /** CSS colour for the judge's seat, tags and avatar backdrop. */
  color: string;
  catchphrase: string;
  owns: CriterionId[];
  /** Chip shown on the panel card when the judge owns no rubric criterion. */
  focus: string;
  /** Persona brief handed to Gemma. */
  brief: string;
  /** What they post when they join the group chat while Gemma writes. */
  joinLine: string;
  /** Default ElevenLabs premade voice (see the voice table below); override per judge with ELEVENLABS_VOICE_<ID>. */
  voiceId: string;
  voiceName: string;
}

export const JUDGES: Record<JudgeId, Judge> = {
  chair: {
    id: "chair",
    focus: "Final verdict",
    name: "The Chair",
    short: "Chair",
    role: "Moderator",
    color: "#e9b949",
    catchphrase: "Order. The idea is on the table.",
    owns: [],
    brief:
      "the moderator. Opens the session in one line and closes with the verdict. Measured, dry wit, never rambles.",
    joinLine: "New case. Keep it short.",
    voiceId: "onwK4e9ZLuTAKqWW03F9",
    voiceName: "Daniel",
  },
  shark: {
    id: "shark",
    focus: "Impact",
    name: "The Shark",
    short: "Shark",
    role: "Skeptical VC",
    color: "#e8736a",
    catchphrase: "Who pays for this, and why now?",
    owns: ["impact"],
    brief:
      "a skeptical venture capitalist. Cares about who pays, market size and why now. Blunt, dry, short sentences.",
    joinLine: "Who pays? Go.",
    voiceId: "nPczCjzI2devNBz1zQrb",
    voiceName: "Brian",
  },
  builder: {
    id: "builder",
    focus: "Feasibility",
    name: "The Builder",
    short: "Builder",
    role: "Pragmatic engineer",
    color: "#7fb3a5",
    catchphrase: "Cool. What's the hard part?",
    owns: ["feasibility", "techDepth"],
    brief:
      "a pragmatic senior engineer. Cares whether it can be built in a hackathon, which APIs and data it needs, and where it breaks. Concrete, names specific tech.",
    joinLine: "Counting the APIs already.",
    voiceId: "IKne3meq5aSn9XLyUdCD",
    voiceName: "Charlie",
  },
  visionary: {
    id: "visionary",
    focus: "Originality",
    name: "The Visionary",
    short: "Visionary",
    role: "Product designer",
    color: "#b9a6e8",
    catchphrase: "Forget the spec. Show me the moment.",
    owns: ["originality", "demoWow"],
    brief:
      "a product designer and hype person. Cares about delight, novelty and the one demo moment people remember. Energetic, vivid.",
    joinLine: "Ooh, I can see the demo.",
    voiceId: "cgSgspJ2msm6clMCkdW9",
    voiceName: "Jessica",
  },
  angel: {
    id: "angel",
    focus: "Team & story",
    name: "The Angel",
    short: "Angel",
    role: "Angel investor",
    color: "#9cc3d5",
    catchphrase: "I back people first. Why you?",
    owns: [],
    brief:
      "an early-stage angel investor. Cares about the founders' unfair advantage, the story and whether someone would love this. Warm but probing.",
    joinLine: "Sorry, late. Who is the team?",
    voiceId: "XB0fDUnXU5powFXDhCwa",
    voiceName: "Charlotte",
  },
  operator: {
    id: "operator",
    focus: "Distribution",
    name: "The Operator",
    short: "Operator",
    role: "Ex-founder, growth",
    color: "#e59a4f",
    catchphrase: "Great product. How do the first 100 users find it?",
    owns: [],
    brief:
      "a former startup founder who ran growth. Cares about distribution, the first hundred users and what the launch looks like. Practical, a little impatient.",
    joinLine: "Here. Distribution is my question.",
    voiceId: "bIHbv24MWmeRgasZH58o",
    voiceName: "Will",
  },
};

// Voice table: six premade ElevenLabs voices, spread across gender, accent and age.
//   chair     Daniel     male    British, mature, broadcaster
//   shark     Brian      male    American, deep, older, resonant
//   builder   Charlie    male    Australian, young, casual
//   visionary Jessica    female  American, young, expressive
//   angel     Charlotte  female  English-Swedish, mature, warm
//   operator  Will       male    American, young, upbeat
// Delivery is pushed apart further by VOICE_SETTINGS in app/api/tts/route.ts.
const seenVoices = new Map<string, JudgeId>();
for (const judge of Object.values(JUDGES)) {
  const clash = seenVoices.get(judge.voiceId);
  if (clash) throw new Error(`Judges ${clash} and ${judge.id} share ElevenLabs voice ${judge.voiceId}`);
  seenVoices.set(judge.voiceId, judge.id);
}

/** Seating order: the Chair first (head of the table), then clockwise. */
export const JUDGE_ORDER: JudgeId[] = ["chair", "shark", "builder", "angel", "visionary", "operator"];
export const VOTING_JUDGES = JUDGE_ORDER.filter((id): id is VotingJudgeId => id !== "chair");

export function isJudgeId(v: unknown): v is JudgeId {
  return typeof v === "string" && v in JUDGES;
}

/** Rebuttal lines after every voting judge has opened. */
export const REBUTTALS = 3;
/** Chair opens, every voting judge opens, the rebuttals, Chair closes. */
export const DEBATE_LENGTH = 1 + VOTING_JUDGES.length + REBUTTALS + 1;
