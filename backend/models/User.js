const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["parent", "tutor", "admin"], required: true },
  status: { type: String, default: "active" },
  createdAt: { type: Date, default: Date.now }
}, { collection: "users" });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
