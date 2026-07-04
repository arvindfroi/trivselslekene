import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Onboarding from "@/components/Onboarding";

export default async function BliMedSide() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  return <Onboarding />;
}
