import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import MainShell from "@/components/MainShell";
import HjemSide from "./dashboard/page";
import OvelserSide from "./ovelser/page";
import StillingSide from "./stilling/page";
import ProfilSide from "./profil/page";

export default async function MainLayout() {
  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  return (
    <MainShell
      panels={[
        <HjemSide key="dashboard" />,
        <OvelserSide key="ovelser" />,
        <StillingSide key="stilling" />,
        <ProfilSide key="profil" searchParams={Promise.resolve({})} />,
      ]}
    />
  );
}
