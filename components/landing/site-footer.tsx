import { BrutalLink } from "@/components/ui/brutal-button";
import { WaitlistForm } from "@/components/ui/waitlist-form";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t-[3px] border-ink bg-coral">
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-20 sm:px-6">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">The tank is open</p>
        <h2 className="mt-2 max-w-3xl font-display text-6xl font-black uppercase leading-[0.88] sm:text-8xl">
          Get bitten here, not on stage.
        </h2>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 pb-6 sm:px-6 md:flex-row md:items-end">
        <div className="max-w-xl border-[3px] border-ink bg-paper p-5 shadow-brutal-sm">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">Running a hackathon?</p>
          <p className="mt-1 text-base leading-snug">
            Practice judging for every team, with your own rules as the rubric. Join the organizer waitlist.
          </p>
          <div className="mt-4">
            <WaitlistForm source="organizer" />
          </div>
        </div>
        <BrutalLink href="/#pitch" tone="paper" size="lg" cursor="pitch">
          Pitch the sharks <span aria-hidden>↑</span>
        </BrutalLink>
      </div>

      {/* Hover-to-fill wordmark, after ui-layouts "hover-footer". */}
      <div className="group relative select-none px-2">
        <p
          aria-hidden
          className="text-outline translate-y-[18%] text-center font-display text-[22vw] font-black uppercase leading-none transition-[color] duration-500 group-hover:text-ink"
        >
          Hackmuse
        </p>
      </div>

      <div className="relative border-t-[3px] border-ink bg-ink px-4 py-4 text-cream sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-widest">
          <span>Built at Hacktoberfest Hack Day · Linz · 2026</span>
          <span>Gemma 4 argues · UI bits from ui-layouts.com</span>
        </div>
      </div>
    </footer>
  );
}
