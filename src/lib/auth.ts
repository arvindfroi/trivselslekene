import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { finnEllerOpprettBruker } from "@/lib/brukere";

const ETT_AAR = 60 * 60 * 24 * 365;

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: ETT_AAR },
  pages: {
    signIn: "/bli-med",
  },
  providers: [
    Credentials({
      credentials: {
        navn: {},
      },
      // Ingen passord: navnet identifiserer deg. Finnes navnet fra før logger
      // du inn på den kontoen, ellers opprettes den. Sessionen huskes i et år.
      authorize: async (credentials) => {
        const navn = credentials?.navn as string | undefined;
        if (!navn) return null;

        const user = await finnEllerOpprettBruker(navn);
        if (!user) return null;

        return { id: user.id, name: user.navn };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

export async function krevInnloggetBruker() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/bli-med");
  }
  return session.user;
}
