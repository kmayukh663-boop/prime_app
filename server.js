require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:3000",
    "http://localhost:3000"
  ]
}));
app.use(express.json());

const uploadDir = path.join(__dirname, "private_uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${require("crypto").randomUUID()}${ext}`);
  }
});

const allowedExtensions = new Set([
  ".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"
]);

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 12
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.has(ext)) {
      return cb(new Error("Unsupported document format."));
    }
    cb(null, true);
  }
});

// Database Schemas & Models
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["parent", "tutor", "admin"], required: true },
  status: { type: String, default: "active" },
  createdAt: { type: Date, default: Date.now }
}, { collection: "users" });

const parentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  location: { type: String, required: true },
  studentClass: { type: String, required: true },
  subjectsNeeded: [String],
  preferredTime: String,
  budget: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { collection: "Parent_db" });

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

// Dynamic Form Layout Schemas (stored in MongoDB for the Admin Form Builder)
const formSchemaSchema = new mongoose.Schema({
  form_type: { type: String, required: true, unique: true },
  fields: { type: Array, required: true },
  updated_at: { type: Date, default: Date.now }
}, { collection: "FormSchemas" });

const User = mongoose.model("User", userSchema);
const ParentProfile = mongoose.model("ParentProfile", parentSchema);
const TutorProfile = mongoose.model("TutorProfile", tutorSchema);
const FormSchemaModel = mongoose.model("FormSchemaModel", formSchemaSchema);

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
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!\%*?&]{8,}$/.test(value);
}

async function createAccount({ fullName, email, phone, password, role }) {
  fullName = String(fullName || "").trim();
  email = String(email || "").trim().toLowerCase();
  phone = normalizePhone(phone);

  if (!fullName || !validEmail(email) || !validPhone(phone) || !validPassword(password || "")) {
    const error = new Error("Please check your name, email, phone and password.");
    error.status = 400;
    throw error;
  }

  const existing = await User.findOne({
    $or: [{ email }, { phone }]
  });

  if (existing) {
    const error = new Error("An account with this email or phone already exists.");
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

app.get("/", (req, res) => {
  res.json({ message: "Prime Tuitions API is running" });
});

// --- DYNAMIC FORM SCHEMA API ENDPOINTS ---

// GET form schema fields by type ('parent' or 'tutor')
app.get("/api/schemas/:type", async (req, res) => {
  try {
    const config = await FormSchemaModel.findOne({ form_type: req.params.type });
    if (!config) return res.json([]);
    res.json(config.fields);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST / Save form schema fields updated via Admin Form Builder
app.post("/api/schemas/:type", async (req, res) => {
  try {
    const { fields } = req.body;
    const updated = await FormSchemaModel.findOneAndUpdate(
      { form_type: req.params.type },
      { fields, updated_at: new Date() },
      { upsert: true, new: true }
    );
    res.json({ message: "Schema updated successfully", updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- REGISTRATION ENDPOINTS ---

// Parent registration
app.post("/api/auth/register/parent", async (req, res) => {
  let user;

  try {
    const {
      fullName, email, phone, password,
      location, studentClass, subjectsNeeded,
      preferredTime, budget
    } = req.body;

    if (!location || !studentClass || !budget ||
        !Array.isArray(subjectsNeeded) || subjectsNeeded.length === 0) {
      return res.status(400).json({
        message: "Please provide the location, class, subjects and budget."
      });
    }

    user = await createAccount({
      fullName, email, phone, password, role: "parent"
    });

    try {
      await ParentProfile.create({
        userId: user._id,
        location,
        studentClass,
        subjectsNeeded,
        preferredTime,
        budget
      });
    } catch (profileError) {
      await User.deleteOne({ _id: user._id });
      throw profileError;
    }

    res.status(201).json({
      message: "Parent registration successful."
    });
  } catch (error) {
    console.error("Parent registration error:", error.message);
    res.status(error.status || (error.code === 11000 ? 409 : 500)).json({
      message: error.status || error.code === 11000
        ? error.message
        : "Registration failed. Please try again."
    });
  }
});

// Tutor registration and document upload
app.post(
  "/api/auth/register/tutor",
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "educationDocs", maxCount: 10 },
    { name: "idProof", maxCount: 1 }
  ]),
  async (req, res) => {
    let user;

    try {
      const {
        fullName, email, phone, password, location,
        classes, subjects, qualification, experience, idType
      } = req.body;

      const files = req.files || {};

      if (!files.resume?.length ||
          !files.educationDocs?.length ||
          !files.idProof?.length ||
          !idType || !location || !classes || !subjects ||
          !qualification || !experience) {
        return res.status(400).json({
          message: "Please complete all fields and upload the required documents."
        });
      }

      user = await createAccount({
        fullName, email, phone, password, role: "tutor"
      });

      const documents = [
        ...files.resume.map(f => ({
          documentType: "resume",
          originalName: path.basename(f.originalname),
          storedName: f.filename
        })),
        ...files.educationDocs.map(f => ({
          documentType: "education",
          originalName: path.basename(f.originalname),
          storedName: f.filename
        })),
        ...files.idProof.map(f => ({
          documentType: "idProof",
          originalName: path.basename(f.originalname),
          storedName: f.filename
        }))
      ];

      try {
        await TutorProfile.create({
          userId: user._id,
          location, classes, subjects, qualification,
          experience, idType, documents
        });
      } catch (profileError) {
        await User.deleteOne({ _id: user._id });
        throw profileError;
      }

      res.status(201).json({
        message: "Tutor registration successful. Your documents are pending verification."
      });
    } catch (error) {
      console.error("Tutor registration error:", error.message);
      res.status(error.status || (error.code === 11000 ? 409 : 500)).json({
        message: error.status || error.code === 11000
          ? error.message
          : "Registration failed. Please try again."
      });
    }
  }
);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Request error:", err.message);
  if (res.headersSent) return next(err);

  const status = err instanceof multer.MulterError ? 400 : 400;
  res.status(status).json({
    message: err.message || "Request failed."
  });
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/prime_tuitions");
    console.log("MongoDB connected successfully!");

    app.listen(process.env.PORT || 5000, () => {
      console.log("Server running at http://localhost:5000");
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

startServer(); 