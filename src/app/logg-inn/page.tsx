"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loggInnBruker } from "@/lib/actions/auth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";

export default function LoggInnSide() {
  const [state, formAction, pending] = useActionState(loggInnBruker, undefined);

  return (
    <div className="bg-halftone flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md animate-fade-up" padding="p-6 sm:p-8">
        <p className="mb-1 font-display text-[11px] tracking-widest text-coral-dark uppercase">
          Velkommen tilbake
        </p>
        <h1 className="font-display text-2xl text-ink sm:text-3xl">
          Logg inn
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Logg inn for å se stillingen og registrere resultater.
        </p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <div>
            <Label htmlFor="epost">E-post</Label>
            <Input
              id="epost"
              name="epost"
              type="email"
              required
              placeholder="ola@eksempel.no"
            />
          </div>

          <div>
            <Label htmlFor="passord">Passord</Label>
            <Input id="passord" name="passord" type="password" required />
          </div>

          {state?.feil && (
            <p className="border-2 border-coral bg-paper-soft px-3 py-2 text-sm text-coral-dark">
              {state.feil}
            </p>
          )}

          <Button type="submit" disabled={pending} className="mt-2 w-full">
            {pending ? "Logger inn…" : "Logg inn"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-soft">
          Ny her?{" "}
          <Link
            href="/registrer"
            className="font-medium text-ink underline decoration-gold decoration-2 underline-offset-2"
          >
            Opprett en konto
          </Link>
        </p>
      </Card>
    </div>
  );
}
