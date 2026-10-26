
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const readline = require("readline");
const User = require("../models/User");
const {
  validEmail,
  validPhone,
  validPassword,
  normalizePhone
} = require("../utils/accountHelpers");

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
      rl.question(question, answer => resolve(answer));
      return;
    }

    process.stdout.write(question);
    let password = "";

    const onData = key => {
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
    };

    function cleanup() {
      process.stdin.removeListener("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from backend/.env");
  }

  const fullName = (await ask("Admin full name: ")).trim();
  const email = (await ask("Admin email: ")).trim().toLowerCase();
  const phone = normalizePhone(await ask("Admin phone: "));
  const password = await askPassword("Admin password (input hidden): ");

  if (
    !fullName ||
    !validEmail(email) ||
    !validPhone(phone) ||
    !validPassword(password)
  ) {
    throw new Error(
      "Invalid details. Phone must be a valid Indian mobile number. Password must be at least 8 characters and contain a letter, a number, and one of @$!%*?&."
    );
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({
    $or: [{ email }, { phone }]
  }).select("_id email phone");

  if (existing) {
    throw new Error(
      "An account with this email or phone already exists. Nothing was changed."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await User.create({
    fullName,
    email,
    phone,
    passwordHash,
    role: "admin",
    status: "active"
  });

  console.log("\nAdmin created successfully.");
  console.log("MongoDB collection: users");
  console.log("Admin ID:", admin._id.toString());
  console.log("Email:", admin.email);
  console.log("Role:", admin.role);
  console.log("Status:", admin.status);
  console.log("Password stored as a bcrypt hash; plaintext was not saved.");
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
