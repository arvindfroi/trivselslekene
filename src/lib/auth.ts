import { cache } from "react";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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

/**
 * Den innloggede brukeren slik den faktisk finnes i databasen — ikke bare slik
 * JWT-en påstår. Sesjonen varer i et år, så en cookie kan godt peke på en
 * bruker som er slettet i mellomtiden (f.eks. etter en nullstilling). Uten
 * dette oppslaget ville en slik cookie se innlogget ut og gi enten
 * fremmednøkkelfeil ved skriving, eller en omdirigeringsløkke mellom
 * /bli-med og /dashboard. `cache` gjør at oppslaget bare skjer én gang per
 * request selv om mange komponenter spør.
 */
export const hentInnloggetBruker = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  return prisma.user.findUnique({
    where: { id },
    select: { id: true, navn: true },
  });
});

export async function krevInnloggetBruker() {
  const bruker = await hentInnloggetBruker();
  if (!bruker) {
    redirect("/bli-med");
  }
  return bruker;
}
