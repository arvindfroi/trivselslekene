import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { sikreAktivSesong } from "@/lib/sesong";
import { hentFinaleData } from "@/lib/finale";
import FinaleShow from "@/components/FinaleShow";

export const metadata: Metadata = { title: "Finaleshow" };

/** Fullskjerm-presentasjon av lekenes resultater, laget for PC koblet
 *  til TV. Styres med Neste/Forrige-knapper eller piltastene. */
export default async function FinaleSide() {
  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  const sesong = await sikreAktivSesong();
  const data = await hentFinaleData(sesong);

  return <FinaleShow data={data} />;
}
