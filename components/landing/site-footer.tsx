import { BrutalLink } from "@/components/ui/brutal-button";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t-[3px] border-ink bg-coral">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 pb-8 pt-20 sm:px-6 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.3em]">The floor is yours</p>
          <h2 className="mt-2 max-w-3xl font-display text-6xl font-black uppercase leading-[0.88] sm:text-8xl">
            Your idea. Their verdict.
          </h2>
        </div>
        <BrutalLink href="/#pitch" tone="paper" size="lg" cursor="pitch">
          Pitch an idea <span aria-hidden>↑</span>
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
          <span>Gemma 4 debates · ElevenLabs voices · UI bits from ui-layouts.com</span>
        </div>
      </div>
    </footer>
  );
}
