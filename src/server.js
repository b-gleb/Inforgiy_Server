import app from './app.js';
import { initializeMongoDB } from './config/db.js';

let server;
let mongoClient;

async function startServer() {
  try {
    mongoClient = await initializeMongoDB();

    const PORT = process.env.PORT;
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize MongoDB, server will not start:', err);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
async function shutdown() {
  console.log('\nShutting down...');
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
    });
  }

  if (mongoClient) {
    await mongoClient.close();
    console.log('MongoDB connection closed');
  }

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
