"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { Home, Swords, BarChart3, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Hjem", href: "/dashboard", icon: Home },
  { name: "Øvelser", href: "/ovelser", icon: Swords },
  { name: "Statistikk", href: "/stilling", icon: BarChart3 },
  { name: "Profil", href: "/profil", icon: User },
];

export default function FloatingNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const [visible, setVisible] = React.useState(true);
  const { scrollY } = useScroll();
  const lastScrollY = React.useRef(0);
  const hidePos = React.useRef(0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = lastScrollY.current;
    if (visible && latest > prev && latest > 200) {
      setVisible(false);
      hidePos.current = latest;
    } else if (!visible && prev - latest > 60) {
      setVisible(true);
    }
    lastScrollY.current = latest;
  });

  const hidden =
    !loggedIn || pathname === "/" || pathname.startsWith("/bli-med");
  if (hidden) return null;

  return (
    <div
      className={cn(
        "fixed left-1/2 z-50 -translate-x-1/2 transition-transform duration-300 ease-out",
        visible ? "translate-y-0" : "translate-y-[calc(100%+2rem)]",
      )}
      style={{ bottom: `calc(1rem + env(safe-area-inset-bottom, 0px))` }}
    >
      <nav
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
