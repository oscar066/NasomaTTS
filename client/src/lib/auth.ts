/**
 * NextAuth configuration — kept in a dedicated module so it can be imported
 * by both the route handler and any server-side helpers (e.g. getServerSession)
 */

import { Account, DefaultSession, Session, SessionStrategy } from "next-auth";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
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
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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
    async jwt({ token, user, account }: { token: JWT; user: any; account: Account | null }) {
      // Google sign-in — exchange Google id_token for our backend JWT
      if (account?.provider === "google" && account.id_token) {
        try {
          const { access_token } = await authApi.googleAuth(account.id_token);
          const me = await authApi.me(access_token);
          token.id          = me.id;
          token.email       = me.email;
          token.accessToken = access_token;
        } catch (err) {
          console.error("Google auth exchange failed:", err);
        }
      }
      // Credentials sign-in — only runs when user.token exists (not for Google)
      if (user) {
        token.id    = user.id;
        token.email = user.email;
        if (user.token) token.accessToken = user.token;
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
