import { GoogleGenAI } from "@google/genai";

// Change these values to try a different idea or hackathon.
const testInput = {
  projectIdea:
    "EcoSort AI — An AI-powered web application that helps users correctly sort household waste. Users upload a photo of an item, and the application uses the open-weight Gemma 4 model to identify the object, explain how it should be recycled, and recommend the appropriate waste bin. The app supports local recycling guidelines and provides a short explanation for each recommendation. Our team of four plans to build an MVP using Next.js, TypeScript, Gemma 4 via the Gemini API, and a small database of recycling rules. The demo will show live image recognition and recycling recommendations for several everyday objects.",
  hackathonUrl:
    "https://events.mlh.com/events/15054-hacktoberfest-hack-day-linz-x-young-ai-leaders-linz",
  hackathonRules:
    "Hackathon: Hacktoberfest Hack Day Linz x Young AI Leaders Linz. Date: October 30, 2026. Location: JKU Linz, Austria. Main challenge: Best Open-Source AI Project. Build an original project where open-source or open-weight AI plays an essential role. The project must be published in a public GitHub repository with a clear open-source license and a README explaining how it works, how to run it, and the AI model and main dependencies used. Additional prize categories include Best Use of Gemma 4, Best Use of ElevenLabs, and Best Use of Lovable. The event runs from 14:00 to 21:00, with project build time scheduled from 14:30 to 18:45 and project demonstrations from 18:45 to 19:45. Specific judging weights were not publicly provided in the referenced event information.",
};

const prompt = `
You are HackMuse. Evaluate the hackathon project idea below.

First, use Google Search to find a few relevant previous hackathon projects and
verified winners or finalists. Prefer official hackathon pages, Devpost, and
GitHub. Never invent projects, awards, placements, or URLs.

Then score these criteria independently from 0 to 100:
- originality
- winner_pattern_fit
- hackathon_fit
- feasibility
- impact
- technical_innovation
- demo_potential
- concept_clarity

For every criterion, provide:
- score
- short explanation
- strengths
- weaknesses
- recommendations

Also return the similar projects and source URLs you found. If information is
missing, say so. Do not calculate an overall score and do not assign weights.

Return JSON only.

PROJECT DATA:
${JSON.stringify(testInput, null, 2)}
`;

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it to .env.local in the project folder or its parent folder.",
    );
  }

  const model = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";
  const ai = new GoogleGenAI({ apiKey });

  console.log(`\nSending test request to ${model}...\n`);

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
      maxOutputTokens: 8_000,
    },
  });

  console.log("=== GEMMA RESPONSE ===\n");
  console.log(response.text ?? "Gemma returned no text.");

  const grounding = response.candidates?.[0]?.groundingMetadata;
  const sources =
    grounding?.groundingChunks
      ?.map((chunk) => chunk.web)
      .filter(
        (source): source is { title: string; uri: string } =>
          Boolean(source?.title && source?.uri),
      ) ?? [];

  console.log("\n=== GOOGLE SEARCH SOURCES ===\n");
  if (sources.length === 0) {
    console.log("No grounding sources were returned.");
  } else {
    for (const [index, source] of sources.entries()) {
      console.log(`${index + 1}. ${source.title}\n   ${source.uri}`);
    }
  }

  if (grounding?.webSearchQueries?.length) {
    console.log("\n=== SEARCH QUERIES ===\n");
    console.log(grounding.webSearchQueries.join("\n"));
  }
}

main().catch((error: unknown) => {
  console.error("\nGemma test failed:");
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("API_KEY_INVALID")) {
    console.error(
      "GEMINI_API_KEY is invalid. Create a valid Gemini API key in Google AI Studio and replace the value in .env.local.",
    );
  } else {
    console.error(message);
  }
  process.exitCode = 1;
});
