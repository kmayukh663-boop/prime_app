const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../../models/User");
const FormSchema = require("../../models/FormSchema");

const { signToken } = require("../../utils/adminAuth");
const { requireAdmin } = require("../middleware/adminAuth");
const { validateFields } = require("../validators/schema.validator");

const router = express.Router();

// --------------------------------------------------
// Admin login
// POST /api/admin/login
// --------------------------------------------------

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = req.body.password;

    if (!email || typeof password !== "string" || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const admin = await User.findOne({ email })
      .select("+passwordHash role status fullName email");

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

    const token = signToken(admin._id.toString());

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
// Save a draft schema
// PUT /api/admin/schemas/:formType
// --------------------------------------------------

router.put("/schemas/:formType", requireAdmin, async (req, res) => {
  try {
    const { formType } = req.params;

    if (!["parent", "tutor"].includes(formType)) {
      return res.status(400).json({
        message: "Unsupported form type."
      });
    }

    const validationError = validateFields(req.body.fields);

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

    schema.draftFields = req.body.fields;
    schema.draftVersion = (schema.draftVersion || 0) + 1;

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
});

// --------------------------------------------------
// Publish a saved draft
// POST /api/admin/schemas/:formType/publish
// --------------------------------------------------

router.post(
  "/schemas/:formType/publish",
  requireAdmin,
  async (req, res) => {
    try {
      const { formType } = req.params;

      if (!["parent", "tutor"].includes(formType)) {
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

module.exports = router;
