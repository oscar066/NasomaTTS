import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { ApolloClient, InMemoryCache, gql } from "@apollo/client";
import jwt from "jsonwebtoken";

// Initialize Apollo Client to connect to your GraphQL endpoint

const client = new ApolloClient({
  uri: "http://localhost:5000/graphql",
  cache: new InMemoryCache(),
});

const handler = NextAuth({
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
        try {
          // Call your GraphQL signIn mutation using Apollo Client
          const response = await client.mutate({
            mutation: gql`
              mutation SignIn($email: String!, $password: String!) {
                signIn(email: $email, password: $password)
              }
            `,
            variables: {
              email: credentials?.email,
              password: credentials?.password,
            },
          });

          // Extract the token returned from the mutation
          const token = response?.data?.signIn;
          if (!token) {
            return null;
          }

          // Verify the token to ensure it is valid and to extract the payload
          if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined");
          }
          const user = jwt.verify(token, process.env.JWT_SECRET);
          if (!user || typeof user === "string") {
            return null;
          }

          // Return user object that NextAuth will use in the session
          return {
            id: (user as any).id, // ensure your token payload contains an id field
            email: credentials?.email,
            token, // you might store the token if needed later in callbacks
          };
        } catch (error) {
          console.error("Error in authorize function:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      // On initial sign in, merge user data into the JWT token.
      if (user) {
        token = { ...token, ...user };
      }
      return token;
    },

    async session({ session, token }) {
      // Make the token properties available in the session.
      session.user = token as any;
      return session;
    },
  },
  pages: {
    signIn: "/auth/login", // Your custom sign-in page route
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
