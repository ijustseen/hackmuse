# HACKMUSE

Put your hackathon idea on trial. Pitch it in a few sentences; four AI judges sit down at a round table, argue about it out loud, and hand you a weighted score with the strengths to lean on and the risks to fix.

- **Debate + scores:** Gemma 4 (`gemma-4-26b-a4b-it`) via Google AI Studio, streamed line by line
- **Voices:** ElevenLabs text-to-speech, one voice per judge
- **UI:** Next.js 16, Tailwind 4, Motion, Lenis, components adapted from [ui-layouts.com](https://www.ui-layouts.com)

## Run it

```bash
npm install
cp .env.example .env.local   # add GEMMA_API_KEY and ELEVENLABS_API_KEY
npm run dev
```

Without keys it still runs: no Gemma key → clearly labelled demo debate; no ElevenLabs key → captions only.

## Docs

- [`docs/DECISIONS.md`](docs/DECISIONS.md) — what we decided and why
- [`docs/BUILD_LOG.md`](docs/BUILD_LOG.md) — what's built, how a debate flows, what's verified, gotchas
- [`docs/LOVABLE_PRESENTATION_PROMPT.md`](docs/LOVABLE_PRESENTATION_PROMPT.md) — paste-ready Lovable prompt for the pitch deck (same design system)

Built at Hacktoberfest Hack Day Linz, 2026.
