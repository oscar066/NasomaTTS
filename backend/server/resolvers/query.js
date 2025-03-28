const Document = require("../models/document");
const User = require("../models/user");

const Query = {
  documents: async () => {
    return await Document.find().populate("author");
  },

  document: async (parent, { id }) => {
    return await Document.findById(id).populate("author");
  },

  users: async () => {
    return await User.find();
  },

  user: async (parent, { id }) => {
    return await User.findById(id);
  },
};

module.exports = Query;
