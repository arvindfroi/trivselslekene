"use client";

import { useState, type ReactNode } from "react";
import { Plus, Minus } from "lucide-react";

type Props = {
  tittel: string;
  startApen?: boolean;
  children: ReactNode;
};

export default function KollapsSeksjon({
  tittel,
  startApen = false,
  children,
}: Props) {
  const [apen, setApen] = useState(startApen);

  return (
    <>
      <button
        type="button"
        onClick={() => setApen((a) => !a)}
        aria-expanded={apen}
        className="flex w-full cursor-pointer items-center gap-2 text-sm font-medium tracking-widest text-fg-dim uppercase transition-colors hover:text-fg"
      >
        {apen ? <Minus size={16} /> : <Plus size={16} />} {tittel}
      </button>
      {apen && <div className="mt-4">{children}</div>}
    </>
  );
}
