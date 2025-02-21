const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type Document {
    id: ID!
    title: String!
    content: String!
    author: User!
    createdAt: String!
    updatedAt: String!
  }

  type User {
    id: ID!
    username: String!
    email: String!
    avatar: String!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    documents: [Document!]
    document(id: ID!): Document
    users: [User!]
    user(id: ID!): User
  }

  type Mutation {
    createDoc(title: String!, content: String!): Document!
    deleteDocument(id: ID!): Boolean!
    signUp(username: String!, email: String!, password: String!): String!
    signIn(email: String!, password: String!): String!
  }
`;

module.exports = typeDefs;
