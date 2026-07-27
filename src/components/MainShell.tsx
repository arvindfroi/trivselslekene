"use client";

import { useRef, useState, useCallback, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import AnimatedGradientBackground from "@/components/AnimatedGradientBackground";

const RUTER = ["/dashboard", "/ovelser", "/stilling", "/profil"] as const;
const SIDE_NAVN: Record<string, string> = {
  "/dashboard": "Hjem",
  "/ovelser": "Øvelser",
  "/stilling": "Statistikk",
  "/profil": "Profil",
};
const MAX_WIDTHS = ["max-w-4xl", "max-w-5xl", "max-w-5xl", "max-w-4xl"];
const SWIPE_THRESHOLD = 80;

interface MainShellProps {
  panels: ReactNode[];
}

export default function MainShell({ panels }: MainShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentIndex = RUTER.indexOf(pathname as (typeof RUTER)[number]);

  // ── Transition state ──
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // ── Swipe / touch tracking state ──
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // ── Track pathname changes for exit/enter animations ──
  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      const oldIdx = RUTER.indexOf(prevPathname.current as (typeof RUTER)[number]);
      if (oldIdx >= 0 && oldIdx !== currentIndex) {
        setPrevIndex(oldIdx);
        setIsTransitioning(true);
        setDragX(0);
        setIsCommitting(false);
        setIsDragging(false);
        const timer = setTimeout(() => {
          setIsTransitioning(false);
          setPrevIndex(null);
        }, 400);
        prevPathname.current = pathname;
        return () => clearTimeout(timer);
      }
    }
    prevPathname.current = pathname;
  }, [pathname, currentIndex]);

  const navDir: "forward" | "backward" =
    prevIndex !== null && currentIndex > prevIndex ? "forward" : "backward";

  // ── Touch handlers ──
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isTransitioning) return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "SELECT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "BUTTON" ||
        target.closest("button") ||
        target.closest("a")
      )
        return;
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    },
    [isTransitioning],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current) return;
      const dx = e.touches[0].clientX - touchStart.current.x;
      const dy = e.touches[0].clientY - touchStart.current.y;

      if (!isDragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        setIsDragging(true);
      }

      if (isDragging) {
        if (Math.abs(dx) > 10) e.preventDefault();

        let clampedDx = dx;
        if ((dx > 0 && currentIndex <= 0) || (dx < 0 && currentIndex >= RUTER.length - 1)) {
          clampedDx = dx * 0.15;
        } else if (Math.abs(dx) > SWIPE_THRESHOLD) {
          const over = Math.abs(dx) - SWIPE_THRESHOLD;
          const sign = dx > 0 ? 1 : -1;
          clampedDx = sign * (SWIPE_THRESHOLD + over * 0.4);
        }

        setDragX(clampedDx);
      }
    },
    [isDragging, currentIndex],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current) return;
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;
      touchStart.current = null;
      setIsDragging(false);

      const absDx = Math.abs(dx);
      const isSwipe =
        absDx >= SWIPE_THRESHOLD && Math.abs(dy) < absDx * 0.6 && currentIndex >= 0;

      if (isSwipe && dx > 0 && currentIndex > 0) {
        setIsCommitting(true);
        setDragX(window.innerWidth);
        setTimeout(() => {
          router.push(RUTER[currentIndex - 1]);
        }, 280);
      } else if (isSwipe && dx < 0 && currentIndex < RUTER.length - 1) {
        setIsCommitting(true);
        setDragX(-window.innerWidth);
        setTimeout(() => {
          router.push(RUTER[currentIndex + 1]);
        }, 280);
      } else {
        setDragX(0);
      }
    },
    [currentIndex, router],
  );

  // ── Derived values ──
  const dragProgress = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1);

  const peekName =
    dragX > 10 && currentIndex > 0
      ? SIDE_NAVN[RUTER[currentIndex - 1]]
      : dragX < -10 && currentIndex < RUTER.length - 1
        ? SIDE_NAVN[RUTER[currentIndex + 1]]
        : null;

  const committing =
    isCommitting ||
    (Math.abs(dragX) >=
      (typeof window !== "undefined" ? window.innerWidth : 375) * 0.8 &&
      !isTransitioning);

  // Show only the active panel in normal flow (for scrolling)
  // During transition, show old + new with animations
  const activeIdx = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div
      className="relative isolate min-h-dvh overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Fixed animated background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <AnimatedGradientBackground Breathing breathingRange={6} />
      </div>

      {/* Page peek label during swipe */}
      {peekName && isDragging && (
        <div
          className="pointer-events-none fixed top-1/2 z-20 -translate-y-1/2 select-none"
          style={{
            [dragX > 0 ? "left" : "right"]: Math.max(4, Math.abs(dragX) * 0.12),
            opacity: Math.min(dragProgress * 0.9, 0.85),
          }}
        >
          <span className="text-xs font-semibold tracking-[0.25em] text-fg-faint uppercase">
            {peekName}
          </span>
        </div>
      )}

      {/* ── Content stack ── */}
      <div className="relative z-10">
        {/* Current page — slides in over the gradient background */}
        <div
          className="relative z-10"
          style={{
            animation: isTransitioning
              ? `slide-in-${navDir} 0.4s cubic-bezier(0.32, 0.72, 0, 1) forwards`
              : undefined,
            willChange: isTransitioning ? "transform" : undefined,
            transform:
              !isTransitioning && (isDragging || committing) && dragX !== 0
                ? `translateX(${dragX}px)`
                : undefined,
            transition:
              !isDragging && committing
                ? "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)"
                : !isDragging && dragX !== 0
                  ? "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)"
                  : undefined,
          }}
        >
          <div className={`mx-auto ${MAX_WIDTHS[activeIdx]} px-4 pt-6 pb-28`}>
            {panels[activeIdx]}
          </div>
        </div>
      </div>
    </div>
  );
}
