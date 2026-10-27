const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User");
const ParentProfile = require("./models/ParentProfile");
const TutorProfile = require("./models/TutorProfile");
const FormSchema = require("./models/FormSchema");

const {
  signToken,
  requireAdmin
} = require("./utils/adminAuth");

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
app.use(express.static(path.join(__dirname, "../public")));

app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500"
  ]
}));

app.use(express.json({ limit: "1mb" }));

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get("/api/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    api: "ok",
    database: connected ? "connected" : "disconnected"
  });
});

// --------------------------------------------------
// Tutor document uploads
// --------------------------------------------------

const uploadDir = path.join(__dirname, "private_uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    cb(
      null,
      `${Date.now()}-${require("crypto").randomUUID()}${ext}`
    );
  }
});

const allowedExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png"
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

// --------------------------------------------------
// Form schema validation
// --------------------------------------------------

const VALID_FORM_TYPES = new Set(["parent", "tutor"]);

const ALLOWED_FIELD_TYPES = new Set([
  "text",
  "email",
  "tel",
  "password",
  "number",
  "select",
  "textarea",
  "file",
  "date",
  "checkbox",
  "radio"
]);

function validateFields(fields) {
  if (
    !Array.isArray(fields) ||
    fields.length < 1 ||
    fields.length > 100
  ) {
    return "Fields must be an array containing 1–100 field definitions.";
  }

  const ids = new Set();

  const allowedKeys = new Set([
    "id",
    "label",
    "type",
    "placeholder",
    "required",
    "width",
    "validation",
    "options",
    "dependencies"
  ]);

  for (const field of fields) {
    if (
      !field ||
      typeof field !== "object" ||
      Array.isArray(field)
    ) {
      return "Each field must be an object.";
    }

    if (Object.keys(field).some(key => !allowedKeys.has(key))) {
      return "A field contains an unsupported property.";
    }

    if (
      typeof field.id !== "string" ||
      !/^[A-Za-z][A-Za-z0-9_-]*$/.test(field.id) ||
      ids.has(field.id)
    ) {
      return "Field IDs must be valid and unique.";
    }

    ids.add(field.id);

    if (
      typeof field.label !== "string" ||
      !field.label.trim() ||
      field.label.length > 120
    ) {
      return `Field ${field.id} needs a label of at most 120 characters.`;
    }

    if (!ALLOWED_FIELD_TYPES.has(field.type)) {
      return `Field ${field.id} has an unsupported type.`;
    }

    if (
      field.placeholder !== undefined &&
      (
        typeof field.placeholder !== "string" ||
        field.placeholder.length > 250
      )
    ) {
      return `Field ${field.id} has an invalid placeholder.`;
    }

    if (
      field.required !== undefined &&
      typeof field.required !== "boolean"
    ) {
      return `Field ${field.id} has an invalid required value.`;
    }

    if (
      field.width !== undefined &&
      !["full", "half"].includes(field.width)
    ) {
      return `Field ${field.id} has an invalid width.`;
    }

    if (
      field.validation !== undefined &&
      (
        typeof field.validation !== "string" ||
        field.validation.length > 100
      )
    ) {
      return `Field ${field.id} has invalid validation metadata.`;
    }

    if (
      field.options !== undefined &&
      (
        !Array.isArray(field.options) ||
        field.options.length > 100
      )
    ) {
      return `Field ${field.id} has invalid options.`;
    }

    if (
      field.dependencies !== undefined &&
      (
        !field.dependencies ||
        typeof field.dependencies !== "object" ||
        Array.isArray(field.dependencies)
      )
    ) {
      return `Field ${field.id} has invalid dependencies.`;
    }

    if (
      ["select", "radio"].includes(field.type) &&
      (
        !Array.isArray(field.options) ||
        field.options.length === 0
      )
    ) {
      return `Field ${field.id} requires options.`;
    }
  }

  return null;
}

// --------------------------------------------------
// Public: read the published form schema
// Keep this route public.
// --------------------------------------------------

app.get("/api/schemas/:formType", async (req, res) => {
  try {
    const { formType } = req.params;

    if (!VALID_FORM_TYPES.has(formType)) {
      return res.status(400).json({
        message: "Unsupported form type."
      });
    }

    const schema = await FormSchema.findOne({ formType })
      .select(
        "formType publishedFields publishedVersion publishedAt"
      )
      .lean();

    if (!schema || schema.publishedVersion === 0) {
      return res.status(404).json({
        message: "No published schema exists for this form."
      });
    }

    return res.json({
      formType: schema.formType,
      fields: schema.publishedFields,
      version: schema.publishedVersion,
      publishedAt: schema.publishedAt
    });
  } catch (error) {
    console.error("Read form schema failed:", error.message);

    return res.status(500).json({
      message: "Unable to load the form schema."
    });
  }
});

// --------------------------------------------------
// Admin: login
// --------------------------------------------------

app.post("/api/admin/login", async (req, res) => {
  try {
    const email = normalizePhone
      ? String(req.body.email || "").trim().toLowerCase()
      : String(req.body.email || "").trim().toLowerCase();

    const password = req.body.password;

    if (
      !email ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const admin = await User.findOne({ email })
      .select("+passwordHash role status fullName email");

    // Use the same response for an unknown account and wrong password.
    if (
      !admin ||
      admin.role !== "admin" ||
      admin.status !== "active"
    ) {
      return res.status(401).json({
        message: "Invalid credentials or inactive admin account."
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      admin.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid credentials or inactive admin account."
      });
    }

    const token = signToken({
      sub: admin._id.toString(),
      role: admin.role
    });

    return res.json({
      message: "Admin login successful.",
      token,
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error("Admin login failed:", error.message);

    return res.status(500).json({
      message: "Unable to complete admin login."
    });
  }
});

// --------------------------------------------------
// Admin: save a draft schema
// Requires a valid admin token.
// --------------------------------------------------

app.put(
  "/api/admin/schemas/:formType",
  requireAdmin,
  async (req, res) => {
    try {
      const { formType } = req.params;

      if (!VALID_FORM_TYPES.has(formType)) {
        return res.status(400).json({
          message: "Unsupported form type."
        });
      }

      const { fields } = req.body;

      const validationError = validateFields(fields);

      if (validationError) {
        return res.status(400).json({
          message: validationError
        });
      }

      let schema = await FormSchema.findOne({ formType });

      if (!schema) {
        schema = new FormSchema({
          formType,
          draftFields: [],
          publishedFields: [],
          draftVersion: 0,
          publishedVersion: 0
        });
      }

      schema.draftFields = fields;
      schema.draftVersion = (schema.draftVersion || 0) + 1;

      // requireAdmin should attach the authenticated user to req.admin.
      if (req.admin?._id) {
        schema.updatedBy = req.admin._id;
      }

      await schema.save();

      return res.json({
        message: "Draft schema saved successfully.",
        formType: schema.formType,
        draftVersion: schema.draftVersion,
        fieldCount: schema.draftFields.length
      });
    } catch (error) {
      console.error("Save schema draft failed:", error.message);

      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: "The schema does not match the required data format."
        });
      }

      if (error.code === 11000) {
        return res.status(409).json({
          message: "A schema for this form already exists. Please retry."
        });
      }

      return res.status(500).json({
        message: "Unable to save the schema draft."
      });
    }
  }
);

// --------------------------------------------------
// Admin: publish the saved draft
// Requires a valid admin token.
// --------------------------------------------------

app.post(
  "/api/admin/schemas/:formType/publish",
  requireAdmin,
  async (req, res) => {
    try {
      const { formType } = req.params;

      if (!VALID_FORM_TYPES.has(formType)) {
        return res.status(400).json({
          message: "Unsupported form type."
        });
      }

      const schema = await FormSchema.findOne({ formType });

      if (!schema || !schema.draftFields?.length) {
        return res.status(404).json({
          message: "No draft schema exists to publish."
        });
      }

      const validationError = validateFields(schema.draftFields);

      if (validationError) {
        return res.status(400).json({
          message: `Draft schema is invalid: ${validationError}`
        });
      }

      schema.publishedFields = schema.draftFields;
      schema.publishedVersion = (schema.publishedVersion || 0) + 1;
      schema.publishedAt = new Date();

      if (req.admin?._id) {
        schema.updatedBy = req.admin._id;
      }

      await schema.save();

      return res.json({
        message: "Schema published successfully.",
        formType: schema.formType,
        publishedVersion: schema.publishedVersion,
        publishedAt: schema.publishedAt,
        fieldCount: schema.publishedFields.length
      });
    } catch (error) {
      console.error("Publish schema failed:", error.message);

      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: "The schema does not match the required data format."
        });
      }

      return res.status(500).json({
        message: "Unable to publish the schema."
      });
    }
  }
);

// --------------------------------------------------
// Parent registration
// Kept unchanged.
// --------------------------------------------------

app.post("/api/auth/register/parent", async (req, res) => {
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
        budget
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

    return res
      .status(error.status || (error.code === 11000 ? 409 : 500))
      .json({
        message:
          error.status || error.code === 11000
            ? error.message
            : "Registration failed. Please try again."
      });
  }
});

// --------------------------------------------------
// Tutor registration and document upload
// Kept unchanged.
// --------------------------------------------------

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
        return res.status(400).json({
          message:
            "Please complete all fields and upload the required documents."
        });
      }

      user = await createAccount({
        fullName,
        email,
        phone,
        password,
        role: "tutor"
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
          location,
          classes,
          subjects,
          qualification,
          experience,
          idType,
          documents
        });
      } catch (profileError) {
        await User.deleteOne({ _id: user._id });
        throw profileError;
      }

      return res.status(201).json({
        message:
          "Tutor registration successful. Your documents are pending verification."
      });
    } catch (error) {
      console.error("Tutor registration error:", error.message);

      return res
        .status(error.status || (error.code === 11000 ? 409 : 500))
        .json({
          message:
            error.status || error.code === 11000
              ? error.message
              : "Registration failed. Please try again."
        });
    }
  }
);

// --------------------------------------------------
// Error handler
// --------------------------------------------------

app.use((err, req, res, next) => {
  console.error("Request error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  const status = err instanceof multer.MulterError ? 400 : 400;

  return res.status(status).json({
    message: err.message || "Request failed."
  });
});

// --------------------------------------------------
// Start server
// --------------------------------------------------

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