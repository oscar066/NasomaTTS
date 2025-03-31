const {
  UserInputError,
  AuthenticationError,
  ForbiddenError,
} = require("apollo-server-express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const Document = require("../models/document");
const User = require("../models/user");
const { default: mongoose } = require("mongoose");

const Mutation = {
  // Mutation for creating a document
  createDoc: async (parent, { title, content }, context) => {
    // Check if user is authenticated
    if (!context.user) {
      throw new AuthenticationError(
        "You must be signed in to upload a document"
      );
    }

    // Validate input
    if (!title || !content) {
      throw new UserInputError(
        "Both title and content are required to create a document"
      );
    }

    if (title.length > 200) {
      throw new UserInputError("Title is too long (max 200 characters)");
    }

    // Find the user by id from the JWT token
    const user = await User.findById(context.user.id);
    if (!user) {
      throw new AuthenticationError("User not found");
    }

    // Create new document with the user's ID
    const newDocument = new Document({
      title,
      content,
      author: user._id, // Use the user's _id directly
    });

    try {
      await newDocument.save();
      // Populate the author field so that GraphQL can resolve full User details
      await newDocument.populate("author");
    } catch (err) {
      console.error("Error saving new document:", err);
      throw new Error("Could not save document");
    }

    return newDocument;
  },

  // Mutation for deleting a document
  deleteDocument: async (parent, { id }, context) => {
    if (!context.user) {
      throw new AuthenticationError(
        "You must be signed in to delete a document"
      );
    }

    const document = await Document.findById(id);
    if (!document) {
      throw new UserInputError("Document not found.");
    }

    // Find the user by id from the JWT token
    const user = await User.findById(context.user.id);
    if (!user) {
      throw new AuthenticationError("User not found");
    }

    // Check if the user is the author of the document
    if (String(document.author) !== String(user._id)) {
      throw new ForbiddenError(
        "You don't have permission to delete this document"
      );
    }

    try {
      await document.deleteOne();
      return true;
    } catch (err) {
      console.error("Error deleting document:", err);
      throw new Error("Failed to delete document");
    }
  },

  // Mutation for signing up a user
  signUp: async (parent, { username, email, password }) => {
    email = email.trim().toLowerCase();
    const hashed = await bcrypt.hash(password, 10);
    const avatar = gravatar.url(email, { s: "200", r: "pg", d: "mm" });

    try {
      const user = await User.create({
        username,
        email,
        avatar,
        password: hashed,
      });
      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables.");
      }
      return jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    } catch (err) {
      console.error("Error creating account:", err);
      throw new Error("Error creating account");
    }
  },

  // Mutation for signing in a user
  signIn: async (parent, { username, email, password }) => {
    if (email) {
      email = email.trim().toLowerCase();
    }

    const user = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (!user) {
      throw new AuthenticationError("Error signing in");
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new AuthenticationError("Error signing in");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables.");
    }

    return jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  },
};

module.exports = Mutation;
