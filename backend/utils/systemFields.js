
const SYSTEM_FIELDS = {
  parent: [
    {
      id: "pName",
      label: "Full Name",
      type: "text",
      required: true
    },
    {
      id: "pPhone",
      label: "Phone Number",
      type: "tel",
      required: true
    },
    {
      id: "pEmail",
      label: "Email Address",
      type: "email",
      required: true
    },
    {
      id: "pPassword",
      label: "Password",
      type: "password",
      required: true
    },
    {
      id: "pLocation",
      label: "Area / Location",
      type: "text",
      required: true
    },
    {
      id: "pClass",
      label: "Student's Class",
      type: "select",
      required: true
    },
    {
      id: "pSubjects",
      label: "Subjects Required",
      type: "checkbox",
      required: true
    },
    {
      id: "pBudget",
      label: "Monthly Budget",
      type: "select",
      required: true
    },
    {
      id: "pTime",
      label: "Preferred Time",
      type: "select",
      required: false
    }
  ],

  tutor: [
    {
      id: "tName",
      label: "Full Name",
      type: "text",
      required: true
    },
    {
      id: "tPhone",
      label: "Phone Number",
      type: "tel",
      required: true
    },
    {
      id: "tEmail",
      label: "Email Address",
      type: "email",
      required: true
    },
    {
      id: "tPassword",
      label: "Password",
      type: "password",
      required: true
    },
    {
      id: "tLocation",
      label: "Area / Location",
      type: "text",
      required: true
    },
    {
      id: "tClasses",
      label: "Classes You Teach",
      type: "select",
      required: true
    },
    {
      id: "tSubjects",
      label: "Subjects You Teach",
      type: "checkbox",
      required: true
    },
    {
      id: "tQualification",
      label: "Qualification",
      type: "text",
      required: true
    },
    {
      id: "tExperience",
      label: "Teaching Experience",
      type: "text",
      required: true
    },
    {
      id: "tIdType",
      label: "ID Type",
      type: "select",
      required: true
    },
    {
      id: "tResume",
      label: "Resume",
      type: "file",
      required: true
    },
    {
      id: "tEduDocs",
      label: "Education Documents",
      type: "file",
      required: true
    },
    {
      id: "tIdFile",
      label: "Identity Proof",
      type: "file",
      required: true
    }
  ]
};

function getSystemFields(formType) {
  const fields = SYSTEM_FIELDS[formType];

  if (!fields) {
    throw new Error(`Unsupported form type: ${formType}`);
  }

  return fields.map(field => ({ ...field }));
}

function getSystemFieldIds(formType) {
  return getSystemFields(formType).map(field => field.id);
}

module.exports = {
  SYSTEM_FIELDS,
  getSystemFields,
  getSystemFieldIds
};
