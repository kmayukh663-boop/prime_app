
const { getSystemFields } = require("../../utils/systemFields");

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

const ALLOWED_FIELD_KEYS = new Set([
  "id",
  "label",
  "displayName",
  "type",
  "placeholder",
  "required",
  "width",
  "validation",
  "options",
  "dependencies"
]);

function validateOptions(options, fieldId) {
  if (!Array.isArray(options) || options.length > 100) {
    return `Field ${fieldId} has invalid options.`;
  }

  for (const option of options) {
    if (
      typeof option !== "string" ||
      !option.trim() ||
      option.length > 120
    ) {
      return `Field ${fieldId} contains an invalid option.`;
    }
  }

  return null;
}

function validateFields(fields, formType) {
  if (!VALID_FORM_TYPES.has(formType)) {
    return "A valid form type (parent or tutor) is required.";
  }

  if (!Array.isArray(fields) || fields.length < 1 || fields.length > 100) {
    return "Fields must be an array containing 1-100 field definitions.";
  }

  const systemFields = getSystemFields(formType);
  const systemFieldMap = new Map(
    systemFields.map(field => [field.id, field])
  );

  const ids = new Set();
  const submittedSystemIds = new Set();

  for (const field of fields) {
    const plainField =
      field && typeof field.toObject === "function"
        ? field.toObject()
        : field;

    if (
      !plainField ||
      typeof plainField !== "object" ||
      Array.isArray(plainField)
    ) {
      return "Each field must be an object.";
    }

    if (Object.keys(plainField).some(key => !ALLOWED_FIELD_KEYS.has(key))) {
      return "A field contains an unsupported property.";
    }

    if (
      typeof plainField.id !== "string" ||
      !/^[A-Za-z][A-Za-z0-9_-]*$/.test(plainField.id) ||
      ids.has(plainField.id)
    ) {
      return "Field IDs must be valid and unique.";
    }

    ids.add(plainField.id);

    const systemDefinition = systemFieldMap.get(plainField.id);
    const isSystemField = Boolean(systemDefinition);

    if (isSystemField) {
      submittedSystemIds.add(plainField.id);

      if (plainField.label !== systemDefinition.label) {
        return `System field ${plainField.id} cannot have its field label/tag changed.`;
      }

      if (plainField.type !== systemDefinition.type) {
        return `System field ${plainField.id} cannot have its field type changed.`;
      }

      if (plainField.required !== systemDefinition.required) {
        return `System field ${plainField.id} cannot have its required setting changed.`;
      }
    }

    if (
      typeof plainField.label !== "string" ||
      !plainField.label.trim() ||
      plainField.label.length > 120
    ) {
      return `Field ${plainField.id} needs a label of at most 120 characters.`;
    }

    if (!ALLOWED_FIELD_TYPES.has(plainField.type)) {
      return `Field ${plainField.id} has an unsupported type.`;
    }

    if (
      plainField.displayName !== undefined &&
      (
        typeof plainField.displayName !== "string" ||
        !plainField.displayName.trim() ||
        plainField.displayName.length > 120
      )
    ) {
      return `Field ${plainField.id} has an invalid display name.`;
    }

    if (
      plainField.placeholder !== undefined &&
      (
        typeof plainField.placeholder !== "string" ||
        plainField.placeholder.length > 250
      )
    ) {
      return `Field ${plainField.id} has an invalid placeholder.`;
    }

    if (
      plainField.required !== undefined &&
      typeof plainField.required !== "boolean"
    ) {
      return `Field ${plainField.id} has an invalid required value.`;
    }

    if (
      plainField.width !== undefined &&
      !["full", "half"].includes(plainField.width)
    ) {
      return `Field ${plainField.id} has an invalid width.`;
    }

    if (
      plainField.validation !== undefined &&
      (
        typeof plainField.validation !== "string" ||
        plainField.validation.length > 100
      )
    ) {
      return `Field ${plainField.id} has invalid validation metadata.`;
    }

    if (plainField.options !== undefined) {
      const optionsError = validateOptions(
        plainField.options,
        plainField.id
      );

      if (optionsError) return optionsError;
    }

    if (
      plainField.dependencies !== undefined &&
      (
        !plainField.dependencies ||
        typeof plainField.dependencies !== "object" ||
        Array.isArray(plainField.dependencies)
      )
    ) {
      return `Field ${plainField.id} has invalid dependencies.`;
    }

    // Custom select/radio fields need their own option lists.
    // System controls may use dedicated frontend-rendered options.
    if (
      !isSystemField &&
      ["select", "radio"].includes(plainField.type) &&
      (!Array.isArray(plainField.options) || plainField.options.length === 0)
    ) {
      return `Custom field ${plainField.id} requires options.`;
    }
  }

  // Every protected field must remain in the submitted schema.
  for (const systemField of systemFields) {
    if (!submittedSystemIds.has(systemField.id)) {
      return `Required system field ${systemField.id} cannot be deleted.`;
    }
  }

  return null;
}

module.exports = {
  validateFields,
  VALID_FORM_TYPES,
  ALLOWED_FIELD_TYPES
};
