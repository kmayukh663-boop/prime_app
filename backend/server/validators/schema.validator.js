
const VALID_TYPES = new Set([
  "text",
  "email",
  "tel",
  "number",
  "date",
  "select",
  "radio",
  "checkbox",
  "textarea",
  "file",
  "password"
]);

const MAX_FIELDS = 100;
const MAX_OPTIONS = 100;
const MAX_LABEL_LENGTH = 200;
const MAX_NAME_LENGTH = 100;

function validateFields(fields) {
  if (!Array.isArray(fields)) {
    return "Fields must be an array.";
  }

  if (fields.length === 0) {
    return "At least one field is required.";
  }

  if (fields.length > MAX_FIELDS) {
    return `A maximum of ${MAX_FIELDS} fields is allowed.`;
  }

  const seenNames = new Set();

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];

    if (!field || typeof field !== "object" || Array.isArray(field)) {
      return `Field ${i + 1} must be an object.`;
    }

    if (
      typeof field.name !== "string" ||
      !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.name) ||
      field.name.length > MAX_NAME_LENGTH
    ) {
      return `Field ${i + 1} has an invalid name.`;
    }

    if (seenNames.has(field.name)) {
      return `Duplicate field name: ${field.name}.`;
    }
    seenNames.add(field.name);

    if (
      typeof field.label !== "string" ||
      !field.label.trim() ||
      field.label.length > MAX_LABEL_LENGTH
    ) {
      return `Field ${i + 1} has an invalid label.`;
    }

    if (!VALID_TYPES.has(field.type)) {
      return `Field ${i + 1} has an unsupported type.`;
    }

    if (
      field.required !== undefined &&
      typeof field.required !== "boolean"
    ) {
      return `Field ${i + 1} has an invalid required value.`;
    }

    if (field.options !== undefined) {
      if (
        !Array.isArray(field.options) ||
        field.options.length > MAX_OPTIONS ||
        !["select", "radio", "checkbox"].includes(field.type)
      ) {
        return `Field ${i + 1} has invalid options.`;
      }

      for (const option of field.options) {
        if (
          typeof option !== "string" ||
          !option.trim() ||
          option.length > MAX_LABEL_LENGTH
        ) {
          return `Field ${i + 1} contains an invalid option.`;
        }
      }
    }

    if (
      ["select", "radio", "checkbox"].includes(field.type) &&
      (!Array.isArray(field.options) || field.options.length === 0)
    ) {
      return `Field ${i + 1} requires at least one option.`;
    }
  }

  return null;
}

module.exports = { validateFields };
