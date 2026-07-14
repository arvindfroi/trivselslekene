"use client";

import { useRef, useState, useTransition } from "react";
import { opprettOvelse } from "@/lib/actions/ovelser";
import { opprettTurnering } from "@/lib/actions/turnering";
import { antallByes } from "@/lib/bracket";
import {
  kvalitetValg,
  lagFormatValg,
} from "@/lib/ovelseLabels";
import Button from "@/components/ui/Button";
import { ChoiceCard, FormatChip } from "@/components/ui/ChoiceCard";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { ImageIcon, Plus, Trash2, X } from "lucide-react";

// Skalerer bildet ned til maks 1024px og komprimerer til JPEG data-URL
function skalerBilde(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("lesefeil"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("bildefeil"));
      img.onload = () => {
        const maks = 1024;
        const skala = Math.min(1, maks / Math.max(img.width, img.height));
        const w = Math.round(img.width * skala);
        const h = Math.round(img.height * skala);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

type StillingSpiller = {
  userId: string;
  navn: string;
};

type Deltager = {
  userId: string;
  navn: string;
};

type Props = {
  stillingTopp: StillingSpiller[];
  alleDeltagere: Deltager[];
};

type OpprettType = "ovelse" | "lagkamp" | "turnering";

type LokalFase = {
  id: number; // lokal ID for React keys
  tittel: string;
  bildeUrl: string | null;
};

let nesteFaseId = 1;

export default function NyOvelseForm({ stillingTopp, alleDeltagere }: Props) {
  const [opprettType, setOpprettType] = useState<OpprettType>("ovelse");
  const [ovelseType, setOvelseType] = useState<"INDIVIDUELL" | "LAG">("INDIVIDUELL");
  const [lagFormat, setLagFormat] = useState<typeof lagFormatValg[number]["verdi"]>("PAR");
  const [bildeUrl, setBildeUrl] = useState<string | null>(null);
  const [faser, setFaser] = useState<LokalFase[]>([]);
  const [valgteDeltagere, setValgteDeltagere] = useState<Set<string>>(new Set());
  const [antallTurneringDeltagere, setAntallTurneringDeltagere] = useState(8);
  const [antallInput, setAntallInput] = useState("8");
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const faseFileRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  // ─── Deltager-avkrysning ──────────────────────────────────────────
  const toggleDeltager = (userId: string) => {
    setValgteDeltagere((prev) => {
      const neste = new Set(prev);
      if (neste.has(userId)) neste.delete(userId);
      else neste.add(userId);
      return neste;
    });
  };

  const velgAlle = () => {
    setValgteDeltagere(new Set(alleDeltagere.map((d) => d.userId)));
  };

  const fjernAlle = () => {
    setValgteDeltagere(new Set());
  };

  // Auto-velg alle når fellesLek aktiveres, tøm når den skrus av
  const handleFellesLekChange = (checked: boolean) => {
    if (checked) {
      setValgteDeltagere(new Set(alleDeltagere.map((d) => d.userId)));
    } else {
      setValgteDeltagere(new Set());
    }
  };

  // ─── Enkeltbilde ───────────────────────────────────────────────────
  const velgFil = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await skalerBilde(file);
      setBildeUrl(dataUrl);
    } catch {
      // ignorer
    }
  };

  const fjernBilde = () => setBildeUrl(null);

  // ─── Faser ─────────────────────────────────────────────────────────
  const leggTilFase = () => {
    setFaser((prev) => [...prev, { id: nesteFaseId++, tittel: "", bildeUrl: null }]);
  };

  const fjernFase = (faseId: number) => {
    setFaser((prev) => prev.filter((f) => f.id !== faseId));
    faseFileRefs.current.delete(faseId);
  };

  const oppdaterFaseTittel = (faseId: number, tittel: string) => {
    setFaser((prev) =>
      prev.map((f) => (f.id === faseId ? { ...f, tittel } : f))
    );
  };

  const velgFaseBilde = async (faseId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await skalerBilde(file);
      setFaser((prev) =>
        prev.map((f) => (f.id === faseId ? { ...f, bildeUrl: dataUrl } : f))
      );
    } catch {
      // ignorer
    }
  };

  const fjernFaseBilde = (faseId: number) => {
    setFaser((prev) =>
      prev.map((f) => (f.id === faseId ? { ...f, bildeUrl: null } : f))
    );
  };

  // Serialiser faser til hidden JSON-felt
  const faserJson = JSON.stringify(
    faser.map((f) => ({ tittel: f.tittel, bildeUrl: f.bildeUrl }))
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      if (opprettType === "turnering") {
        await opprettTurnering(formData);
      } else {
        await opprettOvelse(null, formData);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Skjult felt så server-action vet hva som skal opprettes */}
      <input type="hidden" name="opprettType" value={opprettType} />
      <input type="hidden" name="bildeUrl" value={bildeUrl ?? ""} />
      <input type="hidden" name="faser" value={faserJson} />
      <input type="hidden" name="antallDeltagere" value={antallTurneringDeltagere} />
      {[...valgteDeltagere].map((userId) => (
        <input key={userId} type="hidden" name="deltagere" value={userId} />
      ))}

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
              Type lek
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <ChoiceCard
                valgt={ovelseType === "INDIVIDUELL"}
                onClick={() => setOvelseType("INDIVIDUELL")}
                tittel="Individuell"
                tekst="Alle for seg selv"
              />
              <ChoiceCard
                valgt={ovelseType === "LAG"}
                onClick={() => setOvelseType("LAG")}
                tittel="Lag"
                tekst="Konkurrer i lag"
              />
            </div>
            <input type="hidden" name="type" value={ovelseType} />
          </fieldset>

          {/* Lagformat (bare for lagleker) */}
          {ovelseType === "LAG" && (
            <fieldset>
              <legend className="mb-1.5 block text-[11px] font-medium tracking-widest text-fg-dim uppercase">
                Lagformat
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {lagFormatValg.map((v) => (
                  <FormatChip
                    key={v.verdi}
                    valgt={lagFormat === v.verdi}
                    onClick={() => setLagFormat(v.verdi)}
                    tittel={v.tittel}
                    hint={v.hint}
                  />
                ))}
              </div>
              <input type="hidden" name="lagFormat" value={lagFormat} />
            </fieldset>
          )}

          {/* Beskrivelse */}
          <div>
            <Label htmlFor="beskrivelse">Beskrivelse (valgfritt)</Label>
            <Textarea id="beskrivelse" name="beskrivelse" rows={2} />
          </div>

          {/* Bilde (kart/illustrasjon) — enkeltbilde for leker uten faser */}
          <div>
            <Label>Kart / illustrasjon (valgfritt)</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={velgFil}
            />
            {bildeUrl ? (
              <div className="relative mt-2 overflow-hidden rounded-xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bildeUrl}
                  alt="Forhåndsvisning"
                  className="max-h-64 w-full object-contain bg-black/20"
                />
                <button
                  type="button"
                  onClick={fjernBilde}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white backdrop-blur transition-colors hover:bg-red-600"
                  aria-label="Fjern bilde"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-white/[0.02] px-4 py-6 text-sm text-fg-dim transition-colors hover:border-accent-2 hover:text-accent-2"
              >
                <ImageIcon size={18} />
                Last opp kart eller illustrasjon
              </button>
            )}
          </div>

          {/* ─── Faser ───────────────────────────────────────────────── */}
          <div className="rounded-xl border border-line bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-fg">
                  Faser (valgfritt)
                </p>
                <p className="mt-0.5 text-xs text-fg-faint">
                  Legg til flere deler med hvert sitt bilde. Verten kan
                  navigere mellom fasene under gjennomføring.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="shrink-0 px-3 py-2 text-xs"
                onClick={leggTilFase}
              >
                <Plus size={14} /> Legg til fase
              </Button>
            </div>

            {faser.length > 0 && (
              <div className="mt-4 flex flex-col gap-3">
                {faser.map((fase, i) => (
                  <div
                    key={fase.id}
                    className="flex flex-col gap-2 rounded-lg border border-line bg-white/[0.03] p-3 sm:flex-row sm:items-start"
                  >
                    <span className="shrink-0 pt-1 text-xs font-medium tabular-nums text-fg-dim">
                      Fase {i + 1}
                    </span>
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Tittel (valgfritt, f.eks. «Hele hagen»)"
                        value={fase.tittel}
                        onChange={(e) =>
                          oppdaterFaseTittel(fase.id, e.target.value)
                        }
                      />
                      <input
                        ref={(el) => {
                          if (el) faseFileRefs.current.set(fase.id, el);
                          else faseFileRefs.current.delete(fase.id);
                        }}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => velgFaseBilde(fase.id, e)}
                      />
                      {fase.bildeUrl ? (
                        <div className="relative overflow-hidden rounded-lg border border-line">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={fase.bildeUrl}
                            alt={`Forhåndsvisning fase ${i + 1}`}
                            className="max-h-40 w-full object-contain bg-black/20"
                          />
                          <button
                            type="button"
                            onClick={() => fjernFaseBilde(fase.id)}
                            className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white backdrop-blur transition-colors hover:bg-red-600"
                            aria-label="Fjern bilde"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            faseFileRefs.current.get(fase.id)?.click()
                          }
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line bg-white/[0.02] px-3 py-4 text-xs text-fg-dim transition-colors hover:border-accent-2 hover:text-accent-2"
                        >
                          <ImageIcon size={14} />
                          Last opp bilde for fase {i + 1}
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fjernFase(fase.id)}
                      className="shrink-0 self-end rounded-lg p-1.5 text-fg-faint transition-colors hover:bg-red-600/10 hover:text-red-400 sm:self-start"
                      aria-label={`Fjern fase ${i + 1}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              onChange={(e) => handleFellesLekChange(e.target.checked)}
            />
            <span>
              <span className="font-medium">Felles lek</span> — alle er med, også
              du (ingen fast vert)
            </span>
          </label>

          {/* ─── Deltagere ─────────────────────────────────────────── */}
          <div className="rounded-xl border border-line bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-fg">
                  Deltagere
                </p>
                <p className="mt-0.5 text-xs text-fg-faint">
                  {valgteDeltagere.size} av {alleDeltagere.length} valgt
                </p>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={velgAlle}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent-2 transition-colors hover:bg-accent-2/10"
                >
                  Alle
                </button>
                <button
                  type="button"
                  onClick={fjernAlle}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-fg-dim transition-colors hover:bg-white/[0.06]"
                >
                  Ingen
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {alleDeltagere.map((d) => (
                <label
                  key={d.userId}
                  className="has-checked:border-accent-2 has-checked:bg-accent-2/10 flex cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-white/[0.03] px-3 py-2 text-sm text-fg transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={valgteDeltagere.has(d.userId)}
                    onChange={() => toggleDeltager(d.userId)}
                    className="h-4 w-4 accent-accent-2"
                  />
                  {d.navn}
                </label>
              ))}
            </div>
          </div>
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
          <Label htmlFor="antallInput">Antall deltagere</Label>
          <div className="flex items-center gap-3 mb-3">
            <Input
              id="antallInput"
              type="number"
              min={3}
              max={64}
              value={antallInput}
              onChange={(e) => {
                setAntallInput(e.target.value);
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 3 && v <= 64) {
                  setAntallTurneringDeltagere(v);
                }
              }}
              onBlur={() => {
                const v = parseInt(antallInput, 10);
                if (isNaN(v) || v < 3) {
                  setAntallInput("3");
                  setAntallTurneringDeltagere(3);
                } else if (v > 64) {
                  setAntallInput("64");
                  setAntallTurneringDeltagere(64);
                } else {
                  setAntallInput(String(v));
                  setAntallTurneringDeltagere(v);
                }
              }}
              className="w-24"
            />
            <span className="text-xs text-fg-faint">
              {antallByes(antallTurneringDeltagere) > 0
                ? `${antallByes(antallTurneringDeltagere)} walkover — toppseedene går rett til runde 2`
                : "ingen walkovers"}
            </span>
          </div>

          <Label>Deltagere (seed 1–{antallTurneringDeltagere})</Label>
          <p className="mb-2 text-xs text-fg-faint">
            Forhåndsutfylt fra stillingen. Bytt ut ved å velge andre deltagere.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: antallTurneringDeltagere }, (_, i) => i + 1).map((seed) => (
              <div key={seed}>
                <Label htmlFor={`seed${seed}`} className="text-xs">
                  Seed #{seed}
                </Label>
                <Select
                  id={`seed${seed}`}
                  name={`seed${seed}`}
                  required
                  defaultValue={stillingTopp[seed - 1]?.userId ?? ""}
                >
                  <option value="">Velg deltager</option>
                  {stillingTopp.map((s) => (
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
              : "Opprett lek"}
      </Button>
    </form>
  );
}
