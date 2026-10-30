import { JUDGES, type JudgeId } from "@/lib/judges";
import { cn } from "@/lib/utils";

// Brutalist portraits: a square paper head, square eyes, and one prop per judge
// (wig, shark fin + shades, hard hat, beret, halo, headset). Drawn on a 64×64
// grid so they're centred by construction at any size.

const INK = "var(--ink)";
const PAPER = "var(--paper)";

function Head({ talking }: { talking: boolean }) {
  return (
    <>
      <rect x="17" y="19" width="30" height="31" fill={PAPER} stroke={INK} strokeWidth="3" />
      <rect x="23" y="29" width="5" height="5" fill={INK} />
      <rect x="36" y="29" width="5" height="5" fill={INK} />
      <rect
        x="26"
        y="40"
        width="12"
        height="5"
        fill={INK}
        className={talking ? "judge-mouth-talk" : undefined}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
      {/* neck + shoulders */}
      <rect x="27" y="50" width="10" height="4" fill={INK} />
      <path d="M8 64 L12 56 L52 56 L56 64 Z" fill={INK} />
    </>
  );
}

const PROPS: Record<JudgeId, React.ReactNode> = {
  chair: (
    <>
      {/* barrister wig */}
      <rect x="15" y="13" width="34" height="8" fill={PAPER} stroke={INK} strokeWidth="3" />
      {[22, 30, 38, 46].map((y) => (
        <g key={y}>
          <circle cx="13" cy={y} r="4" fill={PAPER} stroke={INK} strokeWidth="2.5" />
          <circle cx="51" cy={y} r="4" fill={PAPER} stroke={INK} strokeWidth="2.5" />
        </g>
      ))}
    </>
  ),
  shark: (
    <>
      {/* fin + shades */}
      <path d="M27 19 L38 4 L39 19 Z" fill="#5c6b70" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <rect x="19" y="27" width="26" height="8" fill={INK} />
      <rect x="22" y="28" width="4" height="2" fill={PAPER} opacity="0.7" />
    </>
  ),
  builder: (
    <>
      {/* hard hat */}
      <path d="M18 19 Q18 7 32 7 Q46 7 46 19 Z" fill="var(--mustard)" stroke={INK} strokeWidth="3" />
      <rect x="13" y="18" width="38" height="5" fill="var(--mustard)" stroke={INK} strokeWidth="3" />
      <rect x="30" y="8" width="4" height="10" fill={INK} />
    </>
  ),
  visionary: (
    <>
      {/* beret + round glasses */}
      <ellipse cx="30" cy="16" rx="17" ry="6" fill="var(--coral)" stroke={INK} strokeWidth="3" transform="rotate(-10 30 16)" />
      <rect x="29" y="6" width="3" height="5" fill={INK} />
      <circle cx="25.5" cy="31.5" r="5.5" fill="none" stroke={INK} strokeWidth="2.5" />
      <circle cx="38.5" cy="31.5" r="5.5" fill="none" stroke={INK} strokeWidth="2.5" />
    </>
  ),
  angel: (
    <>
      {/* halo */}
      <ellipse cx="32" cy="10" rx="13" ry="4" fill="none" stroke="var(--mustard)" strokeWidth="4" />
      <ellipse cx="32" cy="10" rx="13" ry="4" fill="none" stroke={INK} strokeWidth="1.5" />
      <rect x="17" y="17" width="30" height="5" fill={INK} />
    </>
  ),
  operator: (
    <>
      {/* headset */}
      <path d="M14 32 Q14 10 32 10 Q50 10 50 32" fill="none" stroke={INK} strokeWidth="3.5" />
      <rect x="10" y="28" width="7" height="11" fill={INK} />
      <rect x="47" y="28" width="7" height="11" fill={INK} />
      <path d="M13 38 Q15 46 25 45" fill="none" stroke={INK} strokeWidth="2.5" />
      <rect x="24" y="43" width="4" height="4" fill="var(--coral)" stroke={INK} strokeWidth="1.5" />
    </>
  ),
};

export function JudgeAvatar({
  id,
  talking = false,
  className,
  framed = true,
}: {
  id: JudgeId;
  talking?: boolean;
  className?: string;
  /** Coloured square backdrop with an ink border. */
  framed?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex aspect-square items-center justify-center overflow-hidden",
        framed && "border-2 border-ink",
        className,
      )}
      style={framed ? { backgroundColor: JUDGES[id].color } : undefined}
      role="img"
      aria-label={JUDGES[id].name}
    >
      <svg viewBox="0 0 64 64" className="block h-full w-full">
        <Head talking={talking} />
        {PROPS[id]}
      </svg>
    </span>
  );
}
