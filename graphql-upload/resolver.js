const { GraphQLUpload } = require('apollo-server-express');
const fs = require('fs');
const path = require('path');

const resolvers = {

  Upload: GraphQLUpload,

  Query: {
    hello: () => 'Hello, world!',
  },

  Mutation: {
    async UploadDocuments(_, { docs }) {
      try {
        for (const doc of docs) {
          const { createReadStream, filename } = await doc.file;
          const stream = createReadStream();
          const filePath = path.join(__dirname, 'uploads', filename);
          const out = fs.createWriteStream(filePath);
          stream.pipe(out);
          await new Promise((resolve, reject) => {
            out.on('finish', resolve);
            out.on('error', reject);
          });
        }
        return {
          success: true,
          message: 'Files uploaded successfully',
        };
      } catch (error) {
        console.error(error);
        return {
          success: false,
          message: 'Failed to upload files',
        };
      }
    },
  },
};

module.exports = resolvers;