"use client";

import { useActionState } from "react";
import { opprettLagkamp } from "@/lib/actions/fotballkamp";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { Plus } from "lucide-react";

export default function NyLagkampForm() {
  const [, formAction, isPending] = useActionState(opprettLagkamp, null);

  return (
    <Card className="mt-8" padding="p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-medium tracking-widest text-fg-dim uppercase">
        <Plus size={16} /> Ny lagkamp
      </h2>
      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="navn">Navn på kampen</Label>
          <Input
            id="navn"
            name="navn"
            required
            placeholder="F.eks. Lagkamp runde 1"
          />
        </div>
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
        <div>
          <Label htmlFor="lokasjon">Lokasjon</Label>
          <Input
            id="lokasjon"
            name="lokasjon"
            placeholder="F.eks. kunstgressbanen"
          />
        </div>
        <Button type="submit" className="self-start" disabled={isPending}>
          {isPending ? "Oppretter…" : "Opprett kamp"}
        </Button>
      </form>
    </Card>
  );
}
