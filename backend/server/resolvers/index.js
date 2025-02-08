const Query = require('./query');
const Mutation = require('./mutation');
const Document = require('./document');
const User = require('./user');
const { GraphQLDateTime } = require('graphql-iso-date');

module.exports = {
    Query,
    Mutation,
    Document,
    User,
    DateTime: GraphQLDateTime
};