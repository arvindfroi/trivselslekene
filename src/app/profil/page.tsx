import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sikreAktivSesong } from "@/lib/sesong";
import { opprettOvelse, slettOvelse } from "@/lib/actions/ovelser";
import {
  kvalitetValg,
  lagFormatValg,
  statusTekst,
  statusVariant,
} from "@/lib/ovelseLabels";
import Card from "@/components/ui/Card";
import Button, { LinkButton } from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import ProfilRediger from "@/components/ProfilRediger";
import DeltakerSlideshow from "@/components/DeltakerSlideshow";
import { MapPin, Users, Settings2, Trash2, Plus } from "lucide-react";

export default async function ProfilSide({
  searchParams,
}: {
  searchParams: Promise<{ navnfeil?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  const { navnfeil } = await searchParams;
  const sesong = await sikreAktivSesong();
  const [bruker, mine] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { navn: true, bildeUrl: true },
    }),
    prisma.ovelse.findMany({
      where: { sesongId: sesong.id, vertId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  async function loggUt() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-28 pb-12">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.3em] text-accent-2 uppercase">
            {session.user.name}
          </p>
          <h1 className="mt-1 font-display text-4xl text-fg">Profil</h1>
          <p className="mt-2 text-sm text-fg-dim">
            Legg til øvelser og styr poengene dine.
          </p>
        </div>
        <form action={loggUt}>
          <Button type="submit" variant="secondary" className="px-4 py-2 text-xs">
            Logg ut
          </Button>
        </form>
      </div>

      <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <ProfilRediger
            navn={bruker?.navn ?? session.user.name ?? ""}
            bildeUrl={bruker?.bildeUrl ?? null}
            navnFeil={navnfeil}
          />
        </div>
        <div className="flex flex-1 items-center justify-center sm:justify-end">
          <DeltakerSlideshow />
        </div>
      </div>

      <Card className="mt-6" padding="p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-medium tracking-widest text-fg-dim uppercase">
          <Plus size={16} /> Legg til en ny øvelse
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="lokasjon">Lokasjon (valgfritt)</Label>
              <Input
                id="lokasjon"
                name="lokasjon"
                placeholder="F.eks. i hagen"
              />
            </div>
            <div>
              <Label htmlFor="lagFormat">Lagformat (for lagøvelser)</Label>
              <Select id="lagFormat" name="lagFormat" defaultValue="PAR">
                {lagFormatValg.map((v) => (
                  <option key={v.verdi} value={v.verdi}>
                    {v.tittel} — {v.hint}
                  </option>
                ))}
              </Select>
            </div>
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

          <fieldset>
            <legend className="mb-1.5 block text-[11px] font-medium tracking-widest text-fg-dim uppercase">
              Hvilke egenskaper tester leken? (valgfritt)
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {kvalitetValg.map((k) => (
                <label
                  key={k.verdi}
                  className="has-checked:border-accent-2 has-checked:bg-accent-2/10 flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white/[0.03] px-3 py-2 text-sm text-fg transition-colors"
                >
                  <input
                    type="checkbox"
                    name="kvaliteter"
                    value={k.verdi}
                    className="h-4 w-4 accent-accent-2"
                  />
                  <k.Ikon size={15} className="shrink-0 text-accent-2" />
                  <span>{k.tittel}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-white/[0.03] px-3.5 py-3 text-sm text-fg">
            <input
              type="checkbox"
              name="fellesLek"
              className="h-4 w-4 accent-accent-3"
            />
            <span>
              <span className="font-medium">Felles lek</span> — alle er med, også
              du (ingen fast vert)
            </span>
          </label>

          <Button type="submit" className="mt-1 self-start">
            Opprett øvelse
          </Button>
        </form>
      </Card>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium tracking-widest text-fg-dim uppercase">
          Dine øvelser
        </h2>
        {mine.length === 0 ? (
          <p className="text-sm text-fg-dim">
            Du har ingen øvelser ennå. Legg til én over.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {mine.map((ovelse) => (
              <Card
                key={ovelse.id}
                padding="p-4 sm:p-5"
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-display text-lg text-fg">
                      {ovelse.navn}
                    </p>
                    <Badge
                      variant={statusVariant[ovelse.status]}
                      pulse={ovelse.status === "PAAGAAR"}
                    >
                      {statusTekst[ovelse.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-fg-faint">
                    <span>
                      {ovelse.type === "LAG" ? "Lagøvelse" : "Individuell"}
                    </span>
                    {ovelse.lokasjon && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} /> {ovelse.lokasjon}
                      </span>
                    )}
                    {ovelse.fellesLek && (
                      <span className="inline-flex items-center gap-1 text-accent-3">
                        <Users size={12} /> Felles lek
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <LinkButton
                    href={`/ovelser/${ovelse.id}`}
                    variant="secondary"
                    className="px-3 py-2 text-xs"
                  >
                    <Settings2 size={14} /> Administrer
                  </LinkButton>
                  <form action={slettOvelse.bind(null, ovelse.id)}>
                    <Button
                      type="submit"
                      variant="danger"
                      className="px-3 py-2 text-xs"
                    >
                      <Trash2 size={14} /> Slett
                    </Button>
                  </form>
                </div>
              </Card>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
