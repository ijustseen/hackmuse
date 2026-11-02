# Build log

## 2026-10-30 — first slice (landing → debate room → score card)

### What exists

```
app/
  page.tsx                 landing: header, hero + idea form, marquees, panel, how-it-works, rubric, footer
  debate/page.tsx          the debate room
  api/debate/route.ts      POST {idea, demo?} → NDJSON stream of StreamEvents (Gemma 4, or demo)
  api/tts/route.ts         POST {speaker, text, cue} → audio/mpeg from ElevenLabs (503 if no key)
lib/
  judges.ts  rubric.ts     the panel and the placeholder rubric (edit these to change the show)
  idea.ts                  limits, sample ideas, sessionStorage helpers
  types.ts                 Debate, DebateLine, StreamEvent
  server/gemma.ts          prompt, SSE streaming, JSON-object scanner, normalisation, scores fallback
  server/demo-debate.ts    scripted debate for demo mode
  client/debate-engine.ts  playback engine (outside React): TTS prefetch, audio graph, captions fallback
components/
  effects/                 cursor, magnetic, smooth-scroll (Lenis), noise, scroll-progress
  ui/                      adapted ui-layouts components + brutal button, typewriter, loader
  landing/                 landing sections
  debate/                  roundtable, caption, transcript, waveform, scorecard, debate-room
```

### How a debate flows

1. The landing form saves the idea to `sessionStorage` and routes to `/debate`.
2. The room POSTs `/api/debate`. The route streams Gemma 4 (`streamGenerateContent?alt=sse`, `thinkingLevel: minimal`).
   Gemma is asked for JSON Lines: a title object, 8 line objects, then a scores object.
   `JsonObjectScanner` pulls each complete `{…}` out of the token stream (tolerates fences, pretty-printing, or one big object),
   so each line is forwarded to the browser the moment it is complete.
3. The browser feeds lines into `DebateEngine` as they arrive. The engine fetches `/api/tts` for the current line and
   two ahead, plays them through an `AnalyserNode` (live waveform), and types the caption in sync with `audio.currentTime`.
   If it catches up with Gemma it waits ("Waiting on Gemma…").
4. The final `debate` event carries the weighted score; the engine finishes, the page glides to the scorecard,
   the number counts up, and the grade stamp slams down.

### Measured

- Gemma 4 26B A4B via AI Studio, streaming, minimal thinking: first answer token **1.1 s**, whole debate **7–13 s**
  (one outlier: 26 s to first line — server variance). Default thinking: **25.8 s** to first token.
- `gemma-4-31b-it` returned a 500 once during probing; 26B is the default.

### Verified

- `next build` passes (Next 16.4.3, Turbopack); `eslint` clean.
- Real Gemma debates streamed end to end through `/api/debate` (two ideas), and in the browser: deliberating state →
  live roundtable with speaker ring, rebuttal beams and "called out" tags → scorecard with stamp; reload shows the cached verdict.
- `/api/tts` returns 503 without a key and the room switches to captions-only.

### Not verified yet

- **ElevenLabs voices**: no `ELEVENLABS_API_KEY` was available while building, so the audio path (TTS fetch, playback,
  analyser waveform, autoplay-blocked overlay) is untested against the real API.
- Phone-width layout (the browser window couldn't be resized that small); responsive classes are in place.

### Gotchas

- The Gemini-API SSE stream separates events with `\r\n\r\n`, not `\n\n`.
- Gemma 4 returns `thought: true` parts — they're filtered out. `thinkingLevel: "low"` is rejected by this model;
  `"minimal"` works.
- `LayoutProps` is a generated type: `tsc` alone fails until `next dev`/`next build` has run.
- `next dev` rewrites `AGENTS.md` (Next's agent rules + `experimental.agentFeedback` block); commit it to keep the tree clean.

### Cursor rework (same day, after first review)

The first cursor turned into a solid 92 px coral block on hover, which hid the button underneath, was the same size for
every target, and vanished on dark sections. Now: corner brackets snap around the hovered element (content stays
visible), the label is a sticker above it, the dot/frame use `mix-blend-mode: difference`, the spring is snappier, and
clicks leave a ripple. Scrolling re-hit-tests under a still pointer so brackets follow the page.

### Next up (stretch)

- Plug in the real rubric (`lib/rubric.ts`) and confirm the panel personas.
- Add the ElevenLabs key and listen to a full debate; try `ELEVENLABS_MODEL=eleven_v3` for delivery tags.
- Live Q&A round with one judge (ElevenLabs conversational agent).
- For the "Best Open-Source AI Project" track: add an OSS license and name the model + its license in the README.

## 2026-10-30 — round 2: six judges, avatars, group-chat waiting room, call view

- Verified in the browser with real Gemma 4: chat intro → six seats fill → 10-line debate with beams/"called out" →
  skip to verdict → "Join the call" → speaker view cuts per speaker, gallery view, captions.
- `docs/LOVABLE_PRESENTATION_PROMPT.md` still describes the original four-judge panel and glyphs — update before the deck is built.

## 2026-10-30 — round 3: teammate backend merged and wired into the app

- Merged `origin/main` (teammate's `backend` + `ai-connection` PRs) into `feat/idea-grader`. Our landing, layout and
  styles won the conflicts; `package.json` takes both sides (adds `@google/genai`, `zod`, Node 22 engine).
- The landing form now has a collapsible **Pitched at** section (hackathon URL + rules), prefilled with today's Linz
  hack day, because the backend requires both. Stored per session next to the idea.
- The debate room calls **`POST /api/gemma-review`** in parallel with `/api/debate`. When it lands, the scorecard
  swaps the placeholder 5-criterion breakdown for the review's 8 criteria (0–100, with strengths / weaknesses / next
  steps), adds a "Been done before?" card with the similar projects and Google Search sources, and the headline score
  becomes the review's average. Until then it shows the panel's estimate with a "review pending" notice; on failure,
  a retry button. The review is cached in `sessionStorage` like the debate.
- `/api/debate` also accepts `hackathonUrl` + `rules`, so the judges argue about fit with the actual event.
- `server/gemma/review.ts` now also reads `GEMMA_API_KEY` (falls back from `GEMINI_API_KEY`).
- Measured live: review **153 s** (search call + 8k-token scoring call, default thinking) vs debate first line in
  about 1 s. The review usually lands after the verdict.
- Not wired: `/api/evaluations` (podcast + research + analysis pipeline). Its live LLM, search, page and speech
  providers are still placeholders that throw, so only the stub fixtures run.

## 2026-11-01 — rate limits on the routes that spend money

- `server/http/rate-limit.ts`: per-visitor window plus a site-wide daily budget (UTC day) on `/api/tts` (counts
  ElevenLabs characters), `/api/debate` and `/api/gemma-review`. Defaults and env names are in `server/config.ts`
  (`rateRules`) and `.env.example`. Demo-mode debates are not counted.
- Visitor = the `TRUSTED_PROXY_HOPS`-th entry from the right of `X-Forwarded-For`; a spoofed leftmost entry does not
  buy a new quota. The daily budget is the hard cap.
- Per-visitor over limit: 429 + `Retry-After`. Daily budget spent: 503, which the debate room already treats as
  captions-only on TTS.
- Counts live in process memory (reset on restart, single instance), like the job store. Move to the DB with persistence.
- Verified on a dev server with fake keys and tiny limits: 11 checks (per-visitor, daily budget, spoofed header, demo mode,
  both error shapes) pass; `npm run lint` and `npm run build` pass.

## 2026-11-01 — saved verdicts, share link, waitlist (Supabase)

- Migration `supabase/migrations/0001_init.sql` (tables `ideas`, `judgments`, `waitlist`; RLS on, no policies, browser keys
  revoked) applied to the new Supabase project; pgvector 0.8.2 enabled for the corpus later.
- `lib/server/db.ts`: server-only client with the secret key. The browser never touches the database. Without the env vars
  everything still runs on sessionStorage and the Share button and waitlist are off.
- Env names are `HACKMUSE_SUPABASE_*` on purpose: a machine-wide `SUPABASE_URL` from another project overrode `.env.local`
  and sent the app to the wrong database.
- Flow: the idea form posts `/api/ideas` and keeps the judgment id in sessionStorage. `/api/debate` and `/api/gemma-review`
  save their own output against that id (write-once, never demo debates), so a verdict cannot be forged from the browser.
  Share (`/api/judgments/[id]/share`) flips `ideas.is_public`; `/v/[id]` renders it read-only and is `noindex`.
- `/api/waitlist`: email + source, honeypot, rate limited, duplicates answered like new signups. Form in the footer and on `/v/[id]`.
- Cache Components forbids `dynamic = "force-dynamic"`: `/v/[id]` is a static shell with the data read inside Suspense, and the
  global `Cursor` (reads the URL) is wrapped in Suspense in `app/layout.tsx`.
- Verified against the real project: 11 API checks, plus a real Gemma debate and review through the browser, share link opened in a
  separate tab. The debate saved in 14.5 s of stream time; the review saved 96 s later with 8 scored criteria. Test rows deleted.
- Seen while testing: the 8-criterion review gave an obviously flattering 95/100 for "winner pattern" and 100 for concept clarity
  against the default Linz hack day rules. That is the ungrounded-score problem the corpus and eval loop are for.

## 2026-11-01 — week 2: shark reframe, share images, speed

- See DECISIONS S1–S9. Landing: new hero ("Throw your hackathon idea to the sharks."), fins patrolling under the form (Web
  Animations API speeds them up while you type; they dive on submit; static under reduced motion), panel "Five sharks. One
  Tank Master.", how-it-works, scoring section, FAQ, footer, header. Debate room: the round table is now the tank (water,
  ripples), shark seats, tank chat/feed wording. Scorecard and `/v/[id]`: survival strip.
- Verified: real Gemma debate returns 10 lines, all 8 criteria with notes and 5 votes in the new format; voice cache MISS
  0.71 s → HIT 0.004 s, identical audio; share images render (landing, verdict, unknown id); security headers present; 404
  returns 404.
- Lighthouse (production build, landing): desktop 99 / 100 / 100 / 100 (perf / a11y / best practices / SEO); mobile
  84 / 100 / 100 / 100. Mobile LCP is 4.3 s *simulated*; the observed LCP in the same run is 1.4 s (= FCP). The gap is
  Lighthouse charging ~260 KB of JS (Motion, Lenis, React) to the paint; cutting it means cutting the animation libraries.
- Phone check (Playwright, installed Chrome, 390×844, isMobile): no horizontal overflow on `/`, `/debate`, 404. Fixed on the
  way: the hero grid widened past the screen (no-wrap idea chips) — minmax(0) columns; seat names truncated — stacked on phones.
- Gotchas: Satori (next/og) has no `double` borders and only reads TTF/OTF; Cache Components needs `connection()` in the
  verdict image route; a 390 px headless desktop window is clamped wider, so use device emulation for phone checks.

## 2026-11-02 — week 3: GitHub corpus, embeddings, retrieval in the review

- See DECISIONS C1-C3. `scripts/ingest-github.mjs` wrote 208 repos (ai 40, climate 18, health 36, fintech 40, education 40,
  general 34) to `data/github-corpus.json`; every repo re-fetched at ingest, 19 excerpts under 60 characters.
  `scripts/embed-corpus.mjs` embeds new rows only and waits out the free tier's 100 requests/min.
- `server/gemma/corpus.ts` now ranks by embedding similarity (about 300-480 ms per lookup) and falls back to shared words.
  Past-project text goes into the prompt inside a `<past_projects>` block labelled as data.
- Verified on the dev server with a real review of a fridge-recipe idea: parsed, 8 criteria, 5 corpus sources, 3 similar
  projects, all 8 cited URLs exist in the corpus. **89 s** against 153 s before, from a single run each, and no Google Search
  sources came back in this run, so part of the gap may be the missing search. `next build` passes; `eslint` has 0 errors.
- Not done: the corpus has 208 rows, not the plan's 500, and it has no winners, only repos. Embeddings are not in Supabase
  yet. The 150-row exit check is met, the "winner pattern" evidence is not.
- Gotchas: Windows git bash has no `/usr/bin/time`; a script outside the repo cannot import `@google/genai`; `.agents`
  skill templates produce the 2 lint warnings.

