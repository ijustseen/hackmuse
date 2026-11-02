import { FinShape } from "@/components/effects/shark-water";

const ISNT = [
  "A prediction of who wins. It rates the idea as written; teams, demos and polish win hackathons too.",
  "A judge of your code. It reads the pitch, not the repo.",
  "A replacement for talking to the people you're building for.",
  "A chatbot that agrees with you. Five critics who each hunt a different weakness are hard to flatter.",
];

const FAQ = [
  {
    q: "Is it free?",
    a: "Yes, grading your own ideas is free. We're building a paid version for hackathon organizers; if you run one, join the waitlist at the bottom of the page.",
  },
  {
    q: "Which AI is behind it?",
    a: "Gemma 4, Google's open-weight model, writes the debate and the panel's scores, and plays the 100 people in the feed. A second, slower Gemma pass compares your idea with past hackathon projects and scores the eight criteria 0–100.",
  },
  {
    q: "Does a high score mean I'll win?",
    a: "No. It means the idea, as you wrote it, held up against five tough critics. Treat it as the hardest feedback you'll get before the real judges, not as a forecast.",
  },
  {
    q: "Who sees my idea?",
    a: "To run the panel, your text goes to Google's Gemma API. We store the idea and its verdict so a share link can work, but nobody else can read it unless you press Share. Shared links are hidden from search engines.",
  },
  {
    q: "Can I use my hackathon's real rules?",
    a: "Yes. Pick “My event” and paste the rules, prizes and judging criteria. The sharks judge fit against them instead of a generic hackathon.",
  },
  {
    q: "Who are the 100 people in the feed?",
    a: "Simulated, not real. Gemma writes 100 personas across TikTok, Instagram, X, LinkedIn and Reddit, mostly people your idea is for plus some who are not. They react, see each other's posts and react again. The feed counts for 30% of the grade; the sharks count for 70%.",
  },
  {
    q: "Why sharks?",
    a: "Friends are on your team and mentors are busy. One chatbot tends to agree with whoever is typing. A tank of critics who each look for a different way ideas die is harder to fool.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 border-t-[3px] border-ink bg-cream py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">Straight answers</p>
          <h2 className="mt-2 font-display text-6xl font-black uppercase leading-[0.9] sm:text-7xl">What it isn&apos;t.</h2>
          <ul className="mt-8 space-y-4">
            {ISNT.map((item) => (
              <li key={item} className="flex gap-3 text-base leading-snug">
                <span className="mt-0.5 shrink-0">
                  <FinShape color="var(--coral)" size={26} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="border-[3px] border-ink bg-paper shadow-brutal">
          <div className="border-b-[3px] border-ink bg-teal px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.25em] text-cream">
            FAQ
          </div>
          <div className="divide-y-2 divide-dashed divide-ink/25">
            {FAQ.map((item) => (
              <details key={item.q} className="group p-4 [&_summary::-webkit-details-marker]:hidden">
                <summary
                  data-cursor="open"
                  className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-2xl font-black uppercase leading-tight"
                >
                  {item.q}
                  <span
                    aria-hidden
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center border-2 border-ink bg-mustard font-mono text-base transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-prose text-base leading-relaxed text-ink/80">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
