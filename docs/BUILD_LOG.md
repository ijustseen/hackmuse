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

### Next up (stretch)

- Plug in the real rubric (`lib/rubric.ts`) and confirm the panel personas.
- Add the ElevenLabs key and listen to a full debate; try `ELEVENLABS_MODEL=eleven_v3` for delivery tags.
- Live Q&A round with one judge (ElevenLabs conversational agent).
- For the "Best Open-Source AI Project" track: add an OSS license and name the model + its license in the README.
