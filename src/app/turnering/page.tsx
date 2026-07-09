import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { sikreAktivSesong } from "@/lib/sesong";
import DeltakerSlideshow from "@/components/DeltakerSlideshow";

export default async function TurneringSide() {
  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  const sesong = await sikreAktivSesong();

  return (
    <>
      <DeltakerSlideshow />
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-28 pb-12">
        <p className="text-xs tracking-[0.3em] text-accent-2 uppercase">
          {sesong.navn}
        </p>
        <h1 className="mt-1 font-display text-4xl text-fg">Turnering</h1>
        <p className="mt-2 text-sm text-fg-dim">
          Se og administrer turneringer.
        </p>
      </div>
    </>
  );
}
