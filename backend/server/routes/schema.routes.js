const express = require("express");
const FormSchema = require("../../models/FormSchema");

const router = express.Router();

const VALID_FORM_TYPES = new Set(["parent", "tutor"]);

// Public: return only the published form definition.
router.get("/:formType", async (req, res) => {
  try {
    const { formType } = req.params;

    if (!VALID_FORM_TYPES.has(formType)) {
      return res.status(400).json({
        message: "Unsupported form type."
      });
    }

    const schema = await FormSchema.findOne({ formType })
      .select("formType publishedFields publishedVersion publishedAt")
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

module.exports = router;
