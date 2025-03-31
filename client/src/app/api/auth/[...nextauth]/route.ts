import NextAuth, { DefaultSession, Session, SessionStrategy } from "next-auth";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { ApolloClient, InMemoryCache, gql } from "@apollo/client";
import jwt from "jsonwebtoken";

// Add type declarations for NextAuth
declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    user: {
      id: string;
      email: string;
    } & DefaultSession["user"];
  }
}

// Initialize Apollo Client with better configuration
const client = new ApolloClient({
  uri: process.env.GRAPHQL_URI || "http://localhost:5000/graphql",
  cache: new InMemoryCache(),
});

// GraphQL mutation
const SIGN_IN_MUTATION = gql`
  mutation SignIn($email: String!, $password: String!) {
    signIn(email: $email, password: $password)
  }
`;

export const authOptions = {
  debug: process.env.NODE_ENV === "development",
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "your-email@example.com",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        try {
          const response = await client.mutate({
            mutation: SIGN_IN_MUTATION,
            variables: {
              email: credentials.email,
              password: credentials.password,
            },
          });

          const token = response?.data?.signIn;
          if (!token) {
            throw new Error("Invalid credentials");
          }

          if (!process.env.JWT_SECRET) {
            throw new Error(
              "Server configuration error: JWT_SECRET is not defined"
            );
          }

          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (!decoded || typeof decoded === "string") {
            throw new Error("Invalid token format");
          }

          return {
            id: (decoded as any).id,
            email: credentials.email,
            token,
          };
          
        } catch (error) {
          console.error("Authentication error:", error);
          throw new Error(
            error instanceof Error ? error.message : "Authentication failed"
          );
        }
      },
    }),
  ],
  session: {
    strategy: "jwt" as SessionStrategy,
    maxAge: 30 * 24 * 60 * 60, // 30 days
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
        session.user = {
          id: token.id as string,
          email: token.email as string,
        };
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
