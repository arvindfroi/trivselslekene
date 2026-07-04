"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Button, { LinkButton } from "@/components/ui/Button";

type NavUser = {
  name?: string | null;
} | null;

export default function MobileNav({
  session,
  signOutAction,
}: {
  session: NavUser;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Lukk meny" : "Åpne meny"}
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white/[0.04] text-fg transition-colors hover:bg-white/[0.1]"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-x-0 top-full z-40 overflow-hidden border-b border-line bg-bg/95 backdrop-blur-xl"
          >
            <nav className="flex flex-col gap-1 px-4 py-4 text-sm">
              {session?.name ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="border-b border-line py-3 text-fg-dim"
                  >
                    Dashbord
                  </Link>
                  <Link
                    href="/ovelser"
                    onClick={() => setOpen(false)}
                    className="border-b border-line py-3 text-fg-dim"
                  >
                    Øvelser
                  </Link>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-fg-faint">{session.name}</span>
                    <form action={signOutAction}>
                      <Button type="submit" variant="secondary" className="px-3 py-1.5 text-xs">
                        Logg ut
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="py-2" onClick={() => setOpen(false)}>
                  <LinkButton href="/bli-med" className="w-full justify-center">
                    Bli med
                  </LinkButton>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
