"use client";

import { useActionState } from "react";
import { opprettFotballKamp } from "@/lib/actions/fotballkamp";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { Plus } from "lucide-react";

export default function NyFotballKampForm() {
  const [, formAction, isPending] = useActionState(opprettFotballKamp, null);

  return (
    <Card className="mt-8" padding="p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-medium tracking-widest text-fg-dim uppercase">
        <Plus size={16} /> Ny fotballkamp
      </h2>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="navn">Navn på kampen</Label>
            <Input
              id="navn"
              name="navn"
              required
              placeholder="F.eks. Fotballkamp runde 1"
            />
          </div>
          <div>
            <Label htmlFor="lokasjon">Lokasjon</Label>
            <Input
              id="lokasjon"
              name="lokasjon"
              placeholder="F.eks. kunstgressbanen"
            />
          </div>
        </div>
        <Button type="submit" className="self-start" disabled={isPending}>
          {isPending ? "Oppretter…" : "Opprett kamp"}
        </Button>
      </form>
    </Card>
  );
}
