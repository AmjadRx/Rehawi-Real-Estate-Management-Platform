"use client";

/**
 * Shared animation primitives. Design rules (Motion skill):
 * - Serious financial interface → springs with no overshoot (bounce: 0).
 * - Entrances use transform+opacity only (compositor-friendly).
 * - Everything respects prefers-reduced-motion via the app-level
 *   MotionConfig reducedMotion="user".
 */

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useTransform,
  type HTMLMotionProps,
} from "motion/react";
import { useEffect, useRef } from "react";

export const entranceSpring = {
  type: "spring",
  bounce: 0,
  visualDuration: 0.4,
} as const;

/** Fade + rise entrance for page sections. */
export function FadeIn({
  delay = 0,
  children,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, transform: "translateY(14px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ ...entranceSpring, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Container that staggers its <StaggerItem> children. */
export function Stagger({
  children,
  staggerDelay = 0.05,
  ...props
}: HTMLMotionProps<"div"> & { staggerDelay?: number }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, transform: "translateY(14px)" },
        visible: {
          opacity: 1,
          transform: "translateY(0px)",
          transition: entranceSpring,
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated number: counts up smoothly on first view. Formatting happens in
 * the transform callback; renders via a MotionValue so React never re-renders
 * during the animation.
 */
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const raw = useMotionValue(0);
  const display = useTransform(() => {
    const n = raw.get();
    return format ? format(n) : Math.round(n).toLocaleString("en-GB");
  });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(raw, value, {
      type: "spring",
      bounce: 0,
      visualDuration: 0.8,
    });
    return () => controls.stop();
  }, [inView, value, raw]);

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  );
}

/** Subtle lift for interactive cards. Composable with entrance transforms. */
export function HoverLift({ children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", bounce: 0, visualDuration: 0.25 }}
      style={{ willChange: "transform" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
