import { auth } from "@/lib/auth";
import FloatingNav from "@/components/FloatingNav";

export default async function SiteNav() {
  const session = await auth();
  return <FloatingNav loggedIn={!!session?.user} />;
}
