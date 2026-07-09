"use client";

import { useState, useActionState } from "react";
import { opprettOvelse } from "@/lib/actions/ovelser";
import {
  kvalitetValg,
  lagFormatValg,
} from "@/lib/ovelseLabels";
import Button from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";

type StillingSpiller = {
  userId: string;
  navn: string;
};

type Props = {
  stillingTopp8: StillingSpiller[];
};

type OpprettType = "ovelse" | "lagkamp" | "turnering";

export default function NyOvelseForm({ stillingTopp8 }: Props) {
  const [opprettType, setOpprettType] = useState<OpprettType>("ovelse");
  const [ovelseType, setOvelseType] = useState<"INDIVIDUELL" | "LAG">("INDIVIDUELL");
  const [, formAction, isPending] = useActionState(opprettOvelse, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* Skjult felt så server-action vet hva som skal opprettes */}
      <input type="hidden" name="opprettType" value={opprettType} />

      {/* Navn */}
      <div>
        <Label htmlFor="navn">Navn</Label>
        <Input
          id="navn"
          name="navn"
          required
          placeholder={
            opprettType === "turnering"
              ? "F.eks. Trivselslekene Cup 2026"
              : opprettType === "lagkamp"
                ? "F.eks. Lagkamp runde 1"
                : "F.eks. Stikkball, Bridge-turnering, Sekkeløp"
          }
        />
      </div>

      {/* Lokasjon */}
      <div>
        <Label htmlFor="lokasjon">Lokasjon (valgfritt)</Label>
        <Input
          id="lokasjon"
          name="lokasjon"
          placeholder={
            opprettType === "lagkamp"
              ? "F.eks. kunstgressbanen"
              : "F.eks. i hagen"
          }
        />
      </div>

      {/* Typevelger */}
      <fieldset>
        <legend className="mb-1.5 block text-[11px] font-medium tracking-widest text-fg-dim uppercase">
          Hva vil du opprette?
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              { value: "ovelse", label: "Øvelse" },
              { value: "lagkamp", label: "Lagkamp" },
              { value: "turnering", label: "Turnering" },
            ] as const
          ).map(({ value, label }) => (
            <label
              key={value}
              className="has-checked:border-accent-2 has-checked:bg-accent-2/10 flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5 text-sm text-fg transition-colors"
            >
              <input
                type="radio"
                name="_opprettType"
                value={value}
                checked={opprettType === value}
                onChange={() => setOpprettType(value)}
                className="accent-accent-2"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* ─── Øvelse-spesifikke felter ─── */}
      {opprettType === "ovelse" && (
        <>
          {/* Øvelsestype: Individuell vs Lag */}
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
                  checked={ovelseType === "INDIVIDUELL"}
                  onChange={() => setOvelseType("INDIVIDUELL")}
                  className="accent-accent-2"
                />
                Individuell
              </label>
              <label className="has-checked:border-accent-2 has-checked:bg-accent-2/10 flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5 text-sm text-fg transition-colors">
                <input
                  type="radio"
                  name="type"
                  value="LAG"
                  checked={ovelseType === "LAG"}
                  onChange={() => setOvelseType("LAG")}
                  className="accent-accent-2"
                />
                Lagøvelse
              </label>
            </div>
          </fieldset>

          {/* Lagformat (bare for lagøvelser) */}
          {ovelseType === "LAG" && (
            <div>
              <Label htmlFor="lagFormat">Lagformat</Label>
              <Select id="lagFormat" name="lagFormat" defaultValue="PAR">
                {lagFormatValg.map((v) => (
                  <option key={v.verdi} value={v.verdi}>
                    {v.tittel} — {v.hint}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Beskrivelse */}
          <div>
            <Label htmlFor="beskrivelse">Beskrivelse (valgfritt)</Label>
            <Textarea id="beskrivelse" name="beskrivelse" rows={2} />
          </div>

          {/* Kvaliteter */}
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

          {/* Felles lek */}
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
        </>
      )}

      {/* ─── Lagkamp-spesifikke felter ─── */}
      {opprettType === "lagkamp" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="antallDeltakere">Antall deltakere</Label>
            <Input
              id="antallDeltakere"
              name="antallDeltakere"
              type="number"
              min={2}
              required
              placeholder="F.eks. 9"
            />
          </div>
          <div>
            <Label htmlFor="antallLag">Antall lag</Label>
            <Input
              id="antallLag"
              name="antallLag"
              type="number"
              min={2}
              max={10}
              required
              placeholder="F.eks. 2"
            />
          </div>
        </div>
      )}

      {/* ─── Turnering-spesifikke felter ─── */}
      {opprettType === "turnering" && (
        <div>
          <Label>Deltagere (seed 1–8)</Label>
          <p className="mb-2 text-xs text-fg-faint">
            Forhåndsutfylt fra stillingen. Bytt ut ved å velge andre deltagere.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((seed) => (
              <div key={seed}>
                <Label htmlFor={`seed${seed}`} className="text-xs">
                  Seed #{seed}
                </Label>
                <Select
                  id={`seed${seed}`}
                  name={`seed${seed}`}
                  required
                  defaultValue={stillingTopp8[seed - 1]?.userId ?? ""}
                >
                  <option value="">Velg deltager</option>
                  {stillingTopp8.map((s) => (
                    <option key={s.userId} value={s.userId}>
                      {s.navn}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button type="submit" className="mt-1 self-start" disabled={isPending}>
        {isPending
          ? "Oppretter…"
          : opprettType === "turnering"
            ? "Opprett turnering"
            : opprettType === "lagkamp"
              ? "Opprett lagkamp"
              : "Opprett øvelse"}
      </Button>
    </form>
  );
}
