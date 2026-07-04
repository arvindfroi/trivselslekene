import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/logg-inn",
  },
  providers: [
    Credentials({
      credentials: {
        epost: {},
        passord: {},
      },
      authorize: async (credentials) => {
        const epost = credentials?.epost as string | undefined;
        const passord = credentials?.passord as string | undefined;
        if (!epost || !passord) return null;

        const user = await prisma.user.findUnique({ where: { epost } });
        if (!user) return null;

        const passordOk = await bcrypt.compare(passord, user.passordHash);
        if (!passordOk) return null;

        return { id: user.id, name: user.navn, email: user.epost };
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
