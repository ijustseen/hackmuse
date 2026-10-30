# Decisions

What we agreed before and during the build (hack day, 2026-10-30). Newest decisions at the bottom of each section.

## Product

| # | Decision | Why |
|---|----------|-----|
| D1 | Scope is one vertical slice: **landing → debate room → score card**. | Demo is due within hours. Everything else is stretch. |
| D2 | **Placeholder rubric**: Originality 25%, Feasibility 20%, Impact 20%, Tech Depth 15%, Demo Wow 20%. Lives in `lib/rubric.ts`. | Real event criteria come later; one file to swap. |
| D3 | **Panel (prototype)**: The Chair (moderator), The Shark (skeptical VC, owns Impact), The Builder (engineer, owns Feasibility + Tech Depth), The Visionary (designer, owns Originality + Demo Wow). Lives in `lib/judges.ts`. | Three voting voices that genuinely disagree + a moderator to open and close. |
| D4 | **Debate format**: 8 lines — Chair opens, three openings, three rebuttals (each names who it answers), Chair verdict. ~90 s of audio. | Long enough to feel like a debate, short enough for a demo. |
| D5 | **Voice is not live**: Gemma writes the script, ElevenLabs reads each line in the judge's own voice. | Reliable on stage; no conversational-agent fragility. |
| D6 | **Roundtable** layout for the debate room (user's idea, kept). Active seat lifts, a dashed "live mic" ring in the speaker's colour circles the table, and rebuttals draw a beam along the table rim to the judge being answered. | Makes who-is-talking-to-whom readable at a glance. |
| D7 | **Per-session persistence only**: idea + verdict in `sessionStorage`. Reloading the debate page shows the cached verdict; a new idea starts fresh. No database, no sharing. | User's call; zero infra. |

## Models

| # | Decision | Why |
|---|----------|-----|
| M1 | **Gemma 4** writes the debate and the scores — not Gemini. Model `gemma-4-26b-a4b-it` by default (`GEMMA_MODEL` to change; `gemma-4-31b-it` also exists). | Hackathon track "Best Use of Gemma 4". |
| M2 | Gemma is called through Google AI Studio's hosted endpoint (`generativelanguage.googleapis.com`). That host is shared with Gemini, which is why the key is an "AI Studio" key. Env var: `GEMMA_API_KEY` (falls back to `GEMINI_API_KEY`, the same kind of key). | Hosted = works when deployed. |
| M3 | **Stream** the debate as JSON Lines and use `thinkingLevel: "minimal"`. | Measured: first answer token in **1.1 s** (minimal) vs **25.8 s** (default thinking); full debate in ~7–13 s. The room starts talking while Gemma is still writing. |
| M4 | Scores are computed **server-side** from Gemma's 0–10 criterion scores (weighted → 0–100). If Gemma's stream drops the scores object, a second small call asks for scores only. Never invented. | A parseable, honest number. |
| M5 | **ElevenLabs** default model `eleven_multilingual_v2`, premade voices Daniel (Chair), Brian (Shark), Charlie (Builder), Jessica (Visionary). Override with `ELEVENLABS_MODEL` / `ELEVENLABS_VOICE_<JUDGE>`. With `eleven_v3`, each line's one-word delivery cue is sent as an audio tag (`[skeptical] …`). | Distinct voices; v3 tags are an opt-in upgrade. |
| M6 | No ElevenLabs key → **captions-only** mode (timed typewriter captions, synthetic waveform). No Gemma key → **demo mode** (scripted debate, labelled DEMO everywhere). | The demo never stalls, and fake results are never passed off as real. |

## Look & feel

| # | Decision | Why |
|---|----------|-----|
| L1 | **Neo-brutalist "courtroom"**, built from the user's reference: cream paper, ink borders, hard blood-red offset shadows, coral actions, teal chrome — extended with mustard (the Chair), mint, lilac, halftone dots, hatching, graph-paper grid, grain, rubber stamps. | "Same taste, far more complex." |
| L2 | Type: **Barlow Condensed** 600–900 (display), **Space Mono** (labels/buttons), **Inter** (body). | Matches the condensed-heavy + mono look of the reference. |
| L3 | **ui-layouts.com** components, pulled from their shadcn registry (`https://www.ui-layouts.com/r/<name>.json`) and adapted: smooth-scroll (Lenis), scroll-text-marquee, scroll-text, randomized-text-effect, spotlight-cards, stacking-card, btn-click-down, noise-effect, terminal-ui, type-writter, shimmer-loader. Each file says what it's adapted from and what changed. | User asked for ui-layouts UI. |
| L4 | Effects: custom brutalist cursor (dot + spring-trailing frame that becomes a labelled coral block over buttons and an I-beam over text), magnetic submit button, scroll progress bar, parallax hero, velocity-reactive marquees, 3D tilt + halftone spotlight on judge cards, stacking "how it works" cards, number-flow score counter, stamp slam + sheet shake on the verdict. Custom cursor only on precise pointers; motion respects `prefers-reduced-motion`. | "Scroll, the mouse, everything — as good as possible." |

## Process

| # | Decision | Why |
|---|----------|-----|
| P1 | Work on branch `feat/idea-grader`, commit locally, **push only when asked**. | Repo belongs to `ijustseen`. |
| P2 | Everything we decide or build is written down here and in `BUILD_LOG.md`. | User request. |
