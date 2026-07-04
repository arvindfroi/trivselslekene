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
    <header className="sticky top-0 z-40 border-b border-line bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="bg-gradient-accent flex h-8 w-8 items-center justify-center rounded-lg font-display text-sm font-bold text-white">
            T
          </span>
          <span className="font-display text-lg font-medium text-fg">
            Trivselslekene
          </span>
        </Link>

        <nav className="hidden items-center gap-7 sm:flex">
          {session?.user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-fg-dim transition-colors hover:text-fg"
              >
                Dashbord
              </Link>
              <Link
                href="/ovelser"
                className="text-sm text-fg-dim transition-colors hover:text-fg"
              >
                Øvelser
              </Link>
              <span className="hidden text-sm text-fg-faint md:inline">
                {session.user.name}
              </span>
              <form action={signOutAction}>
                <Button type="submit" variant="secondary" className="px-4 py-2 text-xs">
                  Logg ut
                </Button>
              </form>
            </>
          ) : (
            <LinkButton href="/bli-med" className="px-5 py-2 text-sm">
              Bli med
            </LinkButton>
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
