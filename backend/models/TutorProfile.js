const mongoose = require("mongoose");

const tutorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  location: { type: String, required: true },
  classes: { type: String, required: true },
  subjects: { type: String, required: true },
  qualification: { type: String, required: true },
  experience: { type: String, required: true },
  idType: { type: String, required: true },
  documents: [{
    documentType: String,
    originalName: String,
    storedName: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  verificationStatus: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now }
}, { collection: "Tutor_db" });

module.exports = mongoose.models.TutorProfile ||
  mongoose.model("TutorProfile", tutorSchema);
