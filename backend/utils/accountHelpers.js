
const bcrypt = require("bcryptjs");
const User = require("../models/User");

function normalizePhone(value) {
  return String(value || "").replace(/[\s-]/g, "");
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validPhone(value) {
  return /^(\+91)?[6-9]\d{9}$/.test(value);
}

function validPassword(value) {
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value);
}

async function createAccount({ fullName, email, phone, password, role }) {
  fullName = String(fullName || "").trim();
  email = String(email || "").trim().toLowerCase();
  phone = normalizePhone(phone);

  if (
    !fullName ||
    !validEmail(email) ||
    !validPhone(phone) ||
    !validPassword(password || "")
  ) {
    const error = new Error(
      "Please check your name, email, phone and password."
    );
    error.status = 400;
    throw error;
  }

  const existing = await User.findOne({
    $or: [{ email }, { phone }]
  });

  if (existing) {
    const error = new Error(
      "An account with this email or phone already exists."
    );
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  return User.create({
    fullName,
    email,
    phone,
    passwordHash,
    role
  });
}

module.exports = {
  normalizePhone,
  validEmail,
  validPhone,
  validPassword,
  createAccount
};
