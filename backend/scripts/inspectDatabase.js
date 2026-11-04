const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "../.env")
});

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const mongoose = require("mongoose");

async function inspectDatabase() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured.");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("\nConnected to staging database.");
    console.log("\nCollections and indexes:\n");

    const collections = await mongoose.connection.db
      .listCollections({}, { nameOnly: true })
      .toArray();

    for (const collection of collections) {
      console.log(`\nCollection: ${collection.name}`);

      const indexes = await mongoose.connection.db
        .collection(collection.name)
        .indexes();

      for (const index of indexes) {
        console.log({
          name: index.name,
          key: index.key,
          unique: index.unique || false
        });
      }
    }
  } catch (error) {
    console.error("Database inspection failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

inspectDatabase();
