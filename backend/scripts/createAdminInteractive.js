const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const readline = require("readline");
const { createAccount } = require("../utils/accountHelpers");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function askPassword(question) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stdin.setRawMode) {
      rl.question(question, resolve);
      return;
    }

    process.stdout.write(question);
    let password = "";

    function cleanup() {
      process.stdin.removeListener("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    function onData(key) {
      const char = key.toString();

      if (char === "\u0003") {
        cleanup();
        reject(new Error("Cancelled."));
      } else if (char === "\r" || char === "\n") {
        cleanup();
        process.stdout.write("\n");
        resolve(password);
      } else if (char === "\u0008" || char === "\u007f") {
        password = password.slice(0, -1);
      } else if (char.length === 1) {
        password += char;
      }
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI or MONGO_URI is missing from backend/.env");
  }

  const fullName = (await ask("Admin full name: ")).trim();
  const email = (await ask("Admin email: ")).trim().toLowerCase();
  const phone = (await ask("Admin phone: ")).trim();
  const password = await askPassword("Admin password (input hidden): ");

  await mongoose.connect(mongoUri);

  const admin = await createAccount({
    fullName,
    email,
    phone,
    password,
    role: "admin"
  });

  console.log("\nAdmin account created successfully.");
  console.log("ID:", admin._id.toString());
  console.log("Email:", admin.email);
  console.log("Role:", admin.role);
  console.log("Status:", admin.status || "(check User schema default)");
}

main()
  .catch(error => {
    console.error("\nAdmin creation failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await mongoose.disconnect().catch(() => {});
  });
