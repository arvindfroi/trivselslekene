"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Home, Swords, BarChart3, User, Trophy, Flag, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Hjem", href: "/dashboard", icon: Home },
  { name: "Øvelser", href: "/ovelser", icon: Swords },
  { name: "Statistikk", href: "/stilling", icon: BarChart3 },
  { name: "Profil", href: "/profil", icon: User },
  { name: "Turnering", href: "/turnering", icon: Trophy },
  { name: "Lag", href: "/fotball-kamp", icon: Flag },
];

const EXPAND_SCROLL_THRESHOLD = 80;

const containerVariants = {
  expanded: {
    y: 0,
    opacity: 1,
    width: "auto",
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 300,
      staggerChildren: 0.06,
      delayChildren: 0.15,
    },
  },
  collapsed: {
    y: 0,
    opacity: 1,
    width: "3rem",
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 300,
      when: "afterChildren" as const,
      staggerChildren: 0.04,
      staggerDirection: -1,
    },
  },
};

const itemVariants = {
  expanded: { opacity: 1, x: 0, scale: 1, transition: { type: "spring" as const, damping: 15 } },
  collapsed: { opacity: 0, x: -14, scale: 0.95, transition: { duration: 0.18 } },
};

const collapsedIconVariants = {
  expanded: { opacity: 0, scale: 0.8, transition: { duration: 0.18 } },
  collapsed: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, damping: 15, stiffness: 300, delay: 0.12 },
  },
};

export default function FloatingNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  const [isExpanded, setExpanded] = React.useState(true);
  const { scrollY } = useScroll();
  const lastScrollY = React.useRef(0);
  const collapsePos = React.useRef(0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = lastScrollY.current;
    if (isExpanded && latest > prev && latest > 150) {
      setExpanded(false);
      collapsePos.current = latest;
    } else if (
      !isExpanded &&
      latest < prev &&
      collapsePos.current - latest > EXPAND_SCROLL_THRESHOLD
    ) {
      setExpanded(true);
    }
    lastScrollY.current = latest;
  });

  const hidden =
    !loggedIn || pathname === "/" || pathname.startsWith("/bli-med");
  if (hidden) return null;

  const handleNavClick = (e: React.MouseEvent) => {
    if (!isExpanded) {
      e.preventDefault();
      setExpanded(true);
    }
  };

  return (
    <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 sm:top-5">
      <motion.nav
        initial={false}
        animate={isExpanded ? "expanded" : "collapsed"}
        variants={containerVariants}
        whileHover={!isExpanded ? { scale: 1.08 } : {}}
        whileTap={!isExpanded ? { scale: 0.95 } : {}}
        onClick={handleNavClick}
        className={cn(
          "relative flex h-12 items-center overflow-hidden rounded-full border border-line bg-bg-elev/80 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl",
          !isExpanded && "cursor-pointer justify-center"
        )}
      >
        <motion.div
          className={cn(
            "flex items-center gap-0.5 px-2",
            !isExpanded && "pointer-events-none"
          )}
        >
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <motion.div key={item.name} variants={itemVariants}>
                <Link
                  href={item.href}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavClick(e);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3",
                    active
                      ? "bg-white/10 text-fg"
                      : "text-fg-dim hover:text-fg"
                  )}
                >
                  <Icon className="hidden h-4 w-4 sm:block" />
                  {item.name}
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={false}
            variants={collapsedIconVariants}
            animate={isExpanded ? "expanded" : "collapsed"}
          >
            <Menu className="h-5 w-5 text-fg" />
          </motion.div>
        </div>
      </motion.nav>
    </div>
  );
}
