import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export default async function Navbar() {
  const session = await auth();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-blue-700">
          Trivselslekene
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {session?.user ? (
            <>
              <Link href="/dashboard" className="hover:underline">
                Dashbord
              </Link>
              <Link href="/ovelser" className="hover:underline">
                Øvelser
              </Link>
              <span className="text-gray-500">{session.user.name}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-md border border-gray-300 px-3 py-1 hover:bg-gray-50"
                >
                  Logg ut
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/logg-inn" className="hover:underline">
                Logg inn
              </Link>
              <Link
                href="/registrer"
                className="rounded-md bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
              >
                Opprett konto
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
