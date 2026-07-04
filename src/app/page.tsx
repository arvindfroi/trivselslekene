import { auth } from "@/lib/auth";
import { LinkButton } from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Crown, Users, BarChart3 } from "lucide-react";

export default async function Hjemmeside() {
  const session = await auth();

  return (
    <div>
      <section className="bg-halftone relative overflow-hidden border-b-2 border-ink">
        <div className="h-2 bg-stripes" />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <p
            className="animate-fade-up mb-3 font-display text-xs tracking-[0.3em] text-coral-dark uppercase"
            style={{ animationDelay: "0ms" }}
          >
            Vennegjengens egne leker
          </p>
          <h1
            className="animate-fade-up font-display text-4xl leading-[1.05] text-ink sm:text-6xl md:text-7xl"
            style={{ animationDelay: "80ms" }}
          >
            Trivsels&shy;lekene
          </h1>
          <p
            className="animate-fade-up mx-auto mt-6 max-w-2xl text-base text-ink-soft sm:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            Hvert år arrangerer vennegjengen sin egen variant av OL, der alle
            er vert for minst én øvelse. Verten deltar ikke i sin egen øvelse,
            men er med i alle de andre. I år kan dere også konkurrere i
            lagøvelser — par, trekamper eller flere lag mot hverandre.
          </p>

          <div
            className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "240ms" }}
          >
            {session?.user ? (
              <LinkButton href="/dashboard" className="w-full sm:w-auto">
                Gå til dashbord
              </LinkButton>
            ) : (
              <>
                <LinkButton href="/registrer" className="w-full sm:w-auto">
                  Opprett konto
                </LinkButton>
                <LinkButton
                  href="/logg-inn"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Logg inn
                </LinkButton>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Card
            hover
            className="animate-fade-up"
            padding="p-6"
          >
            <Crown className="text-gold-dark" size={28} strokeWidth={2.2} />
            <h2 className="mt-4 font-display text-base text-ink">
              Vert for én øvelse
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Alle arrangerer sin egen øvelse, men konkurrerer ikke i den
              selv. Du deltar i alle de andres.
            </p>
          </Card>

          <Card
            hover
            className="animate-fade-up"
            padding="p-6"
            style={{ animationDelay: "80ms" }}
          >
            <Users className="text-coral-dark" size={28} strokeWidth={2.2} />
            <h2 className="mt-4 font-display text-base text-ink">
              Individuelt eller lag
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Sett opp klassiske individuelle øvelser, eller lagformater som
              par, trekamp og flere lag mot hverandre.
            </p>
          </Card>

          <Card
            hover
            className="animate-fade-up"
            padding="p-6"
            style={{ animationDelay: "160ms" }}
          >
            <BarChart3
              className="text-forest-dark"
              size={28}
              strokeWidth={2.2}
            />
            <h2 className="mt-4 font-display text-base text-ink">
              Levende dashbord
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Registrer resultater fortløpende og følg med på sammenlagt
              stilling gjennom hele lekene.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
