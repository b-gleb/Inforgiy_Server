import app from './app.js';;
import { initializeMongoDB } from './config/db.js';

let mongo_client;

async function startServer() {
  try {
    mongo_client = await initializeMongoDB();

    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize MongoDB, server will not start:', err);
  }
}

startServer();

// SHUTDOWN
process.on("SIGINT", async () => {
  await mongo_client.close();
  console.log("Disconnected from MongoDB");
  process.exit(0);
});