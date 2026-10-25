require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const {
  validEmail,
  validPhone,
  validPassword,
  normalizePhone
} = require("../utils/accountHelpers");

async function main() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD } = process.env;

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing.");
  }

  if (!process.env.ADMIN_TOKEN_SECRET ||
      Buffer.byteLength(process.env.ADMIN_TOKEN_SECRET, "utf8") < 32) {
    throw new Error("Configure ADMIN_TOKEN_SECRET first.");
  }

  const fullName = String(ADMIN_NAME || "").trim();
  const email = String(ADMIN_EMAIL || "").trim().toLowerCase();
  const phone = normalizePhone(ADMIN_PHONE);
  const password = ADMIN_PASSWORD || "";

  if (!fullName || !validEmail(email) ||
      !validPhone(phone) || !validPassword(password)) {
    throw new Error(
      "Provide a valid ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, and a password meeting the existing password policy."
    );
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({
    $or: [{ email }, { phone }]
  }).select("_id email phone");

  if (existing) {
    throw new Error(
      "An account with that email or phone already exists. No account was changed."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await User.create({
    fullName,
    email,
    phone,
    passwordHash,
    role: "admin",
    status: "active"
  });

  console.log("Admin account created successfully.");
}

main()
  .catch(error => {
    console.error("Admin provisioning failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
