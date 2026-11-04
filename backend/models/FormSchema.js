
const mongoose = require("mongoose");

const formFieldSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
      match: /^[A-Za-z][A-Za-z0-9_-]*$/
    },

    // Immutable system label/tag.
    // For custom fields, this remains editable.
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },

    // User-facing name. Can be changed for system fields.
    displayName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: undefined
    },

    type: {
      type: String,
      required: true,
      enum: [
        "text", "email", "tel", "password", "number",
        "select", "textarea", "file", "date", "checkbox", "radio"
      ]
    },

    placeholder: {
      type: String,
      default: "",
      maxlength: 250
    },

    required: {
      type: Boolean,
      default: false
    },

    width: {
      type: String,
      enum: ["full", "half"],
      default: "full"
    },

    validation: {
      type: String,
      default: "none",
      maxlength: 100
    },

    options: {
      type: [mongoose.Schema.Types.Mixed],
      default: undefined
    },

    dependencies: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined
    }
  },
  {
    _id: false,
    strict: true
  }
);

const formSchema = new mongoose.Schema(
  {
    formType: {
      type: String,
      required: true,
      enum: ["parent", "tutor"],
      unique: true
    },

    draftFields: {
      type: [formFieldSchema],
      default: []
    },

    publishedFields: {
      type: [formFieldSchema],
      default: []
    },

    draftVersion: {
      type: Number,
      default: 0,
      min: 0
    },

    publishedVersion: {
      type: Number,
      default: 0,
      min: 0
    },

    publishedAt: {
      type: Date,
      default: null
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    collection: "form_schemas",
    timestamps: true,
    optimisticConcurrency: true
  }
);

module.exports =
  mongoose.models.FormSchema ||
  mongoose.model("FormSchema", formSchema);
