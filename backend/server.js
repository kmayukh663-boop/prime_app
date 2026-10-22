
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User");
const ParentProfile = require("./models/ParentProfile");
const TutorProfile = require("./models/TutorProfile");

const {
  normalizePhone,
  validEmail,
  validPhone,
  validPassword,
  createAccount
} = require("./utils/accountHelpers");

const bcrypt = require("bcryptjs");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500"
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

app.get("/", (req, res) => {
  res.json({ message: "Prime Tuitions API is running" });
});

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

// Handle upload errors and unexpected server errors.
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
    await mongoose.connect(process.env.MONGODB_URI);
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
