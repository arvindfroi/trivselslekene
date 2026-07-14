"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";
import Avatar from "@/components/Avatar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { endreNavn, oppdaterBilde } from "@/lib/actions/profil";
import { autoLagreTekst, useAutoLagre } from "@/lib/useAutoLagre";

// Skalerer bildet ned til maks 256px og komprimerer til en liten JPEG-dataURL
// før det lagres, så vi slipper ekstern fillagring.
function skalerBilde(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("lesefeil"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("bildefeil"));
      img.onload = () => {
        const maks = 256;
        const skala = Math.min(1, maks / Math.max(img.width, img.height));
        const w = Math.round(img.width * skala);
        const h = Math.round(img.height * skala);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfilRediger({
  navn,
  bildeUrl,
}: {
  navn: string;
  bildeUrl: string | null;
}) {
  const [bilde, setBilde] = useState<string | null>(bildeUrl);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // Navnet auto-lagres kort tid etter siste tastetrykk — ingen Lagre-knapp.
  const [navnVerdi, setNavnVerdi] = useState(navn);
  const [navnFeil, setNavnFeil] = useState<"kort" | "opptatt" | null>(null);
  const navnStatus = useAutoLagre(
    navnVerdi,
    async (verdi) => {
      const res = await endreNavn(verdi);
      setNavnFeil(res.feil);
      if (res.feil) throw new Error(res.feil);
    },
    { aktiv: navnVerdi.trim().length >= 2, forsinkelseMs: 1500 },
  );

  const velgFil = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await skalerBilde(file);
      setBilde(dataUrl);
      startTransition(() => {
        oppdaterBilde(dataUrl);
      });
    } catch {
      // ignorer – brukeren kan prøve på nytt
    }
  };

  const fjern = () => {
    setBilde(null);
    startTransition(() => {
      oppdaterBilde(null);
    });
  };

  return (
    <Card padding="p-5 sm:p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex items-center gap-4">
          <Avatar navn={navnVerdi} bildeUrl={bilde} size={72} />
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={velgFil}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
              className="px-3 py-2 text-xs"
            >
              <Camera size={14} /> {bilde ? "Bytt bilde" : "Legg til bilde"}
            </Button>
            {bilde && (
              <Button
                type="button"
                variant="danger"
                onClick={fjern}
                disabled={pending}
                className="px-3 py-2 text-xs"
              >
                <Trash2 size={14} /> Fjern
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="navn">Navn</Label>
            <span
              aria-live="polite"
              className={`text-xs ${
                navnStatus === "feil"
                  ? "text-red-400"
                  : navnStatus === "lagret"
                    ? "text-accent-2"
                    : "text-fg-faint"
              }`}
            >
              {pending ? "Lagrer…" : autoLagreTekst(navnStatus)}
            </span>
          </div>
          <Input
            id="navn"
            name="navn"
            value={navnVerdi}
            onChange={(e) => setNavnVerdi(e.target.value)}
            required
            minLength={2}
          />
          {navnFeil === "opptatt" && (
            <p className="mt-2 text-sm text-red-300">
              Navnet er allerede i bruk av en annen deltaker.
            </p>
          )}
          {navnFeil === "kort" && (
            <p className="mt-2 text-sm text-red-300">
              Navnet må ha minst to bokstaver.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
