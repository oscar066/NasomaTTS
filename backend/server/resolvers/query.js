const Document = require("../models/document");
const User = require("../models/user");

const Query = {
  documents: async () => {
    return await Document.find().populate("author");
  },

  document: async (parent, { id }) => {
    return await Document.findById(id).populate("author");
  },

  documentsByAuthor: async (parent, { email }) => {
    const user = await User.findOne({ email });
    if(!user){
      throw new Error("User not found");
    }
    return await Document.find({ author: user._id }).populate("author");
  },

  users: async () => {
    return await User.find();
  },

  user: async (parent, { id }) => {
    return await User.findById(id);
  },

  me: async (parent, args, context) => {
    if (!context.user) {
      throw new AuthenticationError("You must be signed in");
    }

    return await User.findById(context.user.id);
  },
};

module.exports = Query;
