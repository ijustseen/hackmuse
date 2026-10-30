import Link from "next/link";
import { BrutalLink } from "@/components/ui/brutal-button";

const NAV = [
  { href: "/#panel", label: "The panel" },
  { href: "/#how", label: "How it works" },
  { href: "/#rubric", label: "Rubric" },
];

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" data-cursor="home" className={`group flex items-center gap-2.5 ${className}`}>
      <span className="relative inline-flex h-9 w-9 items-center justify-center border-2 border-ink bg-mustard font-display text-xl font-black text-ink shadow-[3px_3px_0_0_var(--blood)] transition-transform duration-300 group-hover:rotate-[-8deg]">
        H
        <span className="absolute -right-1.5 -top-1.5 h-3 w-3 border-2 border-ink bg-coral" />
      </span>
      <span className="font-display text-2xl font-black uppercase tracking-tight">Hackmuse</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-ink bg-teal text-cream">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo className="text-cream [&>span:last-child]:text-cream" />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="group relative overflow-hidden px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest"
            >
              <span className="block transition-transform duration-300 group-hover:-translate-y-full">{n.label}</span>
              <span className="absolute inset-x-3 top-full block text-mustard transition-transform duration-300 group-hover:-translate-y-full">
                {n.label}
              </span>
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 border-2 border-cream/40 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest lg:inline-flex">
            <span className="h-2 w-2 animate-blink bg-coral" /> Panel in session
          </span>
          <BrutalLink href="/#pitch" size="sm" cursor="pitch">
            Grade my idea
          </BrutalLink>
        </div>
      </div>
    </header>
  );
}
