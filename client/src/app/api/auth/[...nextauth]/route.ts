import NextAuth, { DefaultSession, Session, SessionStrategy } from "next-auth";
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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const { token } = await authApi.signin({
          email: credentials.email,
          password: credentials.password,
        });

        const user = await authApi.me(token);

        return {
          id: user.id,
          email: user.email,
          token,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt" as SessionStrategy,
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: any }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.accessToken = user.token;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token) {
        session.user = { id: token.id as string, email: token.email as string };
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  pages: { signIn: "/auth/login" },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
