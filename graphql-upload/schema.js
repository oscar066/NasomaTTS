const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar Upload

  input DocumentUploadInput {
    docType: String!
    file: Upload!
  }

  type SuccessResult {
    success: Boolean!
    message: String
  }

  type Query {
    hello: String
  }

  type Mutation {
    UploadDocuments(docs: [DocumentUploadInput!]!): SuccessResult
  }
`;

module.exports = typeDefs;