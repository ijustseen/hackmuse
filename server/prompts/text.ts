/** Shared prompt helpers. The wording in the sibling files is meant to be replaced. */

export function clip(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export function submissionBlock(input: {
  idea: string;
  hackathonUrl: string;
  rules: string;
}): string {
  return [
    `Idea:\n${input.idea.trim()}`,
    `Hackathon page:\n${input.hackathonUrl.trim()}`,
    `Rules and criteria, as pasted by the participant:\n${input.rules.trim()}`,
  ].join("\n\n");
}
