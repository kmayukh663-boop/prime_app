// Application entry point: load environment, connect to MongoDB, then listen.
require("dotenv").config();

const dns = require("dns");

// Preserve the DNS workaround required for MongoDB Atlas SRV resolution.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const mongoose = require("mongoose");
const app = require("./server/app");
const connectDB = require("./server/config/db");

async function startServer() {
  try {
    await connectDB();

    const port = Number(process.env.PORT) || 5000;
    const server = app.listen(port, () => {
      console.log(`Prime Tuitions API listening on port ${port}.`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received; shutting down gracefully.`);

      server.close(async () => {
        try {
          await mongoose.disconnect();
          process.exit(0);
        } catch (error) {
          console.error("Error during shutdown:", error.message);
          process.exit(1);
        }
      });
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
