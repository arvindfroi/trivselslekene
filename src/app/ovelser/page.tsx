import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import { opprettOvelse } from "@/lib/actions/ovelser";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge, { type BadgeVariant } from "@/components/ui/Badge";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { ChevronRight } from "lucide-react";

const statusVariant: Record<string, BadgeVariant> = {
  FULLFORT: "fullfort",
  PAAGAAR: "pagaar",
  PLANLAGT: "planlagt",
};

const statusLabel: Record<string, string> = {
  FULLFORT: "Fullført",
  PAAGAAR: "Pågår",
  PLANLAGT: "Planlagt",
};

export default async function OvelserSide() {
  const session = await auth();
  if (!session?.user) redirect("/logg-inn");

  const sesong = await sikreAktivSesong();

  const ovelser = await prisma.ovelse.findMany({
    where: { sesongId: sesong.id },
    include: { vert: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <p className="font-display text-[11px] tracking-widest text-coral-dark uppercase">
        {sesong.navn}
      </p>
      <h1 className="mt-1 font-display text-3xl text-ink sm:text-4xl">
        Øvelser
      </h1>
      <p className="mt-2 max-w-xl text-sm text-ink-soft">
        Verten for en øvelse deltar ikke selv i den øvelsen, men er med i alle
        de andre.
      </p>

      <Card className="mt-8" padding="p-5 sm:p-6">
        <h2 className="mb-4 font-display text-sm tracking-widest text-ink uppercase">
          Opprett ny øvelse
        </h2>
        <form action={opprettOvelse} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="navn">Navn på øvelsen</Label>
            <Input
              id="navn"
              name="navn"
              required
              placeholder="F.eks. Stikkball, Bridge-turnering, Sekkeløp"
            />
          </div>

          <div>
            <Label htmlFor="beskrivelse">Beskrivelse (valgfritt)</Label>
            <Textarea id="beskrivelse" name="beskrivelse" rows={2} />
          </div>

          <fieldset>
            <legend className="mb-1.5 font-display text-[11px] tracking-widest text-ink-soft uppercase">
              Type øvelse
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="has-checked:border-ink has-checked:bg-gold/20 flex cursor-pointer items-center gap-2.5 border-2 border-ink/25 bg-paper px-3.5 py-2.5 text-sm transition-colors">
                <input
                  type="radio"
                  name="type"
                  value="INDIVIDUELL"
                  defaultChecked
                  className="accent-ink"
                />
                Individuell
              </label>
              <label className="has-checked:border-ink has-checked:bg-gold/20 flex cursor-pointer items-center gap-2.5 border-2 border-ink/25 bg-paper px-3.5 py-2.5 text-sm transition-colors">
                <input type="radio" name="type" value="LAG" className="accent-ink" />
                Lagøvelse
              </label>
            </div>
          </fieldset>

          <div>
            <Label htmlFor="lagFormat">Lagformat (kun for lagøvelser)</Label>
            <Select id="lagFormat" name="lagFormat" defaultValue="PAR">
              <option value="PAR">Par (2 og 2)</option>
              <option value="TRIO">Trekamp (3 og 3)</option>
              <option value="FLERE_LAG">Flere lag mot hverandre</option>
            </Select>
          </div>

          <Button type="submit" className="mt-1 self-start">
            Opprett øvelse
          </Button>
        </form>
      </Card>

      <section className="mt-10">
        <h2 className="mb-3 font-display text-sm tracking-widest text-ink uppercase">
          Alle øvelser
        </h2>
        {ovelser.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Ingen øvelser er opprettet ennå.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {ovelser.map((ovelse) => (
              <li key={ovelse.id}>
                <Link href={`/ovelser/${ovelse.id}`}>
                  <Card
                    hover
                    padding="p-4 sm:p-5"
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm text-ink">
                        {ovelse.navn}
                      </p>
                      <p className="mt-1 truncate text-xs text-ink-soft">
                        Vert: {ovelse.vert.navn} ·{" "}
                        {ovelse.type === "LAG" ? "Lagøvelse" : "Individuell"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge
                        variant={statusVariant[ovelse.status]}
                        pulse={ovelse.status === "PAAGAAR"}
                        className="hidden sm:inline-flex"
                      >
                        {statusLabel[ovelse.status]}
                      </Badge>
                      <ChevronRight
                        size={18}
                        className="text-ink-soft"
                        strokeWidth={2.5}
                      />
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
