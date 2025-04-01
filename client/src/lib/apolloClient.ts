// lib/apolloClient.ts
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { getSession } from 'next-auth/react';

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:5000/graphql',
  // credentials: 'include', // Include credentials if your server requires them
});

const authLink = setContext(async (_, { headers }) => {
  const session = await getSession();
  const authHeader = session?.accessToken ? `Bearer ${session.accessToken}` : "";
  return {
    headers: {
      ...headers,
      authorization: authHeader,
    }
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

export default client;
