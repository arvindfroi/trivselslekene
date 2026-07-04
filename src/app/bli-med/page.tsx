import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import Onboarding from "@/components/Onboarding";

export default async function BliMedSide() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const navn = (await cookies()).get("onboarding_navn")?.value ?? "";
  return <Onboarding startNavn={navn} />;
}
