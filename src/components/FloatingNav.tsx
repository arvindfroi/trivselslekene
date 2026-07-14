"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Swords, BarChart3, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Hjem", href: "/dashboard", icon: Home },
  { name: "Leker", href: "/ovelser", icon: Swords },
  { name: "Statistikk", href: "/stilling", icon: BarChart3 },
  { name: "Profil", href: "/profil", icon: User },
];

const RUTER = navItems.map((item) => item.href);
const SWIPE_THRESHOLD = 50;

export default function FloatingNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  // ── Toolbar swipe (native listeners for reliable passive:false) ──
  const navRef = React.useRef<HTMLElement>(null);
  const touchStart = React.useRef<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const dx = Math.abs(e.touches[0].clientX - touchStart.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
      if (dx > dy && dx > 8) {
        e.preventDefault();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;
      touchStart.current = null;

      const absDx = Math.abs(dx);
      const currentIndex = RUTER.indexOf(pathname);

      if (absDx < SWIPE_THRESHOLD || Math.abs(dy) > absDx * 0.6 || currentIndex < 0) return;

      if (dx > 0 && currentIndex > 0) {
        router.push(RUTER[currentIndex - 1]);
      } else if (dx < 0 && currentIndex < RUTER.length - 1) {
        router.push(RUTER[currentIndex + 1]);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [pathname, router]);

  const hidden =
    !loggedIn || pathname === "/" || pathname.startsWith("/bli-med");
  if (hidden) return null;

  return (
    <div
      className="fixed left-1/2 z-50 -translate-x-1/2"
      style={{ bottom: `calc(1rem + env(safe-area-inset-bottom, 0px))` }}
    >
      <nav
        ref={navRef}
        style={{ touchAction: "none" }}
        className={cn(
          "flex h-12 items-center gap-0.5 overflow-hidden rounded-full border border-line bg-bg-elev/95 px-2 shadow-[0_-10px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl",
        )}
      >
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3",
                active
                  ? "bg-white/10 text-fg"
                  : "text-fg-dim hover:text-fg",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
