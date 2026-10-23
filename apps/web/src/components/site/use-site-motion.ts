"use client";

import { useEffect, type RefObject } from "react";
import { animate } from "animejs";

export function useSiteMotion(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const pulse = root.querySelector("[data-pulse]");
    if (!pulse) return;
    const animation = animate(pulse, {
      opacity: [1, 0.35],
      loop: true,
      alternate: true,
      duration: 1100,
      ease: "inOutSine",
    });
    return () => {
      animation.revert();
    };
  }, [rootRef]);
}
