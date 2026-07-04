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
        className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-paper text-ink transition-colors hover:bg-ink hover:text-paper"
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
            className="absolute inset-x-0 top-full z-40 overflow-hidden border-b-2 border-ink bg-paper shadow-[0_6px_0_0_var(--ink)]"
          >
            <nav className="flex flex-col gap-1 px-4 py-4 text-sm">
              {session?.name ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="border-b border-ink/10 py-3 font-display text-xs tracking-widest uppercase"
                  >
                    Dashbord
                  </Link>
                  <Link
                    href="/ovelser"
                    onClick={() => setOpen(false)}
                    className="border-b border-ink/10 py-3 font-display text-xs tracking-widest uppercase"
                  >
                    Øvelser
                  </Link>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-ink-soft">{session.name}</span>
                    <form action={signOutAction}>
                      <Button type="submit" variant="outline" className="px-3 py-1.5 text-[11px]">
                        Logg ut
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2 py-2" onClick={() => setOpen(false)}>
                  <LinkButton href="/logg-inn" variant="outline" className="w-full justify-center">
                    Logg inn
                  </LinkButton>
                  <LinkButton href="/registrer" variant="primary" className="w-full justify-center">
                    Opprett konto
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
