const {
  UserInputError,
  AuthenticationError,
  ForbiddenError,
} = require("apollo-server-express");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const Document = require("../models/document");
const User = require("../models/user");
const { default: mongoose } = require("mongoose");

const Mutation = {
  // Mutation for uploading a PDF (creating a document)
  uploadPDF: async (parent, { file }, context) => {
    if (!context.user) {
      throw new AuthenticationError(
        "You must be signed in to upload a document"
      );
    }

    // Await the file promise from graphql-upload-ts
    const { createReadStream, filename, mimetype } = await file;

    console.log("Detected MIME type:", mimetype);
    if (mimetype !== "application/pdf") {
      throw new UserInputError("Only PDFs are allowed.");
    }

    // Create a file path (ensure the uploads folder exists)
    const filepath = path.join(__dirname, "../uploads", filename);
    const stream = createReadStream();
    const out = fs.createWriteStream(filepath);

    // Pipe the stream into the file and wait for completion
    await new Promise((resolve, reject) => {
      stream.pipe(out);
      out.on("finish", resolve);
      out.on("error", reject);
    });

    // Read the file into a buffer and extract PDF text
    const dataBuffer = fs.readFileSync(filepath);
    const pdfData = await pdfParse(dataBuffer);

    // Create and save a new document with the extracted content
    const newDocument = new Document({
      title: filename,
      content: pdfData.text,
      author: mongoose.Types.ObjectId(context.user.id),
    });

    await newDocument.save();

    // Optionally, delete the file after processing
    fs.unlink(filepath, (err) => {
      if (err) console.error("Error deleting file:", err);
    });

    return newDocument;
  },

  // Mutation for deleting a document
  deleteDocument: async (parent, { id }, { user }) => {
    if (!user) {
      throw new AuthenticationError(
        "You must be signed in to delete a document"
      );
    }

    const document = await Document.findById(id);
    if (!document) {
      throw new UserInputError("Document not found.");
    }

    if (String(document.author) !== user.id) {
      throw new ForbiddenError(
        "You don't have permission to delete this document"
      );
    }

    try {
      await document.remove();
      return true;
    } catch (err) {
      return false;
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
      return jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    } catch (err) {
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

    return jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  },
};

module.exports = Mutation;
