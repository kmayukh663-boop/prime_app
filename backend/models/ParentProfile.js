const mongoose = require("mongoose");

const parentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  location: { type: String, required: true },
  studentClass: { type: String, required: true },
  subjectsNeeded: [String],
  preferredTime: String,
  budget: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { collection: "parent_db" });

module.exports = mongoose.models.ParentProfile ||
  mongoose.model("ParentProfile", parentSchema);
