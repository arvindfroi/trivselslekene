import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SesongAdmin from "./SesongAdmin";
import BrukerAdmin from "./BrukerAdmin";

export default async function AdminSide() {
  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  return (
    <main className="pt-6 pb-28 px-4 max-w-2xl mx-auto">
      <h1 className="font-display text-4xl text-fg">Admin</h1>
      <SesongAdmin />
      <BrukerAdmin />
    </main>
  );
}
