import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import Button, { LinkButton } from "@/components/ui/Button";
import MobileNav from "@/components/MobileNav";

export default async function Navbar() {
  const session = await auth();

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <header className="relative z-40 border-b-2 border-ink bg-paper">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-gold font-display text-sm text-ink">
            T
          </span>
          <span className="font-display text-lg tracking-tight text-ink">
            Trivselslekene
          </span>
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {session?.user ? (
            <>
              <Link
                href="/dashboard"
                className="font-display text-xs tracking-widest text-ink-soft uppercase transition-colors hover:text-ink"
              >
                Dashbord
              </Link>
              <Link
                href="/ovelser"
                className="font-display text-xs tracking-widest text-ink-soft uppercase transition-colors hover:text-ink"
              >
                Øvelser
              </Link>
              <span className="hidden text-sm text-ink-soft md:inline">
                {session.user.name}
              </span>
              <form action={signOutAction}>
                <Button type="submit" variant="outline" className="px-3 py-1.5 text-[11px]">
                  Logg ut
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/logg-inn"
                className="font-display text-xs tracking-widest text-ink-soft uppercase transition-colors hover:text-ink"
              >
                Logg inn
              </Link>
              <LinkButton href="/registrer" className="px-4 py-2 text-[11px]">
                Opprett konto
              </LinkButton>
            </>
          )}
        </nav>

        <MobileNav
          session={session?.user ? { name: session.user.name } : null}
          signOutAction={signOutAction}
        />
      </div>
    </header>
  );
}
