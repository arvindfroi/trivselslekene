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
const SWIPE_THRESHOLD = 80;

interface MainShellProps {
  children: ReactNode;
}

export default function MainShell({ children }: MainShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Wider layout for øvelser and stilling
  const maxWidth =
    pathname === "/ovelser" || pathname === "/stilling" ? "max-w-5xl" : "max-w-4xl";

  const currentIndex = RUTER.indexOf(pathname as (typeof RUTER)[number]);

  // ── Page transition state ──
  const prevStore = useRef<{
    children: ReactNode;
    pathname: string;
    maxWidth: string;
  } | null>(null);
  const [prevPage, setPrevPage] = useState<{
    children: ReactNode;
    pathname: string;
    maxWidth: string;
  } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // ── Swipe / touch tracking state ──
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // ── Preload adjacent routes for instant swipes ──
  useEffect(() => {
    if (currentIndex > 0) router.prefetch(RUTER[currentIndex - 1]);
    if (currentIndex < RUTER.length - 1) router.prefetch(RUTER[currentIndex + 1]);
  }, [currentIndex, router]);

  // ── Track pathname changes for exit/enter animations ──
  useEffect(() => {
    const prev = prevStore.current;
    if (prev && prev.pathname !== pathname) {
      setPrevPage(prev);
      setIsTransitioning(true);
      // Reset swipe state so the new page starts clean (no leftover dragX transform)
      setDragX(0);
      setIsCommitting(false);
      setIsDragging(false);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setPrevPage(null);
      }, 400);
      return () => clearTimeout(timer);
    }
    prevStore.current = { children, pathname, maxWidth };
  }, [pathname, children, maxWidth]);

  const showExit = isTransitioning && prevPage && prevPage.pathname !== pathname;

  const oldIdx = prevPage
    ? RUTER.indexOf(prevPage.pathname as (typeof RUTER)[number])
    : -1;
  const newIdx = RUTER.indexOf(pathname as (typeof RUTER)[number]);
  const navDir: "forward" | "backward" =
    oldIdx !== -1 && newIdx !== -1 && newIdx > oldIdx ? "forward" : "backward";

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
          // dragX / isCommitting cleared in useEffect when pathname changes
        }, 280);
      } else if (isSwipe && dx < 0 && currentIndex < RUTER.length - 1) {
        setIsCommitting(true);
        setDragX(-window.innerWidth);
        setTimeout(() => {
          router.push(RUTER[currentIndex + 1]);
          // dragX / isCommitting cleared in useEffect when pathname changes
        }, 280);
      } else {
        setDragX(0);
      }
    },
    [currentIndex, router],
  );

  // ── Derived values for indicators ──
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

  // ── Render ──
  return (
    <div
      className="relative isolate min-h-dvh overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Fixed animated background — never remounts */}
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

      {/* ── Content stack with iOS-style push/pop transitions ── */}
      <div className="relative z-10">
        {/* Exiting (previous) page — behind the entering page */}
        {showExit && prevPage && (
          <div
            aria-hidden
            className="absolute inset-0 z-0"
            style={{
              animation: `slide-out-${navDir} 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
            }}
          >
            <div className={`mx-auto ${prevPage.maxWidth} px-4 pt-6 pb-28`}>
              {prevPage.children}
            </div>
          </div>
        )}

        {/* Current page — slides over the exit page */}
        <div
          className="relative z-10"
          style={{
            animation: isTransitioning
              ? `slide-in-${navDir} 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards`
              : undefined,
            transform:
              !isTransitioning && (isDragging || committing) && dragX !== 0
                ? `translateX(${dragX}px)`
                : undefined,
            transition:
              !isDragging && committing
                ? "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)"
                : !isDragging && dragX !== 0
                  ? "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)"
                  : undefined,
          }}
        >
          <div className={`mx-auto ${maxWidth} px-4 pt-6 pb-28`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
