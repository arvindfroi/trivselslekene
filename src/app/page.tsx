import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Hjemmeside() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-4xl font-extrabold text-blue-700">Trivselslekene</h1>
      <p className="mt-4 text-lg text-gray-700">
        Hvert år arrangerer vennegjengen Trivselslekene – vår egen variant av OL,
        der alle er vert for minst én øvelse. Verten deltar ikke i sin egen
        øvelse, men er med i alle de andre. I år kan dere også konkurrere i
        lagøvelser, som par, trekamper eller flere lag mot hverandre.
      </p>

      <p className="mt-2 text-lg text-gray-700">
        Her kan dere organisere øvelser, registrere resultater og følge med på
        stillingen gjennom hele lekene.
      </p>

      <div className="mt-8 flex justify-center gap-4">
        {session?.user ? (
          <Link
            href="/dashboard"
            className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Gå til dashbord
          </Link>
        ) : (
          <>
            <Link
              href="/registrer"
              className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
            >
              Opprett konto
            </Link>
            <Link
              href="/logg-inn"
              className="rounded-md border border-blue-600 px-6 py-3 font-medium text-blue-700 hover:bg-blue-50"
            >
              Logg inn
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
