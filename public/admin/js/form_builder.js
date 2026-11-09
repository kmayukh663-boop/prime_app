// public/admin/js/form_builder.js

let currentTarget = 'parent';
let currentView = 'settings'; // 'settings' or 'preview'
let editingIndex = null; // Tracks which field is currently being edited
const ADMIN_API_BASE_URL = "https://prime-app-1.onrender.com/api/admin";

const schemaCache = {
    parent: null,
    tutor: null
};

const schemaMetadata = {
    parent: null,
    tutor: null
};

const schemaNeedsMigration = {
    parent: false,
    tutor: false
};

const schemaDirty = {
    parent: false,
    tutor: false
};

function getAdminToken() {
    return (
        localStorage.getItem("adminToken") ||
        sessionStorage.getItem("adminToken")
    );
}

async function loadSchemaDraft(formType, forceReload = false) {
    if (!["parent", "tutor"].includes(formType)) {
        throw new Error("Invalid form type.");
    }

    if (schemaCache[formType] && !forceReload) {
        return schemaCache[formType];
    }

    const token = getAdminToken();

    if (!token) {
        throw new Error(
            "Admin authentication token not found. Please log in again."
        );
    }

    const response = await fetch(
        `${ADMIN_API_BASE_URL}/schemas/${formType}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.message || `Unable to load ${formType} draft.`
        );
    }

    if (!Array.isArray(result.fields)) {
        throw new Error("The server returned an invalid schema.");
    }

    schemaMetadata[formType] = {
        draftVersion: result.draftVersion,
        publishedVersion: result.publishedVersion,
        publishedAt: result.publishedAt,
        updatedAt: result.updatedAt,
        hasDraft: result.hasDraft
    };

    const defaultSchema = formType === "parent"
        ? defaultParentSchema
        : defaultTutorSchema;

    schemaCache[formType] = result.fields.length > 0
        ? migrateLegacySchema(formType, result.fields)
        : defaultSchema.map(field => ({ ...field }));
    if (result.fields.length === 0) {
        schemaNeedsMigration[formType] = false;
    }   
    schemaDirty[formType] = false;
    return schemaCache[formType];
}

const defaultParentSchema = [
    { id: "pName", label: "Full Name", type: "text", placeholder: "Enter your full name", required: true, width: "full", validation: "none" },
    { id: "pPhone", label: "Phone Number", type: "tel", placeholder: "+91 9876543210", required: true, width: "half", validation: "none" },
    { id: "pEmail", label: "Email Address", type: "email", placeholder: "parent@example.com", required: true, width: "half", validation: "none" },
    { id: "pPassword", label: "Password", type: "password", placeholder: "Create a password", required: true, width: "full", validation: "none" },
    { id: "pLocation", label: "Area / Location", type: "text", placeholder: "Enter your area or location", required: true, width: "full", validation: "none" },
    { id: "pClass", label: "Student's Class", type: "select", placeholder: "Select Class", required: true, width: "full", validation: "none" },
    { id: "pSubjects", label: "Subjects Required", type: "checkbox", placeholder: "", required: true, width: "full", validation: "none" },
    { id: "pBudget", label: "Monthly Budget", type: "select", placeholder: "Select Budget Range", required: true, width: "half", validation: "none" },
    { id: "pTime", label: "Preferred Time", type: "select", placeholder: "Select Preferred Time", required: false, width: "half", validation: "none" }
];

const defaultTutorSchema = [
    { id: "tName", label: "Full Name", type: "text", placeholder: "Enter your full name", required: true, width: "full", validation: "none" },
    { id: "tPhone", label: "Phone Number", type: "tel", placeholder: "+91 9876543210", required: true, width: "half", validation: "none" },
    { id: "tEmail", label: "Email Address", type: "email", placeholder: "tutor@example.com", required: true, width: "half", validation: "none" },
    { id: "tPassword", label: "Password", type: "password", placeholder: "Create a password", required: true, width: "full", validation: "none" },
    { id: "tLocation", label: "Area / Location", type: "text", placeholder: "Enter your area or location", required: true, width: "full", validation: "none" },
    { id: "tClasses", label: "Classes You Teach", type: "select", placeholder: "Select Classes", required: true, width: "half", validation: "none" },
    { id: "tSubjects", label: "Subjects You Teach", type: "checkbox", placeholder: "", required: true, width: "half", validation: "none" },
    { id: "tQualification", label: "Qualification", type: "text", placeholder: "Enter your qualification", required: true, width: "half", validation: "none" },
    { id: "tExperience", label: "Teaching Experience", type: "text", placeholder: "Enter your experience", required: true, width: "half", validation: "none" },
    { id: "tIdType", label: "ID Type", type: "select", placeholder: "Select ID Type", required: true, width: "full", validation: "none" },
    { id: "tResume", label: "Resume", type: "file", placeholder: "", required: true, width: "full", validation: "none" },
    { id: "tEduDocs", label: "Education Documents", type: "file", placeholder: "", required: true, width: "full", validation: "none" },
    { id: "tIdFile", label: "Identity Proof", type: "file", placeholder: "", required: true, width: "full", validation: "none" }
];

function migrateLegacySchema(formType, legacyFields) {
    const defaultSchema = formType === "parent"
        ? defaultParentSchema
        : defaultTutorSchema;

    const legacyIdMap = formType === "parent"
        ? {
            parentName: "pName",
            parentEmail: "pEmail",
            parentPhone: "pPhone"
        }
        : {
            tutorName: "tName",
            tutorEmail: "tEmail",
            tutorExperience: "tExperience"
        };

    const migratedSchema = defaultSchema.map(field => ({ ...field }));

    const canonicalIds = new Set(
        defaultSchema.map(field => field.id)
    );

    const originalIds = new Set(
        legacyFields.map(field => field.id)
    );

    legacyFields.forEach(legacyField => {
        const targetId = legacyIdMap[legacyField.id] || legacyField.id;

        const existingField = migratedSchema.find(
            field => field.id === targetId
        );

        if (existingField) {
            // Preserve configurable properties, not system definitions.
            if (legacyField.placeholder !== undefined) {
                existingField.placeholder = legacyField.placeholder;
            }

            if (legacyField.width !== undefined) {
                existingField.width = legacyField.width;
            }

            if (legacyField.validation !== undefined) {
                existingField.validation = legacyField.validation;
            }
        } else {
            // Preserve legacy custom fields without converting their type.
            migratedSchema.push({ ...legacyField });
        }
    });

    const hasLegacyIds = legacyFields.some(
        field => Object.prototype.hasOwnProperty.call(
            legacyIdMap,
            field.id
        )
    );

    const hasMissingCanonicalFields = [...canonicalIds].some(
        id => !originalIds.has(id)
    );

    schemaNeedsMigration[formType] =
        hasLegacyIds || hasMissingCanonicalFields;

    return migratedSchema;
}

// System fields are defined authoritatively in backend/utils/systemFields.js.
// Keep these IDs synchronized with the backend definitions.
const SYSTEM_FIELD_IDS = {
    parent: new Set([
        "pName",
        "pPhone",
        "pEmail",
        "pPassword",
        "pLocation",
        "pClass",
        "pSubjects",
        "pBudget",
        "pTime"
    ]),

    tutor: new Set([
        "tName",
        "tPhone",
        "tEmail",
        "tPassword",
        "tLocation",
        "tClasses",
        "tSubjects",
        "tQualification",
        "tExperience",
        "tIdType",
        "tResume",
        "tEduDocs",
        "tIdFile"
    ])
};

function isSystemField(field) {
    return Boolean(
        field &&
        SYSTEM_FIELD_IDS[currentTarget]?.has(field.id)
    );
}

export function initFormBuilder() {
    window.openFormBuilderModal = openFormBuilderModal;
    window.closeFormBuilderModal = closeFormBuilderModal;
    window.switchFormTarget = switchFormTarget;
    window.addNewFieldToSchema = addNewFieldToSchema;
    window.removeFieldFromSchema = removeFieldFromSchema;
    window.editFieldInSchema = editFieldInSchema;
    window.saveFieldEdit = saveFieldEdit;
    window.cancelFieldEdit = cancelFieldEdit;
    window.resetSchemaToDefault = resetSchemaToDefault;
    window.switchToPreview = switchToPreview;
    window.switchToSettings = switchToSettings;
    window.saveSchemaDraft = saveSchemaDraft;
    window.publishSchema = publishSchema;
    window.toggleFieldWidthInPreview = toggleFieldWidthInPreview;
}

async function openFormBuilderModal() {
    const modal = document.getElementById('formBuilderModal');
    
    if (modal) modal.classList.remove('hidden');

    currentView = 'settings';
    
    try{
        await loadSchemaDraft(currentTarget, true);
        renderView();
    } catch (error) {console.error("Failed to load form schema:", error.message);
        alert(error.message || "Unable to load form schema.");  
    }
}

function closeFormBuilderModal() {
    const modal = document.getElementById('formBuilderModal');
    if (modal) modal.classList.add('hidden');
}

async function switchFormTarget(target) {
    if (!["parent", "tutor"].includes(target)) {
        return;
    }

    try {
        await loadSchemaDraft(target);

        currentTarget = target;

        const pBtn = document.getElementById('tabParentBtn');
        const tBtn = document.getElementById('tabTutorBtn');

        if (pBtn && tBtn) {
            if (target === 'parent') {
                pBtn.className = "flex-1 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white transition-all shadow-sm";
                tBtn.className = "flex-1 py-2 text-xs font-bold rounded-lg text-slate-400 hover:text-white transition-all";
            } else {
                tBtn.className = "flex-1 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white transition-all shadow-sm";
                pBtn.className = "flex-1 py-2 text-xs font-bold rounded-lg text-slate-400 hover:text-white transition-all";
            }
        }

        renderView();

    } catch (error) {
        console.error("Failed to switch form target:", error);
        alert(error.message || "Unable to load the selected form.");
    }
}

function getCurrentSchema() {
    if (schemaCache[currentTarget]) {
        return schemaCache[currentTarget];
    }
    return currentTarget === 'parent' ? defaultParentSchema : defaultTutorSchema;
}

function saveSchemaToStorage(schema) {
    schemaCache[currentTarget] = schema.map(field => ({ ...field }));
    schemaDirty[currentTarget] = true;

}

function switchToPreview() {
    currentView = 'preview';
    renderView();
}

function switchToSettings() {
    currentView = 'settings';
    renderView();
}

function renderView() {
    const settingsView = document.getElementById('builderSettingsView');
    const previewView = document.getElementById('builderPreviewView');

    if (!settingsView || !previewView) return;

    if (currentView === 'settings') {
        settingsView.classList.remove('hidden');
        previewView.classList.add('hidden');
        renderFieldList();
    } else {
        settingsView.classList.add('hidden');
        previewView.classList.remove('hidden');
        renderPreviewForm();
    }
}

// --- FIELD SETTINGS VIEW LOGIC ---

function renderFieldList() {
    const schema = getCurrentSchema();
    const container = document.getElementById('activeFieldsList');
    const countDisplay = document.getElementById('activeCountDisplay');
    
    if (!container) return;
    if (countDisplay) countDisplay.innerText = `${schema.length} Fields Configured`;

    container.innerHTML = '';

    schema.forEach((field, idx) => {
        const item = document.createElement('div');
        item.className = "p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs transition-all hover:border-slate-700";
        item.innerHTML = `
            <div class="flex items-center space-x-3">
                <span class="font-mono text-slate-500 font-bold">${idx + 1}.</span>
                <div>
                    <p class="font-bold text-white">${field.label} ${field.required ? '<span class="text-indigo-400">*</span>' : ''}</p>
                    <span class="text-[10px] text-slate-400 uppercase font-mono">Type: ${field.type} | Validation: ${field.validation || 'none'}</span>
                </div>
            </div>
            <div class="flex items-center space-x-1.5">
                <button onclick="editFieldInSchema(${idx})" title="Edit Field" class="text-indigo-400 hover:text-indigo-300 p-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors">
                    <i class="fa-solid fa-pencil"></i>
                </button>
                ${isSystemField(field) ? `
                <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    title="These are system fields and cannot be deleted."
                    class="text-slate-600 cursor-not-allowed p-1.5 rounded-lg opacity-50"
                >
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            ` : `
                <button
                    type="button"
                    onclick="removeFieldFromSchema(${idx})"
                    title="Delete Field"
                    class="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                >
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `}
            </div>
        `;
        container.appendChild(item);
    });
}

function addNewFieldToSchema() {
    const labelInput = document.getElementById('newFieldLabel');
    const typeInput = document.getElementById('newFieldType');
    const validationInput = document.getElementById('newFieldValidation');

    const label = labelInput ? labelInput.value.trim() : '';
    if (!label) {
        alert("Please enter a field label/name.");
        return;
    }

    const schema = getCurrentSchema();
    const newField = {
        id: `dyn_${Date.now()}`,
        label: label,
        type: typeInput ? typeInput.value : 'text',
        placeholder: `Enter ${label.toLowerCase()}`,
        required: true,
        width: "full",
        validation: validationInput ? validationInput.value : 'none'
    };

    schema.push(newField);
    saveSchemaToStorage(schema);
    renderFieldList();

    if (labelInput) labelInput.value = '';
}

// function editFieldInSchema(index) {
//     const schema = getCurrentSchema();
//     const field = schema[index];
//     editingIndex = index;

//     const editModal = document.getElementById('editFieldModal');
//     if (editModal) {
//         document.getElementById('editFieldLabel').value = field.label;
//         document.getElementById('editFieldType').value = field.type;
//         document.getElementById('editFieldValidation').value = field.validation || 'none';
//         editModal.classList.remove('hidden');
//     }
// }

// window.saveFieldEdit = function() {
//     if (editingIndex === null) return;
//     const schema = getCurrentSchema();
    
//     const label = document.getElementById('editFieldLabel').value.trim();
//     if (!label) {
//         alert("Field label cannot be empty.");
//         return;
//     }

//     schema[editingIndex].label = label;
//     schema[editingIndex].type = document.getElementById('editFieldType').value;
//     schema[editingIndex].validation = document.getElementById('editFieldValidation').value;
//     schema[editingIndex].placeholder = `Enter ${label.toLowerCase()}`;

//     saveSchemaToStorage(schema);
//     cancelFieldEdit();
//     renderFieldList();
// }


function editFieldInSchema(index) {
    const schema = getCurrentSchema();
    const field = schema[index];

    if (!field) return;

    editingIndex = index;

    const systemField = isSystemField(field);

    const displayNameInput = document.getElementById('editFieldDisplayName');
    const labelInput = document.getElementById('editFieldLabel');
    const typeInput = document.getElementById('editFieldType');
    const validationInput = document.getElementById('editFieldValidation');

    if (displayNameInput) {
        displayNameInput.value = field.displayName || field.label;
    }

    if (labelInput) {
        labelInput.value = field.label;
        labelInput.disabled = systemField;
        labelInput.title = systemField
            ? "Field tag/label for system fields cannot be edited."
            : "";
    }

    if (typeInput) {
        typeInput.value = field.type;
        typeInput.disabled = systemField;
        typeInput.title = systemField
            ? "Field tag/label for system fields cannot be edited."
            : "";
    }

    if (validationInput) {
        validationInput.value = field.validation || 'none';
    }

    const editModal = document.getElementById('editFieldModal');
    if (editModal) {
        editModal.classList.remove('hidden');
    }
}

window.saveFieldEdit = function() {
    if (editingIndex === null) return;

    const schema = getCurrentSchema();
    const field = schema[editingIndex];

    if (!field) return;

    const systemField = isSystemField(field);

    const displayNameInput = document.getElementById('editFieldDisplayName');
    const labelInput = document.getElementById('editFieldLabel');
    const typeInput = document.getElementById('editFieldType');
    const validationInput = document.getElementById('editFieldValidation');

    const displayName = displayNameInput
        ? displayNameInput.value.trim()
        : '';

    if (!displayName) {
        alert("Display name cannot be empty.");
        return;
    }

    // Display name is customizable for both System and Custom Fields.
    field.displayName = displayName;

    // Only Custom Fields may change their label and type.
    if (!systemField) {
        const label = labelInput ? labelInput.value.trim() : '';

        if (!label) {
            alert("Field label cannot be empty.");
            return;
        }

        field.label = label;
        field.type = typeInput ? typeInput.value : field.type;
        field.placeholder = `Enter ${label.toLowerCase()}`;
    }

    if (validationInput) {
        field.validation = validationInput.value;
    }

    saveSchemaToStorage(schema);
    cancelFieldEdit();
    renderFieldList();
};


window.cancelFieldEdit = function() {
    editingIndex = null;
    const editModal = document.getElementById('editFieldModal');
    if (editModal) editModal.classList.add('hidden');
}

function removeFieldFromSchema(index) {
    const schema = getCurrentSchema();
    const field = schema[index];

    if (!field) return;

    // Never allow system fields to be deleted.
    if (isSystemField(field)) {
        alert("These are system fields and cannot be deleted.");
        return;
    }

    if (confirm(`Are you sure you want to delete "${field.label}"?`)) {
        schema.splice(index, 1);
        saveSchemaToStorage(schema);
        renderFieldList();
    }
}

function resetSchemaToDefault() {
    if (confirm("Reset current form schema to factory defaults?")) {
        const key = currentTarget === 'parent' ? 'parent_signup_schema' : 'tutor_signup_schema';
        localStorage.removeItem(key);
        renderFieldList();
    }
}

// --- PREVIEW PANEL VIEW LOGIC (Interactive Drag-Reorder & Margin Width Control) ---

function renderPreviewForm() {
    const container = document.getElementById('previewFormContainer');
    const titleEl = document.getElementById('previewFormTitle');
    const subtitleEl = document.getElementById('previewFormSubtitle');
    const badgeEl = document.getElementById('previewPortalBadge');

    if (!container) return;

    const schema = getCurrentSchema();

    if (currentTarget === 'parent') {
        if (titleEl) titleEl.innerText = "Parent Portal Sign-Up";
        if (subtitleEl) subtitleEl.innerText = "Register to find and manage verified home tutors.";
        if (badgeEl) {
            badgeEl.className = "h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30";
            badgeEl.innerHTML = '<i class="fa-solid fa-user-group"></i>';
        }
    } else {
        if (titleEl) titleEl.innerText = "Tutor / Educator Onboarding";
        if (subtitleEl) subtitleEl.innerText = "Apply to teach home tuitions and receive verified batches.";
        if (badgeEl) {
            badgeEl.className = "h-14 w-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-purple-500/30";
            badgeEl.innerHTML = '<i class="fa-solid fa-graduation-cap"></i>';
        }
    }

    container.innerHTML = '';

    schema.forEach((field, index) => {
        const tile = document.createElement('div');
        const spanClass = field.width === 'full' ? 'sm:col-span-2' : 'sm:col-span-1';
        tile.className = `${spanClass} p-4 bg-white/90 border border-slate-200 rounded-2xl shadow-md transition-all duration-300 relative group cursor-grab active:cursor-grabbing`;
        tile.setAttribute('draggable', 'true');
        tile.dataset.index = index;

        // Native HTML5 Drag and Drop events for smooth tile shifting
        tile.addEventListener('dragstart', handleDragStart);
        tile.addEventListener('dragover', handleDragOver);
        tile.addEventListener('drop', handleDrop);
        tile.addEventListener('dragend', handleDragEnd);

        const primaryColorClass = currentTarget === 'parent' ? 'text-blue-600 focus:ring-blue-600' : 'text-purple-600 focus:ring-purple-600';

        tile.innerHTML = `
            <!-- Hand / Grip Widget & Margin Width Control -->
            <div class="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 text-[11px] text-slate-400">
                <span class="font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5 select-none">
                    <i class="fa-solid fa-hand-pointer text-indigo-500 animate-pulse"></i>
                    <i class="fa-solid fa-grip-vertical text-slate-400"></i>
                    <span>${field.label} ${field.required ? '*' : ''}</span>
                </span>
                
                <!-- Double-Headed Arrow Width Resize Widget -->
                <button type="button" onclick="toggleFieldWidthInPreview(${index})" title="Click to Expand/Narrow Width" class="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg transition-all flex items-center space-x-1 border border-slate-200">
                    <i class="fa-solid fa-arrows-left-right text-xs"></i>
                    <span class="text-[9px] font-mono uppercase font-bold">${field.width}</span>
                </button>
            </div>

            <!-- Field Input Mockup -->
            <div class="pointer-events-none">
                <label class="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">${field.label} ${field.required ? '*' : ''}</label>
                ${renderFieldInputHTML(field, primaryColorClass)}
            </div>
        `;
        container.appendChild(tile);
    });
}

let draggedIndex = null;

function handleDragStart(e) {
    draggedIndex = parseInt(this.dataset.index, 10);
    this.classList.add('opacity-50', 'scale-95', 'border-indigo-500');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    const targetIndex = parseInt(this.dataset.index, 10);

    if (draggedIndex !== null && draggedIndex !== targetIndex) {
        const schema = getCurrentSchema();
        const movedItem = schema.splice(draggedIndex, 1)[0];
        schema.splice(targetIndex, 0, movedItem);
        saveSchemaToStorage(schema);
        renderPreviewForm();
    }
    return false;
}

function handleDragEnd() {
    this.classList.remove('opacity-50', 'scale-95', 'border-indigo-500');
    draggedIndex = null;
}

function renderFieldInputHTML(field, colorClass) {
    if (field.type === 'select') {
        return `
            <select disabled class="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-500">
                <option>${field.placeholder || 'Select option'}</option>
            </select>
        `;
    }
    if (field.type === 'file') {
        return `
            <input type="file" disabled class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-400">
        `;
    }
    return `
        <input type="${field.type}" disabled placeholder="${field.placeholder || ''}" class="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-500">
    `;
}

function toggleFieldWidthInPreview(index) {
    const schema = getCurrentSchema();
    schema[index].width = schema[index].width === 'full' ? 'half' : 'full';
    saveSchemaToStorage(schema);
    renderPreviewForm();
}

async function saveSchemaDraft() {
    const formType = currentTarget;
    const token = getAdminToken();

    if (!token) {
        alert("Admin session expired. Please log in again.");
        return;
    }

    const schema = getCurrentSchema();

    try {
        const response = await fetch(
            `${ADMIN_API_BASE_URL}/schemas/${formType}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    fields: schema
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to save draft.");
        }

        schemaDirty[formType] = false;
        schemaNeedsMigration[formType] = false;

        if (!schemaMetadata[formType]) {
            schemaMetadata[formType] = {};
        }

        schemaMetadata[formType].draftVersion = result.draftVersion;

        alert(
            `${formType.toUpperCase()} form draft saved successfully in MongoDB.\n\n` +
            `Draft version: ${result.draftVersion}\n\n` +
            `The live registration form has NOT been changed.`
        );

    } catch (error) {
        console.error("Save draft failed:", error);
        alert(error.message || "Unable to save the draft.");
    }
}

async function publishSchema() {
    const formType = currentTarget;
    const token = getAdminToken();

    if (!token) {
        alert("Admin session expired. Please log in again.");
        return;
    }

    if (schemaDirty[formType] || schemaNeedsMigration[formType]) {
        alert("Please save the current draft before publishing.");
        return;
    }

    const confirmed = confirm(
        `Publish the saved ${formType.toUpperCase()} form schema?\n\n` +
        `This will update the live registration form.`
    );

    if (!confirmed) return;

    try {
        const response = await fetch(
            `${ADMIN_API_BASE_URL}/schemas/${formType}/publish`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to publish schema.");
        }

        if (!schemaMetadata[formType]) {
            schemaMetadata[formType] = {};
        }

        schemaMetadata[formType].publishedVersion =
            result.publishedVersion;

        schemaMetadata[formType].publishedAt =
            result.publishedAt;

        alert(
            `${formType.toUpperCase()} form published successfully!\n\n` +
            `Published version: ${result.publishedVersion}`
        );

    } catch (error) {
        console.error("Publish schema failed:", error);
        alert(error.message || "Unable to publish the schema.");
    }
}