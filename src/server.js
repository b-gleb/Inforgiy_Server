import makeApp from './app.js';
import database from './database.js';

let server;
let mongoClient;
const app = makeApp(database);

async function startServer() {
  try {
    mongoClient = await database.initializeMongoDB();

    const PORT = process.env.PORT;
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize MongoDB, server will not start:', err);
    process.exit(1);
  }
}

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

startServer();
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
