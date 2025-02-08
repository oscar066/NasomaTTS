const { gql } = require("apollo-server-express");

const typeDefs = gql`
  scalar Upload

  type Document {
    id: ID!
    title: String!
    author: String!
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
    uploadPDF(file: Upload!): Document!
    deleteDocument(id: ID!): Boolean!
    signUp(username: String!, email: String!, password: String!): String!
    signIn(username: String!, email: String!, password: String!): String!
  }
`;

module.exports = typeDefs;
