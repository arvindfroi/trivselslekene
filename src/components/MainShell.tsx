"use client";

import { useRef, useCallback, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import AnimatedGradientBackground from "@/components/AnimatedGradientBackground";

const RUTER = ["/dashboard", "/ovelser", "/stilling", "/profil"] as const;
const SWIPE_THRESHOLD = 80;

interface MainShellProps {
  children: ReactNode;
  maxWidth?: "max-w-4xl" | "max-w-5xl";
}

export default function MainShell({ children, maxWidth = "max-w-4xl" }: MainShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Ikke fang swipe hvis brukeren er inne i et input-felt eller trykker på en knapp
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "SELECT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "BUTTON" ||
      target.closest("button") ||
      target.closest("a")
    ) {
      return;
    }
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      touchStart.current = null;

      // Må være horisontal swipe (ikke scroll)
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx) * 0.6) return;

      const currentIndex = RUTER.indexOf(pathname as (typeof RUTER)[number]);
      if (currentIndex === -1) return;

      if (dx > 0 && currentIndex > 0) {
        // Swipe høyre → gå til forrige side
        router.push(RUTER[currentIndex - 1]);
      } else if (dx < 0 && currentIndex < RUTER.length - 1) {
        // Swipe venstre → gå til neste side
        router.push(RUTER[currentIndex + 1]);
      }
    },
    [pathname, router]
  );

  return (
    <div
      className="relative isolate min-h-dvh"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Fast bakgrunn — remountes aldri */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <AnimatedGradientBackground Breathing breathingRange={6} />
      </div>

      {/* Innhold — remountes ved sideskifte for å trigge animasjon */}
      <div
        key={pathname}
        className={`animate-page-enter relative z-10 mx-auto ${maxWidth} px-4 pt-28 pb-12`}
      >
        {children}
      </div>
    </div>
  );
}
