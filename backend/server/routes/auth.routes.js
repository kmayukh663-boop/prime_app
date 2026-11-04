
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const User = require("../../models/User");
const ParentProfile = require("../../models/ParentProfile");
const TutorProfile = require("../../models/TutorProfile");
const FormSchema = require("../../models/FormSchema");

const { createAccount } = require("../../utils/accountHelpers");

const router = express.Router();

const uploadDir = path.join(__dirname, "../../private_uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});

const allowedExtensions = new Set([
  ".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"
]);

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 12 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.has(ext)) {
      const error = new Error("Unsupported document format.");
      error.status = 400;
      return cb(error);
    }

    cb(null, true);
  }
});

// --------------------------------------------------
// Registration helpers
// --------------------------------------------------

function getUploadedFiles(files) {
  return Object.values(files || {}).flat();
}

function cleanupUploadedFiles(files) {
  for (const file of getUploadedFiles(files)) {
    if (file?.path) {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.error("Upload cleanup failed:", error.message);
        }
      }
    }
  }
}

function parseCustomFields(value) {
  if (value === undefined || value === null || value === "") {
    return {};
  }

  let parsed = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      const error = new Error("Custom fields must contain valid JSON.");
      error.status = 400;
      throw error;
    }
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    const error = new Error("Custom fields must be an object.");
    error.status = 400;
    throw error;
  }

  return parsed;
}

async function validateCustomFields(formType, customFields) {
  const schema = await FormSchema.findOne({
    formType,
    publishedVersion: { $gt: 0 }
  }).select("publishedFields");

  if (!schema) {
    const error = new Error(
      "Registration is currently unavailable because the form has not been published."
    );
    error.status = 503;
    throw error;
  }

  const publishedFields = schema.publishedFields || [];

  const systemIds = new Set(
    require("../../utils/systemFields").getSystemFieldIds(formType)
  );

  const customDefinitions = new Map(
    publishedFields
      .filter(field => !systemIds.has(field.id))
      .map(field => [field.id, field])
  );

  for (const [fieldId, value] of Object.entries(customFields)) {
    const definition = customDefinitions.get(fieldId);

    if (!definition) {
      const error = new Error(
        `Custom field ${fieldId} is not part of the published form.`
      );
      error.status = 400;
      throw error;
    }

    if (
      value !== null &&
      !["string", "number", "boolean"].includes(typeof value) &&
      !Array.isArray(value)
    ) {
      const error = new Error(
        `Custom field ${fieldId} has an invalid value.`
      );
      error.status = 400;
      throw error;
    }
  }

  for (const [fieldId, definition] of customDefinitions) {
    if (
      definition.required &&
      (
        !Object.prototype.hasOwnProperty.call(customFields, fieldId) ||
        customFields[fieldId] === "" ||
        customFields[fieldId] === null ||
        customFields[fieldId] === undefined ||
        (Array.isArray(customFields[fieldId]) &&
          customFields[fieldId].length === 0)
      )
    ) {
      const error = new Error(
        `Please complete the required field: ${definition.displayName || definition.label}.`
      );
      error.status = 400;
      throw error;
    }
  }

  return customFields;
}

// --------------------------------------------------
// Parent registration
// POST /api/auth/register/parent
// --------------------------------------------------

router.post("/register/parent", async (req, res) => {
  let user;

  try {
    const {
      fullName,
      email,
      phone,
      password,
      location,
      studentClass,
      subjectsNeeded,
      preferredTime,
      budget
    } = req.body;

    if (
      !location ||
      !studentClass ||
      !budget ||
      !Array.isArray(subjectsNeeded) ||
      subjectsNeeded.length === 0
    ) {
      return res.status(400).json({
        message: "Please provide the location, class, subjects and budget."
      });
    }

    const customFields = await validateCustomFields(
      "parent",
      parseCustomFields(req.body.customFields)
    );

    user = await createAccount({
      fullName,
      email,
      phone,
      password,
      role: "parent"
    });

    try {
      await ParentProfile.create({
        userId: user._id,
        location,
        studentClass,
        subjectsNeeded,
        preferredTime,
        budget,
        customFields
      });
    } catch (profileError) {
      await User.deleteOne({ _id: user._id });
      throw profileError;
    }

    return res.status(201).json({
      message: "Parent registration successful."
    });
  } catch (error) {
    console.error("Parent registration error:", error.message);

    const status = error.status || (error.code === 11000 ? 409 : 500);

    return res.status(status).json({
      message: error.status || error.code === 11000
        ? error.message
        : "Registration failed. Please try again."
    });
  }
});

// --------------------------------------------------
// Tutor registration
// POST /api/auth/register/tutor
// --------------------------------------------------

router.post(
  "/register/tutor",
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "educationDocs", maxCount: 10 },
    { name: "idProof", maxCount: 1 }
  ]),
  async (req, res) => {
    let user;

    try {
      const {
        fullName,
        email,
        phone,
        password,
        location,
        classes,
        subjects,
        qualification,
        experience,
        idType
      } = req.body;

      const files = req.files || {};

      if (
        !files.resume?.length ||
        !files.educationDocs?.length ||
        !files.idProof?.length ||
        !idType ||
        !location ||
        !classes ||
        !subjects ||
        !qualification ||
        !experience
      ) {
        cleanupUploadedFiles(files);

        return res.status(400).json({
          message: "Please complete all fields and upload the required documents."
        });
      }

      const customFields = await validateCustomFields(
        "tutor",
        parseCustomFields(req.body.customFields)
      );

      user = await createAccount({
        fullName,
        email,
        phone,
        password,
        role: "tutor"
      });

      const documents = [
        ...files.resume.map(file => ({
          documentType: "resume",
          originalName: path.basename(file.originalname),
          storedName: file.filename
        })),

        ...files.educationDocs.map(file => ({
          documentType: "education",
          originalName: path.basename(file.originalname),
          storedName: file.filename
        })),

        ...files.idProof.map(file => ({
          documentType: "idProof",
          originalName: path.basename(file.originalname),
          storedName: file.filename
        }))
      ];

      try {
        await TutorProfile.create({
          userId: user._id,
          location,
          classes,
          subjects,
          qualification,
          experience,
          idType,
          documents,
          customFields
        });
      } catch (profileError) {
        await User.deleteOne({ _id: user._id });
        throw profileError;
      }

      return res.status(201).json({
        message: "Tutor registration successful. Your documents are pending verification."
      });
    } catch (error) {
      if (user?._id) {
        try {
          await User.deleteOne({ _id: user._id });
        } catch (cleanupError) {
          console.error("User rollback failed:", cleanupError.message);
        }
      }

      cleanupUploadedFiles(req.files);

      console.error("Tutor registration error:", error.message);

      const status = error.status || (error.code === 11000 ? 409 : 500);

      return res.status(status).json({
        message: error.status || error.code === 11000
          ? error.message
          : "Registration failed. Please try again."
      });
    }
  }
);

// --------------------------------------------------
// Multer error handling
// --------------------------------------------------

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError || error.status === 400) {
    cleanupUploadedFiles(req.files);

    return res.status(error.status || 400).json({
      message: error.message || "Document upload failed."
    });
  }

  return next(error);
});

module.exports = router;
