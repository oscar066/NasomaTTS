/**
 * NextAuth configuration — kept in a dedicated module so it can be imported
 * by both the route handler and any server-side helpers (e.g. getServerSession)
 * without violating Next.js 15's rule that route files may only export HTTP
 * verb handlers.
 */

import { DefaultSession, Session, SessionStrategy } from "next-auth";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { authApi } from "@/lib/api";

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    user: {
      id: string;
      email: string;
    } & DefaultSession["user"];
  }
}

export const authOptions = {
  debug: process.env.NODE_ENV === "development",
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }
        const { access_token } = await authApi.signin({
          email:    credentials.email,
          password: credentials.password,
        });
        const user = await authApi.me(access_token);
        return { id: user.id, email: user.email, token: access_token };
      },
    }),
  ],
  session: {
    strategy: "jwt" as SessionStrategy,
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user }: { token: JWT; user: any }) {
      if (user) {
        token.id          = user.id;
        token.email       = user.email;
        token.accessToken = user.token;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token) {
        session.user        = { id: token.id as string, email: token.email as string };
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  pages:  { signIn: "/auth/login" },
  secret: process.env.NEXTAUTH_SECRET,
};
