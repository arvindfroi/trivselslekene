"use client";

import { useActionState } from "react";
import { opprettLagkamp } from "@/lib/actions/fotballkamp";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Field";
import { Plus } from "lucide-react";

const FORMATER = [
  { value: "FIRE_MOT_FEM", label: "4 mot 5" },
  { value: "TRE_MOT_TRE_MOT_TRE", label: "3 mot 3 mot 3" },
  { value: "TO_MOT_TO_MOT_TO_MOT_TO", label: "2 mot 2 mot 2 mot 2" },
];

export default function NyLagkampForm() {
  const [, formAction, isPending] = useActionState(opprettLagkamp, null);

  return (
    <Card className="mt-8" padding="p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-medium tracking-widest text-fg-dim uppercase">
        <Plus size={16} /> Ny lagkamp
      </h2>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label htmlFor="navn">Navn på kampen</Label>
            <Input
              id="navn"
              name="navn"
              required
              placeholder="F.eks. Lagkamp runde 1"
            />
          </div>
          <div>
            <Label htmlFor="format">Format</Label>
            <Select id="format" name="format" defaultValue="FIRE_MOT_FEM">
              {FORMATER.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
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
