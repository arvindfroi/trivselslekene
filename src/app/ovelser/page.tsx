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
import { ChevronRight, MapPin } from "lucide-react";

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
  if (!session?.user) redirect("/bli-med");

  const sesong = await sikreAktivSesong();

  const ovelser = await prisma.ovelse.findMany({
    where: { sesongId: sesong.id },
    include: { vert: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <p className="text-xs tracking-[0.3em] text-accent-2 uppercase">
        {sesong.navn}
      </p>
      <h1 className="mt-1 font-display text-4xl text-fg">Øvelser</h1>
      <p className="mt-2 max-w-xl text-sm text-fg-dim">
        Verten for en øvelse deltar vanligvis ikke selv, men er med i alle de
        andre.
      </p>

      <Card className="mt-8" padding="p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-medium tracking-widest text-fg-dim uppercase">
          Legg til en ny øvelse
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
            <Label htmlFor="lokasjon">Lokasjon (valgfritt)</Label>
            <Input
              id="lokasjon"
              name="lokasjon"
              placeholder="F.eks. i hagen, på stranda"
            />
          </div>

          <div>
            <Label htmlFor="beskrivelse">Beskrivelse (valgfritt)</Label>
            <Textarea id="beskrivelse" name="beskrivelse" rows={2} />
          </div>

          <fieldset>
            <legend className="mb-1.5 block text-[11px] font-medium tracking-widest text-fg-dim uppercase">
              Type øvelse
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="has-checked:border-accent-2 has-checked:bg-accent-2/10 flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5 text-sm text-fg transition-colors">
                <input
                  type="radio"
                  name="type"
                  value="INDIVIDUELL"
                  defaultChecked
                  className="accent-accent-2"
                />
                Individuell
              </label>
              <label className="has-checked:border-accent-2 has-checked:bg-accent-2/10 flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5 text-sm text-fg transition-colors">
                <input
                  type="radio"
                  name="type"
                  value="LAG"
                  className="accent-accent-2"
                />
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

          <label className="flex cursor-pointer items-center gap-3 text-sm text-fg">
            <input
              type="checkbox"
              name="vertDeltar"
              className="h-4 w-4 accent-accent-2"
            />
            Jeg deltar også selv i denne øvelsen
          </label>

          <Button type="submit" className="mt-1 self-start">
            Opprett øvelse
          </Button>
        </form>
      </Card>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium tracking-widest text-fg-dim uppercase">
          Alle øvelser
        </h2>
        {ovelser.length === 0 ? (
          <p className="text-sm text-fg-dim">Ingen øvelser er opprettet ennå.</p>
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
                      <p className="truncate font-display text-lg text-fg">
                        {ovelse.navn}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-fg-faint">
                        <span>
                          Vert: {ovelse.vert.navn} ·{" "}
                          {ovelse.type === "LAG" ? "Lagøvelse" : "Individuell"}
                        </span>
                        {ovelse.lokasjon && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} /> {ovelse.lokasjon}
                          </span>
                        )}
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
                        className="text-fg-faint"
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
