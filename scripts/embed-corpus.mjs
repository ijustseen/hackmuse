// Embeds every corpus project so the review can find the nearest ones by meaning.
// Usage: node scripts/embed-corpus.mjs            (reads GEMINI_API_KEY or GEMMA_API_KEY from .env.local or the environment)
// Writes data/embeddings.<corpus>.json = { model, dims, vectors: { [sourceUrl]: number[] } }. Only missing urls are embedded.
import { readFile, writeFile } from "node:fs/promises";
import { GoogleGenAI } from "@google/genai";

export const EMBED_MODEL = "gemini-embedding-001";
export const EMBED_DIMS = 768;
const CORPORA = ["github", "devpost"];

async function loadEnv() {
  try {
    for (const line of (await readFile(new URL("../.env.local", import.meta.url), "utf8")).split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}
await loadEnv();
const apiKey = process.env.GEMMA_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("Set GEMMA_API_KEY or GEMINI_API_KEY");
const ai = new GoogleGenAI({ apiKey });

const normalise = (v) => {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => Math.round((x / n) * 1e5) / 1e5);
};

// The free tier allows 100 embed requests a minute and counts each text; wait out a 429 as the API asks.
async function embedWithRetry(contents) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await ai.models.embedContent({
        model: EMBED_MODEL,
        contents,
        config: { taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: EMBED_DIMS },
      });
    } catch (error) {
      const text = String(error?.message ?? error);
      if (!text.includes("429") || attempt >= 5) throw error;
      const wait = Number(text.match(/retry in (\d+)/i)?.[1] ?? 45) + 3;
      console.log(`rate limited, waiting ${wait}s`);
      await new Promise((r) => setTimeout(r, wait * 1000));
    }
  }
}

for (const name of CORPORA) {
  let projects;
  try {
    projects = JSON.parse(await readFile(new URL(`../data/${name}-corpus.json`, import.meta.url), "utf8")).projects;
  } catch {
    continue;
  }
  const file = new URL(`../data/embeddings.${name}.json`, import.meta.url);
  let store = { model: EMBED_MODEL, dims: EMBED_DIMS, vectors: {} };
  try {
    const old = JSON.parse(await readFile(file, "utf8"));
    if (old.model === EMBED_MODEL && old.dims === EMBED_DIMS) store = old;
  } catch {}

  const todo = projects.filter((p) => p.sourceUrl && !store.vectors[p.sourceUrl]);
  for (let i = 0; i < todo.length; i += 40) {
    const batch = todo.slice(i, i + 40);
    const res = await embedWithRetry(batch.map((p) => `${p.name}. ${p.description}${p.techStack ? ` Tech: ${p.techStack}.` : ""}`));
    batch.forEach((p, j) => {
      store.vectors[p.sourceUrl] = normalise(res.embeddings[j].values);
    });
    await writeFile(file, JSON.stringify(store)); // keep progress if a later batch fails
    console.log(`${name}: embedded ${Math.min(i + 40, todo.length)}/${todo.length}`);
  }
  // Drop vectors for projects that left the corpus.
  const live = new Set(projects.map((p) => p.sourceUrl));
  for (const url of Object.keys(store.vectors)) if (!live.has(url)) delete store.vectors[url];
  await writeFile(file, JSON.stringify(store));
  console.log(`${name}: ${Object.keys(store.vectors).length} vectors`);
}
