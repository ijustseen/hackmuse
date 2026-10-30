"use client";

import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Variant = "default" | "hover" | "text";

const INTERACTIVE = "[data-cursor], a, button, [role='button'], label, select";
const TEXT_INPUT = "textarea, input:not([type='range']):not([type='checkbox'])";

/**
 * Brutalist cursor: an ink dot that tracks the pointer exactly, plus a square
 * frame that trails it on a spring. Over interactive elements the frame grows
 * into a coral block showing the element's `data-cursor` label; over text
 * fields it collapses into an I-beam. Only mounts on precise pointers.
 */
export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [variant, setVariant] = useState<Variant>("default");
  const [label, setLabel] = useState("");
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);
  const current = useRef({ variant: "default" as Variant, label: "" });

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const fx = useSpring(x, { stiffness: 420, damping: 34, mass: 0.6 });
  const fy = useSpring(y, { stiffness: 420, damping: 34, mass: 0.6 });

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    // Enabling must happen after mount: the server can't know the pointer type.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(true);
    const root = document.documentElement;
    root.classList.add("has-custom-cursor");

    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);

      const target = e.target instanceof Element ? e.target : null;
      let next: Variant = "default";
      let nextLabel = "";
      if (target?.closest(TEXT_INPUT)) {
        next = "text";
      } else {
        const hit = target?.closest(INTERACTIVE);
        if (hit && !(hit as HTMLButtonElement).disabled) {
          next = "hover";
          nextLabel = hit.getAttribute("data-cursor") ?? "";
        }
      }
      if (next !== current.current.variant || nextLabel !== current.current.label) {
        current.current = { variant: next, label: nextLabel };
        setVariant(next);
        setLabel(nextLabel);
      }
    };
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    const onLeave = () => setVisible(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.addEventListener("pointerleave", onLeave);
    return () => {
      root.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [x, y]);

  // A client-side navigation can remove the hovered element without a
  // pointermove; drop back to the default frame so the label doesn't stick.
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setVariant("default");
    setLabel("");
  }
  useEffect(() => {
    current.current = { variant: "default", label: "" };
  }, [pathname]);

  if (!enabled) return null;

  const frame =
    variant === "hover"
      ? { width: label ? 92 : 56, height: label ? 92 : 56, borderRadius: 0, backgroundColor: "var(--coral)", rotate: label ? 0 : 45 }
      : variant === "text"
        ? { width: 4, height: 30, borderRadius: 0, backgroundColor: "var(--ink)", rotate: 0 }
        : { width: 34, height: 34, borderRadius: 0, backgroundColor: "rgba(0,0,0,0)", rotate: 0 };

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100]">
      <motion.div
        className="absolute left-0 top-0 flex items-center justify-center border-2 border-ink shadow-[3px_3px_0_0_var(--blood)]"
        style={{ x: fx, y: fy, translateX: "-50%", translateY: "-50%" }}
        animate={{ ...frame, scale: pressed ? 0.78 : 1, opacity: visible ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
      >
        <AnimatePresence>
          {variant === "hover" && label && (
            <motion.span
              key={label}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              className="px-1 text-center font-mono text-[10px] font-bold uppercase leading-tight tracking-wider text-ink"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
      <motion.div
        className="absolute left-0 top-0 h-2 w-2 bg-ink"
        style={{ x, y, translateX: "-50%", translateY: "-50%" }}
        animate={{ opacity: visible && variant !== "text" ? 1 : 0, scale: variant === "hover" ? 0 : 1 }}
        transition={{ duration: 0.15 }}
      />
    </div>
  );
}
