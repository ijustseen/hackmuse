export const gemmaCriteria = [
  { id: "originality", label: "Originality" },
  { id: "winner_pattern_fit", label: "Winner pattern" },
  { id: "hackathon_fit", label: "Hackathon fit" },
  { id: "feasibility", label: "Feasibility" },
  { id: "impact", label: "Impact" },
  { id: "technical_innovation", label: "Technical innovation" },
  { id: "demo_potential", label: "Demo potential" },
  { id: "concept_clarity", label: "Concept clarity" },
] as const;

export type GemmaProjectInput = {
  projectIdea: string;
  hackathonUrl: string;
  hackathonRules: string;
};

export type GemmaCriterionReview = {
  id: string;
  label: string;
  score: number | null;
  explanation: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
};

export type GemmaSimilarProject = {
  name: string;
  url: string | null;
  note: string;
};

export type GemmaSource = {
  title: string;
  uri: string;
};

export type GemmaReview = {
  model: string;
  parsed: boolean;
  missing: string | null;
  criteria: GemmaCriterionReview[];
  similarProjects: GemmaSimilarProject[];
  sources: GemmaSource[];
  queries: string[];
  rawText: string | null;
};

export const sampleProject: GemmaProjectInput = {
  projectIdea:
    "EcoSort AI — An AI-powered web application that helps users correctly sort household waste. Users upload a photo of an item, and the application uses the open-weight Gemma 4 model to identify the object, explain how it should be recycled, and recommend the appropriate waste bin. The app supports local recycling guidelines and provides a short explanation for each recommendation. Our team of four plans to build an MVP using Next.js, TypeScript, Gemma 4 via the Gemini API, and a small database of recycling rules. The demo will show live image recognition and recycling recommendations for several everyday objects.",
  hackathonUrl:
    "https://events.mlh.com/events/15054-hacktoberfest-hack-day-linz-x-young-ai-leaders-linz",
  hackathonRules:
    "Hackathon: Hacktoberfest Hack Day Linz x Young AI Leaders Linz. Date: October 30, 2026. Location: JKU Linz, Austria. Main challenge: Best Open-Source AI Project. Build an original project where open-source or open-weight AI plays an essential role. The project must be published in a public GitHub repository with a clear open-source license and a README explaining how it works, how to run it, and the AI model and main dependencies used. Additional prize categories include Best Use of Gemma 4, Best Use of ElevenLabs, and Best Use of Lovable. The event runs from 14:00 to 21:00, with project build time scheduled from 14:30 to 18:45 and project demonstrations from 18:45 to 19:45. Specific judging weights were not publicly provided in the referenced event information.",
};

const criterionLines = gemmaCriteria.map((criterion) => `- ${criterion.id}`).join("\n");

export function buildGemmaPrompt(input: GemmaProjectInput): string {
  return `
You are HackMuse. Evaluate the hackathon project idea below.

First, use Google Search to find a few relevant previous hackathon projects and
verified winners or finalists. Prefer official hackathon pages, Devpost, and
GitHub. Never invent projects, awards, placements, or URLs.

Then score these criteria independently from 0 to 100:
${criterionLines}

For every criterion, provide:
- score
- short explanation
- strengths
- weaknesses
- recommendations

Also return the similar projects and source URLs you found. If information is
missing, say so. Do not calculate an overall score and do not assign weights.

Return JSON only, with this shape and no markdown fences:
{
  "similarProjects": [{ "name": "", "url": "", "note": "" }],
  "missing": "",
  "criteria": [
    {
      "id": "originality",
      "score": 0,
      "explanation": "",
      "strengths": [],
      "weaknesses": [],
      "recommendations": []
    }
  ]
}

Use every criterion id listed above exactly once. Scores are integers from 0 to 100.

PROJECT DATA:
${JSON.stringify(input, null, 2)}
`;
}
