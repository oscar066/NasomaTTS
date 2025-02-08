 // server.js
const express = require('express');
const { ApolloServer ,gql } = require('apollo-server-express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { connectDB, closeDB } = require("./db");
const typeDefs = require("./schema");
const resolvers = require('./resolvers');

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Import route modules
const pdfRoutes = require('./routes/pdfRoutes');
const voiceRoutes = require('./routes/voiceRoutes');
const speakRoutes = require('./routes/speakRoutes');

const app = express();

// connect to the database
connectDB();

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));
// app.use(helmet());

// Mount routes under an API namespace
app.use('/api/pdf', pdfRoutes);
app.use('/api/voices', voiceRoutes);
app.use('/api/speak', speakRoutes);

// Apollo Server setup
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers.authorization || '';
    let user = null;
    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        console.warn('Invalid token')
      }
    }
    return { user };
  },
});

async function startServer() {
  await server.start();
  server.applyMiddleware({ app });

  // Global Error Handler Middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || 'Internal Server Error' });
  });

  // Start the server
  const PORT = process.env.PORT || 5000;
  const serverInstance = app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}${server.graphqlPath}`));

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down server...');
    await closeDB();
    serverInstance.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();