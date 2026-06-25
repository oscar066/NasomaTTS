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
    error?: "AccessTokenExpired";
    user: {
      id: string;
      email: string;
      is_superuser: boolean;
      plan: string;
    } & DefaultSession["user"];
  }
}

// 30 days in seconds — must match jwt_expire_hours in backend config.py
const BACKEND_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

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
          token.id                  = me.id;
          token.email               = me.email;
          token.accessToken         = access_token;
          token.accessTokenExpiry   = Date.now() + BACKEND_TOKEN_TTL_SECONDS * 1000;
          token.is_superuser        = me.is_superuser;
          token.plan                = me.plan;
        } catch (err) {
          console.error("Google auth exchange failed:", err);
        }
      }
      // Credentials sign-in — only runs when user.token exists (not for Google)
      if (user) {
        token.id    = user.id;
        token.email = user.email;
        if (user.token) {
          token.accessToken        = user.token;
          token.accessTokenExpiry  = Date.now() + BACKEND_TOKEN_TTL_SECONDS * 1000;
          const me = await authApi.me(user.token as string);
          token.is_superuser = me.is_superuser;
          token.plan         = me.plan;
        }
      }
      // On subsequent requests check whether the backend token has expired.
      if (token.accessTokenExpiry && Date.now() > (token.accessTokenExpiry as number)) {
        token.accessToken       = undefined;
        token.accessTokenExpiry = undefined;
        token.error             = "AccessTokenExpired";
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token) {
        session.user = {
          id:           token.id as string,
          email:        token.email as string,
          is_superuser: (token.is_superuser as boolean) ?? false,
          plan:         (token.plan as string) ?? "free",
        };
        session.accessToken = token.accessToken as string | undefined;
        if (token.error) session.error = token.error as "AccessTokenExpired";
      }
      return session;
    },
  },
  pages:  { signIn: "/auth/login" },
  secret: process.env.NEXTAUTH_SECRET,
};
