# Lovable prompt: HACKMUSE pitch deck

How to use it:
1. Paste everything below the cut line into a new Lovable project as the first message.
2. Then send the follow-up prompts at the end of this file one at a time, checking the result between each.
3. Before presenting, replace every `[[...]]` placeholder: team names, the app URL, and any number marked `[[VERIFY]]`.

The deck copies the HACKMUSE app's design system exactly (tokens from `app/globals.css`). The demo transcripts and scores in the data appendix are real Gemma 4 outputs captured from the app on 2026-10-30. They are not made up, so keep them as they are.

--- COPY EVERYTHING BELOW THIS LINE INTO LOVABLE ---

# Build: "HACKMUSE — pitch deck" (a presentation web app)

You are building a **presentation web app**: a full-screen, keyboard-driven slide deck that our team will present live from a laptop to a projector at a hackathon final. It pitches our product, **HACKMUSE**. HACKMUSE is a web app where you pitch a hackathon idea, four AI judges debate it out loud around a round table, and you get a weighted score with strengths and risks.

The deck must look like it was made by the same designer as the product: **neo-brutalist "courtroom" style** (cream paper, ink outlines, hard blood-red offset shadows, coral actions, teal chrome, stamps and stickers). Every slide should feel designed, not templated. It's a stage piece: big type, one idea per slide, motion that lands on the beat.

Read the whole brief before writing code. Build in the order given in **Section 7**.

---

## 1. Non-negotiables

1. **Stack:** React + TypeScript + Vite + Tailwind + `framer-motion`. Use `lucide-react` only for small UI glyphs in the deck chrome (arrows, fullscreen, grid). **No emojis anywhere.** No stock photos and no AI-generated images: every visual is built from typography, shapes, SVG and the textures defined below.
2. **Fixed 16:9 stage.** Every slide is authored on a **1920×1080 canvas** that is scaled uniformly to fit the window (letterboxed on an ink `#10201c` background). Use one `<Stage>` component that computes `scale = min(innerWidth/1920, innerHeight/1080)` and applies `transform: scale()` from the centre. Text never reflows when the window resizes; it scales. This matters on projectors.
3. **All copy lives in one file**, `src/deck/slides.ts`, as typed data (title, kicker, body, bullets, notes, and so on), so the team can edit wording without touching layout code. Slide layouts are components in `src/deck/slides/`; they read their copy from that data.
4. **Never invent statistics, market sizes, user counts, quotes, logos or testimonials.** Where a number would help but we don't have one, render a visible placeholder chip, `[[VERIFY: what to look up]]`, styled as a mustard sticker so it can't be missed. The only real numbers are the ones listed in **Section 6**, and they are all real.
5. **Accessibility and robustness:** respect `prefers-reduced-motion` (fade only, no slams or shakes). All text keeps at least 4.5:1 contrast with its background. The deck works offline once loaded: no runtime API calls, fonts via Google Fonts `<link>` in `index.html` with `display=swap`.

---

## 2. Design system (copy exactly)

### 2.1 Colour tokens

Define these as CSS variables in `index.css` and expose them in `tailwind.config` as colours with the same names:

| token | hex | use |
|---|---|---|
| `cream` | `#f1ecdf` | page and slide background |
| `paper` | `#faf7ef` | cards, panels |
| `ink` | `#10201c` | text, all borders, terminal panels, letterbox |
| `teal` | `#3d5e56` | top chrome bars, section bands |
| `teal-deep` | `#1d3631` | dark panels |
| `blood` | `#7b1a14` | **hard offset shadows only** |
| `coral` | `#e8736a` | primary actions, The Shark, highlights |
| `coral-deep` | `#c9544b` | stamps, error emphasis |
| `mustard` | `#e9b949` | The Chair, stickers, the round table |
| `sage` | `#c9d6cf` | secondary buttons, chips, quiet panels |
| `mint` | `#7fb3a5` | The Builder, "strengths" |
| `lilac` | `#b9a6e8` | The Visionary |

Selection colour is coral on ink.

### 2.2 Type

- **Display:** "Barlow Condensed", weights 600/700/800/900, usually 900, UPPERCASE, `leading-[0.86–0.9]`, `tracking-tight`. Slide titles are huge: 120–200px on the 1920 canvas.
- **Labels, kickers, buttons, data:** "Space Mono" 400/700, UPPERCASE, letter-spacing `0.2–0.3em`, 14–20px.
- **Body:** "Inter", 26–34px on the canvas, `leading-relaxed`, `ink/80`.
- **Outlined display text** (used for contrast words): `color: transparent; -webkit-text-stroke: 3px var(--ink)`.

### 2.3 Shape language

- Borders are **3px solid ink** everywhere (2px on small chips). **No rounded corners** except true circles (the round table, the spinning sticker).
- Shadows are **hard and offset, never blurred**: `8px 8px 0 0 var(--blood)` (cards), `14px 14px 0 0 var(--blood)` (hero cards), `4px 4px 0 0 var(--blood)` (small), `6px 6px 0 0 var(--ink)` (on coloured backgrounds).
- **Buttons/chips** press down. On `:active`, translate by the shadow offset and the shadow goes to `0 0`.

### 2.4 Textures (pure CSS/SVG, no image files)

- **Graph-paper grid** background on most slides: two `linear-gradient`s, 1px lines at `color-mix(in oklab, var(--ink) 9%, transparent)`, 36px cells.
- **Halftone dots:** `radial-gradient(var(--ink) 1px, transparent 1.4px)` at `9px 9px`. Used inside the round table, on spotlight hovers, and as a masked accent.
- **Diagonal hatching** for score bars and stamps: `repeating-linear-gradient(-45deg, currentColor 0 2px, transparent 2px 7px)`.
- **Film grain:** a fixed full-screen overlay using an inline SVG `feTurbulence` (fractalNoise, baseFrequency 0.85, 3 octaves) as a data-URI background, `mix-blend-mode: multiply`, opacity ~0.3, `pointer-events: none`, above slides but below the deck chrome.
- **Rubber-stamp roughness:** an SVG filter (`feTurbulence` baseFrequency 0.9 → `feDisplacementMap` scale 3) applied to stamp elements.

### 2.5 Reusable components (build these first, in `src/deck/ui/`)

- `BrutalCard`: paper background, 3px ink border, blood shadow, optional header strip (ink or teal band with Space Mono label and three tiny squares in coral/mustard/mint on the right, like a window title bar).
- `Kicker`: Space Mono uppercase label, optionally preceded by a blinking 8px coral square.
- `Sticker`: small mustard (or coral) label, 2px ink border, `rotate(-3deg to -6deg)`, ink hard shadow, optional slow wiggle animation (±3deg, 2.4s).
- `Stamp`: double 5px coral-deep border, coral-deep text in Barlow 900 uppercase, rotated about −9deg, roughness filter. Enters with a **slam**: from `scale 3.2, rotate −28deg, opacity 0` to `scale 1, rotate −9deg`, spring stiffness 420 / damping 18. The **parent card shakes** briefly when it lands: x `[0,−7,6,−4,3,0]`.
- `SpinningSticker`: 180px mustard circle, 4px ink border, text on a circular SVG `textPath` ("★ NO MERCY ★ NO FLUFF ★ HONEST SCORES ★ OUT LOUD"), rotating once every 18s, a big `§` glyph in the centre.
- `MarqueeBand`: a full-bleed band, tilted −2.5deg (teal, cream text, Barlow 900) or +1.5deg (coral, ink text, Space Mono), scrolling infinitely. Items separated by a mustard `✦` or ink `◆`.
- `JudgeSeat`: square glyph tile in the judge's colour + name + role + a 10-bar waveform. **Active** state: lifts 8%, scales 1.1, fills with the judge's colour, gets a blood shadow and a black "● SPEAKING" tag rotated −4deg on its top-right corner. **Target** state: coral "CALLED OUT" tag top-left.
- `RoundTable`: a mustard circle, 44% of its square container, 3px ink border, `10px 10px 0 0 blood` shadow, halftone inner disc at 20% opacity, dashed inner ring. Four `JudgeSeat`s sit north (Chair), west (Shark), east (Builder) and south (Visionary). A **dashed live-mic ring** in the speaker's colour rotates slowly around the table while someone speaks. A **reply beam** (SVG arc along the table's rim, 2.6px ink stroke under a 1.3px dashed stroke in the speaker's colour, marching-ants animation) draws from the speaker to the judge they answer.
- `Terminal`: ink panel, title bar with three squares and `court_record.log`, Space Mono 20px lines like `[05] SHARK → visionary › text…`, speaker names in their colour, blinking block caret.
- `ScoreBar`: a label row (owner glyph tile, criterion name in Barlow 900, `×25%` weight in mono) + a 16px-high bar with 2px ink border, filled with hatching in the owner judge's colour. Width animates from 0 to the score when the slide enters.
- `Counter`: animated number (count up with ease-out over ~1.3s, tabular numerals).
- `ArchNode` / `ArchEdge`: brutalist boxes for the architecture diagram, connected by SVG paths with animated dashes ("data flowing").

### 2.6 Motion language

- **Entrances** stagger 60–90ms per element. Headlines reveal **word by word**: each word rises 80px with `blur(10px)` to `blur(0)` + opacity, `ease [0.22, 1, 0.36, 1]`, 0.55s.
- **Big words** can enter line by line from a clipped mask (`overflow: hidden` + `y: 110% → 0%`).
- **Slide transition:** the incoming slide slides in from the right by 6% with a slight −1deg rotation settling to 0, while the outgoing one drops 4% and fades. 450ms, no crossfade mush. Going backwards reverses the direction.
- **Numbers count up**, **bars fill**, **stamps slam**, **stickers wiggle**, **marquees run**. Nothing loops distractingly behind body text.
- **Custom cursor (deck-wide, precise pointers only):** a 6px dot plus a 26px square frame that trails on a snappy spring (stiffness 620, damping 38, mass 0.35), both cream with `mix-blend-mode: difference` so they read on any background. Over a button or link, the frame **snaps around the element as four corner brackets** (12px L-shapes, 3px thick, 7px padding). It never covers content. The element's `data-cursor` label appears as a coral Space Mono sticker above it, or below near the top edge. A square ripple appears on click. Hide the native cursor only when this component is active.

---

## 3. Deck shell (`src/deck/Deck.tsx`)

- **Navigation:** `→`, `Space`, `PageDown`, click on the right 70% of the stage = next. `←`, `PageUp`, click on the left 30% = previous. `Home`/`End`. Number keys `1–9` jump to that slide. Swipe on touch.
- **URL deep link:** `?slide=7` (1-based). Update on navigation with `history.replaceState`.
- **Chrome** (outside the scaled stage, auto-hides after 2s of no mouse movement): a 6px coral **progress bar** at the very top; bottom-left a Space Mono counter `07 / 14` plus the current section name; bottom-right icon buttons for overview, notes and fullscreen.
- **`O` = overview:** a grid of live mini-renders of every slide (scaled thumbnails, 4 per row), current slide outlined with a coral 4px border. Click to jump. `Esc` closes.
- **`N` = presenter view:** opens `/?presenter` in a new window. It shows the current slide large, the **next slide** small, the **speaker notes** in 28px Inter, a **timer** (counts up from the first navigation, turns coral after the target time) and a target pace (`target 4:00`). The two windows stay in sync via `BroadcastChannel('hackmuse-deck')`.
- **`F` = fullscreen** (Fullscreen API).
- **`B` = blackout** (ink screen with a small spinning sticker), press again to return.
- **Print / PDF:** `@media print` renders every slide as its own 1920×1080 page (scaled to fit 16:9 landscape), with animations in their final state. Add a "Download PDF" hint in the overview (it just calls `window.print()`).
- **Appendix:** slides after the closing slide are marked `appendix: true`. The counter shows `A1`, `A2`… and the progress bar stops at 100% on the closing slide.

---

## 4. The slides

Each slide below gives **purpose → layout → exact copy → visuals and motion → speaker notes**. Copy goes into `slides.ts`. Keep the wording; it has been edited. Target: **main deck 4:00**. Slide 8 (live demo) gets about 60 s, slide 10 about 25 s, the other twelve about 13 s each.

### Slide 1: Title
- **Purpose:** name and promise in one look.
- **Layout:** grid background. Left 60%: kicker, then the huge headline in four stacked lines; right: the `SpinningSticker`, and below it a `BrutalCard` "case file" mock.
- **Copy:**
  - Kicker: `AI JUDGING PANEL · GEMMA 4 × ELEVENLABS`
  - Headline lines: `PUT YOUR` / `HACKATHON` (outlined) / `IDEA` / `ON TRIAL.`. The last line is set inside a coral box with a 3px ink border and `14px 14px 0 0 blood` shadow, rotated −3deg.
  - Product name sticker (mustard, top-left of the headline): `HACKMUSE`
  - Bottom line (Space Mono): `[[TEAM NAMES]] · HACKTOBERFEST HACK DAY LINZ · 30 OCT 2026`
  - Case-file card: header strip `CASE FILE № 0001`, body text typing out (typewriter, 38ms/char) `A plant that texts you when it's thirsty, in the voice of a disappointed parent`, coral button `SUMMON THE JUDGES →`.
- **Motion:** headline lines rise from masks (0.05/0.15/0.25s), the coral `ON TRIAL.` box slams in at 0.7s (scale 2.4 → 1, rotate −14 → 0, spring), the sticker spins, the card drops in from +40px with a 2deg tilt settling to 0.
- **Notes:** "We built HACKMUSE today. You type a hackathon idea, and four AI judges argue about it out loud before you've written a line of code."

### Slide 2: The problem
- **Purpose:** feel the pain.
- **Layout:** a horizontal **hackathon timeline** across the full width (thick ink line with hour ticks: `14:00 kickoff` → `21:00 judging`). At the far right end, a coral `Stamp` reading `FEEDBACK ARRIVES HERE`. Above the line, a giant headline.
- **Copy:**
  - Kicker: `THE PROBLEM`
  - Headline: `YOU FIND OUT YOUR IDEA WAS WEAK AT THE WORST POSSIBLE MOMENT.`
  - Three small mono annotations pinned along the timeline: `14:10 — idea picked in 10 minutes` · `17:30 — too late to pivot` · `21:00 — the judges ask the obvious question`
- **Motion:** the timeline draws left to right (pathLength 0 → 1, 1.2s). The annotations pop as the line reaches them. The stamp slams when the line hits the end and the slide shakes.
- **Notes:** "At a hackathon the idea is picked fast, then defended for hours. The first honest critique comes from the judges, after the building is done."

### Slide 3: Why existing feedback fails
- **Layout:** three `BrutalCard`s in a row, each with a big Barlow numeral (`01–03`), a title and one line. Each card is tilted slightly differently (−1.5deg, 0.5deg, −0.5deg).
- **Copy:**
  - Kicker: `WHY IT KEEPS HAPPENING`
  - Headline: `EVERYONE IS TOO NICE, TOO BUSY, OR TOO AGREEABLE.`
  - Card 1, `FRIENDS`: "They're on your team. They want it to be good."
  - Card 2, `MENTORS`: "There are a few of them and a hundred of you."
  - Card 3, `A CHATBOT`: "One voice, and it tends to agree with whoever is typing."
- **Motion:** cards drop in one by one like papers slapped on a desk (y −60 → 0, rotate overshoot, spring). Hovering a card shows the halftone spotlight following the mouse.
- **Notes:** "Feedback exists, but it isn't adversarial. Nobody's job is to attack your idea from several angles at once."

### Slide 4: Audience
- **Layout:** left: headline. Right: a 2×2 grid of persona cards. The primary persona is twice as big and coloured coral.
- **Copy:**
  - Kicker: `WHO IT'S FOR`
  - Headline: `ANYONE ABOUT TO BET A WEEKEND ON AN IDEA.`
  - Primary card (coral, big): `HACKATHON TEAMS` "Students, first-timers, solo hackers. Pressure-test the idea in the first hour, not the last."
  - `ORGANISERS & MENTORS`: "Run practice judging at scale. Spend mentor time on the hard questions."
  - `UNIVERSITIES & INCUBATORS`: "Idea sprints and pitch classes with instant, structured critique."
  - `FOUNDERS BEFORE A PITCH`: "Hear the investor objection before the investor does."
  - Footer chip: `[[VERIFY: participants per year at events like this, e.g. MLH stats]]`
- **Motion:** the primary card scales in first with a stamp-like overshoot, then the three smaller ones pop.
- **Notes:** "Our first user is the person standing in this room at 2pm with an idea and no one to argue with."

### Slide 5: The insight
- **Layout:** a typographic slide. One giant statement across two lines, the second outlined. Behind it, very faint, the word `DISAGREE` repeated as a rotated background pattern at 4% ink.
- **Copy:**
  - Kicker: `THE INSIGHT`
  - Statement: `ONE AI THAT AGREES IS USELESS.` / `A PANEL THAT ARGUES IS A COACH.`
  - Sub (Inter): "Ideas get better under cross-examination. So we built the cross-examination."
- **Motion:** words reveal one by one (blur-up). The outlined line fills with ink from left to right after 1s, like ink soaking in (a clip-path wipe of a solid copy over the outline).
- **Notes:** "This is the core idea. Disagreement is the feature."

### Slide 6: The solution: how it works
- **Layout:** three tall steps, left to right, joined by chunky ink arrows. Each step is a coloured `BrutalCard` (coral, mustard, mint) with a big step number, a title, one line and a small built-from-shapes illustration.
- **Copy:**
  - Kicker: `HACKMUSE`
  - Headline: `FROM PITCH TO VERDICT IN NINETY SECONDS.`
  - `01 PITCH IT`: "Write it like you'd say it to a teammate." Illustration: a mini textarea with grey lines and a tiny coral `SUMMON →` button.
  - `02 HEAR THE DEBATE`: "Four judges argue about it out loud, around a round table." Illustration: a mini `RoundTable` with four coloured seat squares.
  - `03 GET THE VERDICT`: "A score out of 100, the strengths to lean on, the risks to fix." Illustration: a mini score card `64` with a tiny `PROMISING` stamp.
- **Motion:** steps enter sequentially. Arrows draw between them. The mini round table's seats light up in turn, and the mini stamp slams last.
- **Notes:** "One input. About ninety seconds of audio. One weighted score."

### Slide 7: Meet the panel
- **Layout:** four tall judge cards in a row (same design as the app: coloured header with a big glyph tile and a `SEAT 0X` tag, paper body with role, name, catchphrase, owned-criteria chips, voice line). The cards tilt in 3D toward the mouse (±10deg, spring).
- **Copy (exact):**
  - `§` **THE CHAIR**, Moderator, mustard. "Order. The idea is on the table." Chips: `FINAL VERDICT`. `VOICE · DANIEL / ELEVENLABS`
  - `$` **THE SHARK**, Skeptical VC, coral. "Who pays for this, and why now?" Chips: `IMPACT`. `VOICE · BRIAN / ELEVENLABS`
  - `#` **THE BUILDER**, Pragmatic engineer, mint. "Cool. What's the hard part?" Chips: `FEASIBILITY` `TECH DEPTH`. `VOICE · CHARLIE / ELEVENLABS`
  - `*` **THE VISIONARY**, Product designer, lilac. "Forget the spec. Show me the moment." Chips: `ORIGINALITY` `DEMO WOW`. `VOICE · JESSICA / ELEVENLABS`
  - Headline above: `FOUR SEATS. FOUR AGENDAS.`
- **Motion:** cards deal in from below with alternating ±3deg rotations. On entry, each glyph tile spins 360° once.
- **Notes:** "Each judge owns part of the rubric and has their own voice. They're written to disagree."

### Slide 8: Live demo
- **Purpose:** the hand-off to the live app, with a safety net.
- **Layout:** left 55%: a big animated **`RoundTable` replay** of a real debate (data in Section 6, "Tab Roast Pro"). Right 45%: a caption card and a `Terminal` transcript. Top-right: a big coral button `OPEN LIVE APP →` linking to `[[APP_URL]]` (opens a new tab), with `data-cursor="demo"`.
- **Replay behaviour:** auto-plays when the slide becomes active. Each line: the speaker's seat activates, the live-mic ring takes their colour, and if the line has `replyTo` the rim beam draws to that judge and the target shows `CALLED OUT`. The caption card shows the speaker name in a coloured header with `— {cue}`, and the text **types out** at a speed proportional to its length (about 2.7 words/sec). The terminal appends the line. 0.4s gap between lines. `Space` pauses the replay **only while on this slide**; the arrows still navigate.
- **Optional audio:** if files exist at `/audio/tab-roast/01.mp3 … 08.mp3`, play them in sync instead of timed typing (the team can record them from the app). If a file 404s, fall back silently to timed captions.
- **Copy:** Kicker `LIVE DEMO`. Small mono line under the button: `BACKUP: A REAL DEBATE GEMMA 4 WROTE FOR US TODAY`.
- **Notes:** "Let's put a real idea on trial." (Switch to the app. If the Wi-Fi dies, stay on this slide; it replays a real run.)

### Slide 9: The verdict
- **Layout:** a two-column scorecard, exactly like the app. Left: a `BrutalCard` with `OVERALL · WEIGHTED`, a giant counter `64` with `/100`, the `PROMISING` stamp slamming top-right, blurb `THERE'S A REAL IDEA IN HERE.`, the Chair's verdict as a quote with a 6px mustard left border, then three vote tiles (Shark 2, Builder 7, Visionary 9) in judge colours. Right: a teal-header `BrutalCard` `CRITERIA BREAKDOWN` with five `ScoreBar`s and their notes, then two small cards `LEAN ON` (mint, `+` bullets) and `FIX FIRST` (coral, `!` bullets).
- **Data:** "Tab Roast Pro", Section 6. Use the exact scores and notes.
- **Motion:** counter 0 → 64 over 1.3s, bars fill staggered 100ms, stamp slams at 1.4s with the card shake, vote tiles rise after.
- **Notes:** "Five criteria, weighted into one number. The judges' personal votes disagree: the Shark gave it a 2, the Visionary a 9. That spread is the useful part."

### Slide 10: Under the hood (architecture)
- **Layout:** a left-to-right flow diagram on a grid background, built from `ArchNode`s (paper boxes, 3px ink border, blood shadow, a Space Mono label strip on top, a Barlow name, one line of detail) and `ArchEdge`s (thick ink SVG paths with marching-dash overlays showing direction).
- **Nodes (exact):**
  1. `BROWSER`: "Next.js 16 · React 19 · Motion · Lenis". Sub-items as chips: `ROUNDTABLE UI`, `DEBATE ENGINE`, `CAPTIONS + WAVEFORM`
  2. `/api/debate`: "Route handler · streams NDJSON"
  3. `GEMMA 4`: "gemma-4-26b-a4b-it · Google AI Studio · streamGenerateContent (SSE) · thinking: minimal". Coloured mustard.
  4. `JSON-LINES SCANNER`: "pulls each complete {…} out of the token stream"
  5. `/api/tts`: "Route handler · one voice per judge"
  6. `ELEVENLABS`: "eleven_multilingual_v2 · 4 voices · per-judge voice settings". Coloured lilac.
- **Edges:** Browser → /api/debate (`idea`) → Gemma 4 (`prompt`) → Scanner (`tokens`) → back to Browser (`title · line · line · … · scores`, drawn as a long return path along the bottom). Browser → /api/tts (`line + speaker`) → ElevenLabs → Browser (`audio/mpeg`).
- **Callout stickers pinned to the diagram:** `LINE 1 IS VOICED WHILE GEMMA WRITES LINE 3` · `SCORE COMPUTED SERVER-SIDE` · `NO KEY? DEMO MODE / CAPTIONS-ONLY`.
- **Motion:** nodes pop in following the data flow, edges draw in order, and the dashes keep flowing slowly after.
- **Notes:** "Gemma 4 streams the debate as JSON Lines. We forward each line the moment it's complete, so the first judge starts talking while Gemma is still writing the rest."

### Slide 11: Why it feels live (the engineering win)
- **Layout:** a giant before/after comparison. Two huge horizontal bars on a seconds axis (0–30s): the top bar (sage, hatched) `DEFAULT THINKING: 25.8 s TO FIRST WORD`, the bottom bar (coral, solid) `STREAMING + MINIMAL THINKING: 1.1 s`. A big counter shows `≈23×` faster (25.8 / 1.1), with fine print in Space Mono: `SINGLE MEASURED RUN EACH · 30 OCT 2026`. Below, three mono facts in chips.
- **Copy:**
  - Kicker: `THE HARD PART`
  - Headline: `WAITING 26 SECONDS KILLS A DEMO. SO WE STREAM.`
  - Chips: `FIRST LINE ≈ 1–2 S` · `FULL DEBATE ≈ 7–13 S` · `SCORES NEVER INVENTED — RE-ASKED IF MISSING`
- **Motion:** both bars grow at real-time-proportional speed: the coral one finishes almost instantly, then the sage one crawls (sped up 4×, with a `4× SPEED` sticker). The `23×` counter counts up when the sage bar finishes.
- **Notes:** "Gemma 4 thinks before it answers. With default thinking we waited 26 seconds for the first word. Minimal thinking plus streaming brought that down to about one second."

### Slide 12: The sales pitch (business model)
- **Layout:** a one-liner at the top in a coral box, then three pricing-style columns as `BrutalCard`s, the middle one raised and mustard with a `MOST USEFUL` sticker.
- **Copy:**
  - Kicker: `THE PITCH`
  - One-liner: `HACKMUSE IS THE PRACTICE JUDGING PANEL EVERY HACKER GETS IN THE FIRST HOUR.`
  - Column 1, `HACKERS · FREE`: "Unlimited trials of your own ideas" · "All four judges, voiced" · "Scorecard you can copy"
  - Column 2, `ORGANISERS · [[PRICE TBD]] PER EVENT`: "Your event's real rubric and judges' personas" · "Practice-judging station for every team" · "Anonymous idea-quality overview for mentors"
  - Column 3, `SCHOOLS & INCUBATORS · [[PRICE TBD]]`: "Idea sprints for a whole class" · "Custom panels (investor, professor, customer)" · "Progress across resubmissions"
  - Footer: `[[VERIFY: pricing and any market numbers before showing this slide]]`
- **Motion:** the one-liner box slams in, the columns rise, and the middle one lands last and highest.
- **Notes:** "Free for hackers. Organisers pay to run it with their own rubric. That's the business."

### Slide 13: Roadmap
- **Layout:** a horizontal track with three stations (`NEXT WEEK`, `NEXT MONTH`, `LATER`) on a thick ink line, each station a small `BrutalCard` with two or three items. A `YOU ARE HERE` sticker sits at the start.
- **Copy:**
  - `NEXT WEEK`: "Real event rubrics as presets" · "Share card for your verdict"
  - `NEXT MONTH`: "Talk back: live Q&A with one judge (ElevenLabs conversational agent)" · "Resubmit and see the score move"
  - `LATER`: "Custom panels for any domain" · "Multilingual judges" · "Organiser dashboard"
- **Motion:** the line draws, stations pop in order, and the sticker wiggles.
- **Notes:** "The obvious next step is letting you argue back."

### Slide 14: Close
- **Layout:** full-bleed coral background. Giant headline in ink, the `SpinningSticker`, a big paper-tone QR placeholder box (`[[QR TO APP_URL]]`, 3px ink border, blood shadow), and a **giant outlined `HACKMUSE` wordmark** at the bottom, cropped by the slide edge, that fills with ink when hovered.
- **Copy:**
  - Kicker: `THE FLOOR IS YOURS`
  - Headline: `YOUR IDEA. THEIR VERDICT.`
  - Line: `Try it: [[APP_URL]]`
  - Team line: `[[TEAM NAMES]] · BUILT IN ONE DAY AT HACKTOBERFEST HACK DAY LINZ`
- **Motion:** the headline words slam in one by one, the wordmark slides up from below, and a slow teal marquee band of sample ideas runs behind at 30% opacity.
- **Notes:** "Put your idea on trial. Thank you."

### Appendix A1: Rubric and the scoring math
- Five `ScoreBar`-style rows showing **weights** (not scores): Originality 25% (Visionary) · Feasibility 20% (Builder) · Impact 20% (Shark) · Tech Depth 15% (Builder) · Demo Wow 20% (Visionary). The formula is set in Space Mono in a terminal panel: `overall = round(10 × Σ weightᵢ × scoreᵢ)` with the worked example `0.25·7 + 0.20·9 + 0.20·3 + 0.15·4 + 0.20·8 = 6.35 → 64`. Grade bands as chips: `≥85 SHIP IT` · `70–84 CONTENDER` · `55–69 PROMISING` · `40–54 REWORK` · `<40 PIVOT`. Note chip: `PLACEHOLDER RUBRIC — SWAPS FOR ANY EVENT'S CRITERIA`.

### Appendix A2: Prize-track fit
- Four cards: `BEST USE OF GEMMA 4` (streams the whole debate + scores from gemma-4-26b-a4b-it; minimal thinking for live latency) · `BEST USE OF ELEVENLABS` (four distinct judge voices with per-persona voice settings; delivery cues ready for eleven_v3 audio tags) · `BEST USE OF LOVABLE` (this deck was built in Lovable) · `BEST OPEN-SOURCE AI PROJECT` (`[[VERIFY: licence + public repo link]]`).

### Appendix A3: Reliability
- Three columns: `NO GEMMA KEY → DEMO MODE` (scripted debate, clearly labelled DEMO) · `NO ELEVENLABS KEY → CAPTIONS ONLY` (timed captions + synthetic waveform) · `STREAM DROPS SCORES → RE-ASK` (a second, scores-only Gemma call; never invented). A headline above: `THE SHOW NEVER STALLS, AND NEVER FAKES A RESULT.`

### Appendix A4: Built today
- A big mono checklist with animated ticks: `Landing page` · `Live roundtable debate` · `Streaming Gemma 4` · `ElevenLabs voices` · `Scorecard` · `Custom cursor + motion system` · `This deck (Lovable)`. Stack chips: `Next.js 16` `React 19` `Tailwind 4` `Motion` `Lenis` `Gemma 4` `ElevenLabs` `ui-layouts components`.

---

## 5. Speaker-notes rules

- Notes are plain sentences, 1–3 per slide, spoken style.
- The presenter view shows notes in 28px Inter, with any `(stage direction)` text in Space Mono and italics.

---

## 6. Data appendix: real numbers and real outputs only

### 6.1 Measured on 2026-10-30 (Gemma 4 via Google AI Studio)
- First answer token, default thinking: **25.8 s**
- First answer token, `thinkingLevel: minimal`, streaming: **1.1 s**
- Full 8-line debate + scores, streaming: **7–13 s** (one outlier run: 26 s to the first line, which was server variance)
- Model: **gemma-4-26b-a4b-it**. Debate: **8 lines**, **4 judges**, **5 criteria**.

### 6.2 Real debate: "Tab Roast Pro"
Idea: *"A browser extension that roasts your open tabs in a sarcastic voice until you close them"*

| # | speaker | replyTo | cue | text |
|---|---|---|---|---|
| 1 | chair | — | dry | Welcome back; we are looking at a browser extension that uses a sarcastic voice to roast your open tabs until you close them. |
| 2 | shark | — | skeptical | It is a gimmick. There is no business model here and zero retention once the joke wears off. |
| 3 | builder | — | measured | Technically, it is just a manifest V3 extension calling an LLM via OpenAI's API and Web Speech API. It is very doable. |
| 4 | visionary | — | excited | But the demo moment! Hearing a digital voice insult your procrastination is pure, chaotic delight. |
| 5 | shark | visionary | blunt | Delight doesn't pay the bills, Visionary. This is a toy, not a tool. |
| 6 | builder | shark | firm | Shark, it is a perfect hackathon project because the implementation complexity is low and the API integration is clean. |
| 7 | visionary | builder | warm | Exactly, Builder! It is about the emotional connection to the interface, even if that connection is through mockery. |
| 8 | chair | — | dry | The verdict: high demo potential, but massive risk of being a one-time novelty. |

Scores: Originality **7** "A funny twist on the classic productivity niche." · Feasibility **9** "Standard LLM and browser API integration makes this a breeze." · Impact **3** "Most users will just mute the extension after three minutes." · Tech Depth **4** "It is essentially a wrapper around a text-to-speech API." · Demo Wow **8** "The audio component will definitely get a laugh from the crowd."
Votes: Shark **2**, Builder **7**, Visionary **9**. Overall **64 / 100**, grade **PROMISING**.
Verdict: "A high-energy novelty that lacks a sustainable product roadmap."
Strengths: "Strong demo potential", "Low technical barrier". Risks: "Lack of long-term utility", "No clear monetization".

### 6.3 Second real verdict: "Voice Expense Tracker" (for an optional extra card)
Idea: *"Voice-first expense tracker you talk to while walking out of the shop"*. Overall **57 / 100**, **PROMISING**. Originality 4, Feasibility 9, Impact 4, Tech Depth 3, Demo Wow 8. Votes: Shark 3, Builder 6, Visionary 8. Verdict: "A high-polish demo tool that lacks a moat."

### 6.4 Sample ideas (for marquees and the typewriter)
A plant that texts you when it's thirsty, in the voice of a disappointed parent · Turn any lecture recording into a 5-minute podcast with two AI hosts · A Tinder-style swipe app for picking which open-source issue to fix next · AR glasses that subtitle what your grandmother says in her dialect · A browser extension that roasts your tabs until you close them · Voice-first expense tracker you talk to while walking out of the shop · A multiplayer whiteboard where an AI critic sketches counter-arguments · Find a study buddy at your uni by matching your actual timetables

---

## 7. Build order

1. Tokens, fonts, textures, grain overlay, `Stage` scaling, the deck shell with keyboard navigation, progress, counter and URL sync.
2. The `ui/` components from 2.5, plus a hidden `/kitchen-sink` route that shows each one.
3. Slides 1–7.
4. `RoundTable` + `Terminal` + the slide 8 replay engine (timed captions first, optional audio second).
5. Slides 9–14 and the appendix.
6. Overview (`O`), presenter window (`N`) with BroadcastChannel sync and timer, blackout (`B`), fullscreen (`F`), print/PDF.
7. The custom cursor, reduced-motion pass, final polish.

## 8. Acceptance checklist (verify before you call it done)

- [ ] At 1280×720, 1920×1080 and 2560×1440 every slide looks identical, just scaled. No text overflows its box at any size.
- [ ] `→ ← Space Home End 1–9 O N F B Esc` all work. `?slide=9` opens slide 9.
- [ ] Presenter window stays in sync both ways and shows the next slide, notes and the timer.
- [ ] Slide 8 replays all 8 real lines with beams on lines 5–7, then stops. Re-entering the slide restarts it.
- [ ] Slide 9 shows 64/100 with the exact scores, votes and notes from 6.2.
- [ ] No invented statistics. Every unknown is a visible `[[VERIFY]]` / `[[…]]` sticker.
- [ ] No emojis, no stock images, no rounded corners except circles, no blurred shadows.
- [ ] `prefers-reduced-motion` turns slams, shakes, marquees and 3D tilts into simple fades.
- [ ] Print preview shows one slide per landscape page, in final states.

## 9. Don'ts

- Don't use a generic slide template, gradients, glassmorphism, drop shadows with blur, or pastel "SaaS" styling.
- Don't put more than about 25 words of body text on a main slide. Let the type be the visual.
- Don't add slides, sections or claims that aren't in this brief. If something is missing, add a `[[…]]` placeholder sticker instead of guessing.

--- END OF FIRST PROMPT ---

## Follow-up prompts (send one at a time after the first build)

**Follow-up 1: polish pass**
> Go slide by slide at 1920×1080 and fix anything that overflows, collides or looks unbalanced. Tighten headline line-breaks so no line has a single orphaned word. Make sure every slide has one dominant element (headline, number or diagram) and that hard shadows all point down-right with the same offset system. Then run the acceptance checklist in Section 8 and fix what fails.

**Follow-up 2: demo slide robustness**
> On slide 8, add a small control strip under the transcript (Space Mono buttons in the brutalist style): previous line, play/pause, next line, restart. They only respond while slide 8 is active. Add an `A` key that toggles the optional audio files on or off, shown as a sticker `AUDIO ON` / `CAPTIONS`. Make sure leaving the slide stops audio immediately.

**Follow-up 3: presenter rehearsal mode**
> In the presenter window, add a "rehearsal" toggle that shows per-slide elapsed time against a target (slides 1–14 add up to 4:00: slide 8 is 60 s, slide 10 is 25 s, every other slide 13 s). Colour the per-slide timer mint when on pace and coral when over. Add a "reset timer" button.
