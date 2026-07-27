import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import MainShell from "@/components/MainShell";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/bli-med");

  return <MainShell>{children}</MainShell>;
}
