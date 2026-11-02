// Builds data/github-corpus.json: real hackathon repos from the official GitHub API, for the review to compare ideas against.
// Usage: node scripts/ingest-github.mjs [--per-query 40] [--since 2025-01-01] [--min-stars 2] [--dry]
// Auth: GITHUB_TOKEN, or the token of a logged-in `gh` CLI. Unauthenticated works but is slow (10 searches/min).
// Stores metadata, a clean excerpt of at most 300 characters, and the link. Never full README text.
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const OUT = new URL("../data/github-corpus.json", import.meta.url);
const EXCERPT_MAX = 300;

// theme -> extra topic that narrows `topic:hackathon`. "general" has none.
const THEMES = {
  ai: ["artificial-intelligence", "machine-learning", "llm", "generative-ai"],
  climate: ["climate", "sustainability", "climate-change"],
  health: ["healthcare", "health", "mental-health"],
  fintech: ["fintech", "finance", "blockchain"],
  education: ["education", "edtech", "learning"],
  general: [null],
};

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const perQuery = Number(flag("per-query", 40));
const since = flag("since", "2025-01-01");
const minStars = Number(flag("min-stars", 2));
const dry = args.includes("--dry");

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}
const auth = token();
const headers = {
  "User-Agent": "hackmuse-ingest",
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, accept) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(`https://api.github.com${path}`, { headers: accept ? { ...headers, Accept: accept } : headers });
    if (res.status === 403 || res.status === 429) {
      const reset = Number(res.headers.get("x-ratelimit-reset")) * 1000 - Date.now();
      const wait = Math.min(Math.max(reset, 5000), 65000);
      console.error(`rate limited, waiting ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      continue;
    }
    return res;
  }
  throw new Error(`GitHub API gave up on ${path}`);
}

/** README text is untrusted and goes into a model prompt later: flatten it to plain words and cut it short. */
function excerpt(readme, fallback) {
  const text = (readme || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .split("\n")
    .map((l) => l.replace(/^[#>*\-+\s|]+/, "").replace(/[*_`|]/g, "").trim())
    .filter((l) => l.length > 40 && !/^(badge|license|table of contents|installation|getting started)/i.test(l));
  const setup = /(environment variable|cluster|npm |pip |clone|install|api key|\.env|localhost|run the)/i;
  const prose = text.find((l) => !setup.test(l));
  const own = (fallback || "").replace(/\s+/g, " ").trim();
  // The author's one-line repo description is the best summary; fall back to the first prose line of the README.
  const base = own.length >= 40 ? own : prose || own;
  return base.length > EXCERPT_MAX ? `${base.slice(0, EXCERPT_MAX - 1).trimEnd()}…` : base;
}

async function search(theme, topic) {
  const q = ["topic:hackathon", topic ? `topic:${topic}` : null, `stars:>=${minStars}`, `pushed:>=${since}`, "fork:false", "archived:false"]
    .filter(Boolean)
    .join(" ");
  const res = await api(`/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${Math.min(perQuery, 100)}`);
  if (!res.ok) throw new Error(`search ${theme}/${topic}: ${res.status}`);
  return (await res.json()).items.map((r) => ({ theme, repo: r }));
}

const found = new Map();
for (const [theme, topics] of Object.entries(THEMES)) {
  let taken = 0;
  for (const topic of topics) {
    if (taken >= perQuery) break;
    for (const hit of await search(theme, topic)) {
      if (taken >= perQuery) break;
      if (found.has(hit.repo.html_url)) continue;
      found.set(hit.repo.html_url, hit);
      taken += 1;
    }
    await sleep(2200); // stay under the 30 searches/min limit
  }
  console.log(`${theme}: ${taken} repos`);
}

if (dry) {
  for (const { theme, repo } of found.values()) console.log(`${theme.padEnd(9)} ${String(repo.stargazers_count).padStart(5)}★ ${repo.full_name}`);
  process.exit(0);
}

let existing = new Map();
try {
  existing = new Map(JSON.parse(await readFile(OUT, "utf8")).projects.map((p) => [p.sourceUrl, p]));
} catch {}

const now = new Date().toISOString();
const projects = [];
for (const { theme, repo } of found.values()) {
  // Re-check the link and read the README. A repo that no longer resolves is dropped, not kept.
  const info = await api(`/repos/${repo.full_name}`);
  if (!info.ok) {
    console.error(`dropped ${repo.full_name}: ${info.status}`);
    continue;
  }
  const readmeRes = await api(`/repos/${repo.full_name}/readme`, "application/vnd.github.raw+json");
  const readme = readmeRes.ok ? (await readmeRes.text()).slice(0, 6000) : "";
  const description = excerpt(readme, repo.description);
  if (description.length < 40) continue;
  projects.push({
    name: repo.name,
    description,
    repoUrl: repo.html_url,
    sourceUrl: repo.html_url,
    techStack: [repo.language, ...(repo.topics || []).filter((t) => t !== "hackathon").slice(0, 5)].filter(Boolean).join(", ") || null,
    prize: null, // GitHub has no placement data; outcomes come from organizers later
    hackathon: "GitHub project tagged #hackathon",
    hackathonUrl: `https://github.com/topics/hackathon`,
    theme,
    stars: repo.stargazers_count,
    pushedAt: repo.pushed_at,
    license: repo.license?.spdx_id ?? null,
    checkedAt: now,
  });
  await sleep(150);
}

const merged = new Map(existing);
for (const p of projects) merged.set(p.sourceUrl, p);
await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(OUT, JSON.stringify({ updated: now, projects: [...merged.values()] }, null, 1));
console.log(`Wrote ${merged.size} projects (${projects.length} fresh) to data/github-corpus.json`);
