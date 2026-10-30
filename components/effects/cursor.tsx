"use client";

import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Variant = "default" | "wrap" | "label" | "text";

const INTERACTIVE = "[data-cursor], a, button, [role='button'], select";
const TEXT_INPUT = "textarea, input:not([type='range']):not([type='checkbox'])";
/** Targets up to this size get bracketed; bigger ones (cards) get a label tag instead. */
const WRAP_MAX = { w: 640, h: 120 };
const PAD = 7;
const IDLE = 26;

const SPRING = { stiffness: 620, damping: 38, mass: 0.35 };

interface Ripple {
  id: number;
  x: number;
  y: number;
}

/**
 * Brutalist cursor.
 * - An exact dot plus a trailing square frame, drawn with `mix-blend-mode:
 *   difference` so it reads on cream, ink, teal and coral alike.
 * - Over buttons and links the frame snaps around the element as corner
 *   brackets (content stays visible) and its `data-cursor` label rides above
 *   it as a sticker. Large targets (cards) keep the small frame plus sticker.
 * - Over text fields it becomes an I-beam. Clicks leave a stamp ripple.
 * Only mounts on precise pointers.
 */
export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [variant, setVariant] = useState<Variant>("default");
  const [label, setLabel] = useState("");
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  /** Sticker sits under the frame when there's no room above it. */
  const [below, setBelow] = useState(false);
  const state = useRef({
    variant: "default" as Variant,
    label: "",
    below: false,
    target: null as Element | null,
    x: -100,
    y: -100,
  });

  // Exact pointer (dot) and the frame's box (springs).
  const px = useMotionValue(-100);
  const py = useMotionValue(-100);
  const fx = useSpring(-100, SPRING);
  const fy = useSpring(-100, SPRING);
  const fw = useSpring(IDLE, SPRING);
  const fh = useSpring(IDLE, SPRING);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    // Enabling must happen after mount: the server can't know the pointer type.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(true);
    const root = document.documentElement;
    root.classList.add("has-custom-cursor");

    const update = (target: Element | null) => {
      const s = state.current;
      let next: Variant = "default";
      let nextLabel = "";
      let hit: Element | null = null;

      if (target?.closest(TEXT_INPUT)) {
        next = "text";
      } else {
        hit = target?.closest(INTERACTIVE) ?? null;
        if (hit && (hit as HTMLButtonElement).disabled) hit = null;
        if (hit) {
          const r = hit.getBoundingClientRect();
          next = r.width <= WRAP_MAX.w && r.height <= WRAP_MAX.h ? "wrap" : "label";
          nextLabel = hit.getAttribute("data-cursor") ?? "";
        }
      }

      let top: number;
      if (next === "wrap" && hit) {
        const r = hit.getBoundingClientRect();
        top = r.top - PAD;
        fx.set(r.left - PAD);
        fy.set(top);
        fw.set(r.width + PAD * 2);
        fh.set(r.height + PAD * 2);
      } else {
        const size = next === "label" ? 44 : IDLE;
        top = s.y - size / 2;
        fx.set(s.x - size / 2);
        fy.set(top);
        fw.set(size);
        fh.set(size);
      }

      const nextBelow = top < 34;
      if (nextBelow !== s.below) {
        s.below = nextBelow;
        setBelow(nextBelow);
      }
      s.target = hit;
      if (next !== s.variant || nextLabel !== s.label) {
        s.variant = next;
        s.label = nextLabel;
        setVariant(next);
        setLabel(nextLabel);
      }
    };

    const onMove = (e: PointerEvent) => {
      state.current.x = e.clientX;
      state.current.y = e.clientY;
      px.set(e.clientX);
      py.set(e.clientY);
      setVisible(true);
      update(e.target instanceof Element ? e.target : null);
    };
    // Smooth scroll moves the page under a still pointer: re-hit-test.
    const onScroll = () => {
      const { x, y } = state.current;
      if (x < 0) return;
      update(document.elementFromPoint(x, y));
    };
    let rippleId = 0;
    const onDown = (e: PointerEvent) => {
      setPressed(true);
      const id = ++rippleId;
      setRipples((r) => [...r, { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => setRipples((r) => r.filter((p) => p.id !== id)), 500);
    };
    const onUp = () => setPressed(false);
    const onLeave = () => setVisible(false);
    // The hovered element can vanish under a still pointer (e.g. a "Retry"
    // button replaced by new UI); re-hit-test so the sticker doesn't linger.
    const sweep = setInterval(() => {
      const s = state.current;
      if (s.target && !s.target.isConnected && s.x >= 0) update(document.elementFromPoint(s.x, s.y));
    }, 250);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.addEventListener("pointerleave", onLeave);
    return () => {
      clearInterval(sweep);
      root.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [px, py, fx, fy, fw, fh]);

  // A client-side navigation can remove the hovered element without a
  // pointermove; drop back to the default frame so nothing sticks.
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setVariant("default");
    setLabel("");
  }
  useEffect(() => {
    const s = state.current;
    s.variant = "default";
    s.label = "";
    s.target = null;
    fw.set(IDLE);
    fh.set(IDLE);
    fx.set(s.x - IDLE / 2);
    fy.set(s.y - IDLE / 2);
  }, [pathname, fx, fy, fw, fh]);

  if (!enabled) return null;

  const isText = variant === "text";
  const bracketed = variant === "wrap" || variant === "label";

  return (
    <>
      {/* Blended layer: inverts against whatever is underneath. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] mix-blend-difference">
        <motion.div
          className="absolute left-0 top-0"
          style={{ x: fx, y: fy, width: fw, height: fh }}
          animate={{ opacity: visible && !isText ? 1 : 0, scale: pressed ? 0.9 : 1 }}
          transition={{ duration: 0.15 }}
        >
          {bracketed ? (
            <>
              <span className="absolute left-0 top-0 h-3 w-3 border-l-[3px] border-t-[3px] border-cream" />
              <span className="absolute right-0 top-0 h-3 w-3 border-r-[3px] border-t-[3px] border-cream" />
              <span className="absolute bottom-0 left-0 h-3 w-3 border-b-[3px] border-l-[3px] border-cream" />
              <span className="absolute bottom-0 right-0 h-3 w-3 border-b-[3px] border-r-[3px] border-cream" />
            </>
          ) : (
            <span className="absolute inset-0 border-2 border-cream" />
          )}
        </motion.div>

        {/* Dot / I-beam */}
        <motion.div
          className="absolute left-0 top-0 bg-cream"
          style={{ x: px, y: py, translateX: "-50%", translateY: "-50%" }}
          animate={{
            width: isText ? 3 : 6,
            height: isText ? 26 : 6,
            opacity: visible ? 1 : 0,
          }}
          transition={{ duration: 0.12 }}
        />

        <AnimatePresence>
          {ripples.map((r) => (
            <motion.span
              key={r.id}
              className="absolute left-0 top-0 h-10 w-10 border-2 border-cream"
              style={{ x: r.x - 20, y: r.y - 20 }}
              initial={{ scale: 0.3, opacity: 1, rotate: 0 }}
              animate={{ scale: 1.9, opacity: 0, rotate: 45 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Label sticker: normal blending so it keeps the brand colours. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[101]">
        <motion.div className="absolute left-0 top-0" style={{ x: fx, y: fy, width: fw, height: fh }}>
          <AnimatePresence>
            {bracketed && label && visible && (
              <motion.span
                key={label}
                initial={{ opacity: 0, y: below ? -6 : 6, rotate: -6, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, rotate: -3, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 500, damping: 26 }}
                className={`absolute left-0 whitespace-nowrap border-2 border-ink bg-coral px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink shadow-[2px_2px_0_0_var(--blood)] ${
                  below ? "top-[calc(100%+6px)]" : "bottom-[calc(100%+6px)]"
                }`}
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
