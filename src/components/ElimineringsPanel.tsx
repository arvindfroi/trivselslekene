"use client";

import { useTransition } from "react";
import { X, Undo2 } from "lucide-react";
import { eliminerDeltaker, angreEliminering } from "@/lib/actions/ovelser";

interface DeltakerMedStatus {
  userId: string;
  navn: string;
  utgattFase: number | null;
}

interface Props {
  ovelseId: string;
  deltakere: DeltakerMedStatus[];
  aktivFase: number;
  erVert: boolean;
  status: string;
  harFaser: boolean;
}

/**
 * Panel for å eliminere deltakere mellom faser i en øvelse.
 * Kun synlig for vert når øvelsen pågår og har faser.
 *
 * Utslåtte deltakere får automatisk sisteplasser:
 * - Først utslått (fase 1) = siste plass
 * - Sist utslått = beste plass blant de utslåtte
 * - Overlevende får topplasseringer
 */
export default function ElimineringsPanel({
  ovelseId,
  deltakere,
  aktivFase,
  erVert,
  status,
  harFaser,
}: Props) {
  const [isPending, startTransition] = useTransition();

  if (!erVert || status !== "PAAGAAR" || !harFaser || aktivFase < 1) {
    return null;
  }

  const aktive = deltakere.filter((d) => d.utgattFase === null);
  const utslaatte = deltakere
    .filter((d) => d.utgattFase !== null)
    .sort((a, b) => (b.utgattFase ?? 0) - (a.utgattFase ?? 0));

  function handleEliminer(userId: string) {
    startTransition(async () => {
      await eliminerDeltaker(ovelseId, userId);
    });
  }

  function handleAngre(userId: string) {
    startTransition(async () => {
      await angreEliminering(ovelseId, userId);
    });
  }

  return (
    <div className="mt-6 rounded-xl border border-line bg-white/[0.02] p-4">
      <h3 className="mb-3 text-sm font-medium tracking-widest text-fg-dim uppercase">
        Eliminering · Fase {aktivFase}
      </h3>

      {/* Aktive deltakere */}
      {aktive.length > 0 && (
        <ul className="flex flex-col">
          {aktive.map((d) => (
            <li
              key={d.userId}
              className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0"
            >
              <span className="text-sm text-fg">{d.navn}</span>
              <button
                type="button"
                onClick={() => handleEliminer(d.userId)}
                disabled={isPending}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/15 disabled:opacity-45"
                aria-label={`Eliminer ${d.navn} i fase ${aktivFase}`}
              >
                <X size={14} />
                Slå ut
              </button>
            </li>
          ))}
        </ul>
      )}

      {aktive.length === 0 && utslaatte.length === 0 && (
        <p className="py-2 text-center text-sm text-fg-dim">
          Ingen deltakere
        </p>
      )}

      {/* Utslåtte deltakere */}
      {utslaatte.length > 0 && (
        <div className={aktive.length > 0 ? "mt-4 border-t border-line pt-3" : ""}>
          <p className="mb-2 text-xs font-medium text-fg-faint uppercase tracking-wider">
            Utslåtte
          </p>
          <ul className="flex flex-col">
            {utslaatte.map((d) => (
              <li
                key={d.userId}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span className="text-fg-faint line-through">{d.navn}</span>
                  <span className="text-xs text-fg-faint">
                    (fase {d.utgattFase})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => handleAngre(d.userId)}
                  disabled={isPending}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-fg-dim transition-colors hover:bg-white/[0.06] hover:text-fg disabled:opacity-45"
                  aria-label={`Angre eliminering av ${d.navn}`}
                >
                  <Undo2 size={13} />
                  Angre
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
