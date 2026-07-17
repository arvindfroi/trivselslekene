"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

type Rest = { dager: number; timer: number; minutter: number; sekunder: number };

function beregnRest(maal: number): Rest | null {
  const diff = maal - Date.now();
  if (diff <= 0) return null;
  const sek = Math.floor(diff / 1000);
  return {
    dager: Math.floor(sek / 86400),
    timer: Math.floor((sek % 86400) / 3600),
    minutter: Math.floor((sek % 3600) / 60),
    sekunder: sek % 60,
  };
}

/**
 * Nedtelling til leknavnene avsløres. Oppdaterer hvert sekund og friskner
 * opp siden (server-state) når tiden er ute, så de skjulte navnene dukker
 * opp av seg selv.
 */
export default function Nedtelling({
  maalISO,
  className,
}: {
  maalISO: string;
  className?: string;
}) {
  const maal = new Date(maalISO).getTime();
  // Starter som null — samme på server og ved første klient-render, så det
  // blir ingen hydrerings-forskjell. Fylles inn straks etter montering.
  const [rest, setRest] = useState<Rest | null>(null);
  const router = useRouter();

  useEffect(() => {
    let stoppet = false;
    const oppdater = () => {
      const ny = beregnRest(maal);
      setRest(ny);
      if (!ny) {
        stoppet = true;
        router.refresh();
      }
    };
    // Første oppdatering i en microtask (ikke synkront i effektkroppen), så
    // nedtellingen vises umiddelbart uten å utløse hydrerings-hopp.
    queueMicrotask(oppdater);
    const id = setInterval(() => {
      if (stoppet) return;
      oppdater();
    }, 1000);
    return () => clearInterval(id);
  }, [maal, router]);

  if (!rest) return null;

  const felter: { verdi: number; merke: string }[] = [
    { verdi: rest.dager, merke: "dager" },
    { verdi: rest.timer, merke: "timer" },
    { verdi: rest.minutter, merke: "min" },
    { verdi: rest.sekunder, merke: "sek" },
  ];

  return (
    <div
      className={`rounded-2xl border border-line bg-white/[0.03] px-4 py-4 sm:px-5 ${className ?? ""}`}
    >
      <p className="flex items-center gap-1.5 text-xs tracking-[0.2em] text-accent-2 uppercase">
        <Lock size={13} /> Lekene avsløres
      </p>
      <div className="mt-3 flex items-end gap-2 sm:gap-3">
        {felter.map((f, i) => (
          <div key={f.merke} className="flex items-end gap-2 sm:gap-3">
            <div className="text-center">
              <span className="block font-display text-3xl tabular-nums text-fg sm:text-4xl">
                {String(f.verdi).padStart(2, "0")}
              </span>
              <span className="mt-0.5 block text-[10px] tracking-widest text-fg-faint uppercase">
                {f.merke}
              </span>
            </div>
            {i < felter.length - 1 && (
              <span className="pb-5 font-display text-2xl text-fg-faint sm:text-3xl">
                :
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-fg-dim">
        Navnene på lekene holdes hemmelige til 28. juli kl. 12:00. Din egen lek
        ser og styrer du som vanlig.
      </p>
    </div>
  );
}
