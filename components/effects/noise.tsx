// Adapted from ui-layouts "noise-effect" (https://www.ui-layouts.com/components/noise).
// Uses an inline SVG turbulence texture instead of the original /noise.gif asset.
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.06 0 0 0 0 0.12 0 0 0 0 0.1 0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
)}")`;

export function Noise({ opacity = 0.32 }: { opacity?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[90] mix-blend-multiply"
      style={{ backgroundImage: GRAIN, opacity }}
    />
  );
}
