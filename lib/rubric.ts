// Placeholder rubric — the real criteria come later. Weights must sum to 1.
export type CriterionId =
  | "originality"
  | "feasibility"
  | "impact"
  | "techDepth"
  | "demoWow";

export interface Criterion {
  id: CriterionId;
  label: string;
  weight: number;
  question: string;
}

export const RUBRIC: Criterion[] = [
  {
    id: "originality",
    label: "Originality",
    weight: 0.25,
    question: "Have the judges seen this ten times today?",
  },
  {
    id: "feasibility",
    label: "Feasibility",
    weight: 0.2,
    question: "Can a small team ship it before the deadline?",
  },
  {
    id: "impact",
    label: "Impact",
    weight: 0.2,
    question: "Does anyone actually need this?",
  },
  {
    id: "techDepth",
    label: "Tech Depth",
    weight: 0.15,
    question: "Is there a real technical problem underneath?",
  },
  {
    id: "demoWow",
    label: "Demo Wow",
    weight: 0.2,
    question: "Will the room remember the demo?",
  },
];

export const CRITERION_IDS = RUBRIC.map((c) => c.id);

/** Weighted 0–100 score from 0–10 criterion scores. */
export function overallScore(scores: Record<CriterionId, number>): number {
  const sum = RUBRIC.reduce((acc, c) => acc + c.weight * scores[c.id], 0);
  return Math.round(sum * 10);
}

export interface Grade {
  label: string;
  blurb: string;
}

export function gradeFor(overall: number): Grade {
  if (overall >= 85) return { label: "Ship it", blurb: "Build it tonight." };
  if (overall >= 70)
    return { label: "Contender", blurb: "Strong. Sharpen the demo." };
  if (overall >= 55)
    return { label: "Promising", blurb: "There's a real idea in here." };
  if (overall >= 40)
    return { label: "Rework", blurb: "Back to the whiteboard." };
  return { label: "Pivot", blurb: "Keep the team, change the idea." };
}
