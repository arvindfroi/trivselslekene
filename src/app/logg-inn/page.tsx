"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loggInnBruker } from "@/lib/actions/auth";

export default function LoggInnSide() {
  const [state, formAction, pending] = useActionState(loggInnBruker, undefined);

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4">
      <h1 className="mb-2 text-2xl font-bold">Logg inn</h1>
      <p className="mb-6 text-sm text-gray-600">
        Logg inn for å se stillingen og registrere resultater.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="epost" className="mb-1 block text-sm font-medium">
            E-post
          </label>
          <input
            id="epost"
            name="epost"
            type="email"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="ola@eksempel.no"
          />
        </div>

        <div>
          <label htmlFor="passord" className="mb-1 block text-sm font-medium">
            Passord
          </label>
          <input
            id="passord"
            name="passord"
            type="password"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        {state?.feil && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.feil}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "Logger inn…" : "Logg inn"}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        Ny her?{" "}
        <Link href="/registrer" className="text-blue-600 hover:underline">
          Opprett en konto
        </Link>
      </p>
    </div>
  );
}
