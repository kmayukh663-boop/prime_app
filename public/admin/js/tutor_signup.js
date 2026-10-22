// public/js/tutor_signup.js

const defaultTutorSchema = [
    { id: "tName", label: "Full Name", type: "text", placeholder: "e.g. Dr. Anjali Verma", required: true, width: "full" },
    { id: "tPhone", label: "Phone Number", type: "tel", placeholder: "+91 9876543210", required: true, width: "half", errorId: "tPhoneError", defaultErrorText: "10-digit mobile number" },
    { id: "tEmail", label: "Email ID", type: "email", placeholder: "e.g. tutor@example.com", required: true, width: "half", errorId: "tEmailError", defaultErrorText: "Valid email format" },
    { id: "tLocation", label: "Area / Location", type: "text", placeholder: "e.g. Indirapuram, Ghaziabad", required: true, width: "full" }
];

const tutorSubjectsGeneral = ["Hindi", "English", "Maths", "Science", "SST", "Computer", "All Subjects", "Others"];
const tutorSubjectsSenior = ["Physics", "Maths", "Chemistry", "Biology", "Accounts", "Economics", "Business Studies", "Humanities", "Computer Science", "Others"];

export function initTutorSignup() {
    // Expose functions to global window scope so HTML inline event handlers can find them
    window.onTutorClassChange = onTutorClassChange;
    window.updateTutorSubjects = updateTutorSubjects;
    window.togglePassword = togglePassword;
    window.validateTutorForm = validateTutorForm;
    window.handleTutorSubmit = handleTutorSubmit;

    renderDynamicTutorFields();
    onTutorClassChange();
}

async function renderDynamicTutorFields() {
    const container = document.getElementById('tutorDynamicContainer');
    let fields = [];

    try {
        const response = await fetch('http://127.0.0.1:5000/api/schemas/tutor');
        if (response.ok) {
            fields = await response.json();
        }
    } catch (e) {
        console.warn("MongoDB schema unreachable, checking localStorage fallback...");
    }

    if (!fields || fields.length === 0) {
        const storedSchema = localStorage.getItem('tutor_signup_schema');
        fields = storedSchema ? JSON.parse(storedSchema) : defaultTutorSchema;
    }

    if (!container) return;
    container.innerHTML = '';

    fields.forEach((field, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = field.width === 'full' ? 'sm:col-span-2' : 'sm:col-span-1';

        let helperHTML = field.errorId ? `<p id="${field.errorId}" class="text-[10px] text-slate-400 mt-1">${field.defaultErrorText || ''}</p>` : '';

        wrapper.innerHTML = `
            <label class="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                ${index + 1}. ${field.label} ${field.required ? '*' : ''}
            </label>
            <input type="${field.type}" 
                   id="${field.id}" 
                   ${field.required ? 'required' : ''} 
                   placeholder="${field.placeholder || ''}" 
                   class="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all shadow-sm" 
                   oninput="validateTutorForm()">
            ${helperHTML}
        `;
        container.appendChild(wrapper);
    });
}

function onTutorClassChange() {
    const container = document.getElementById("tSubjectsContainer");
    const classSelect = document.getElementById("tClasses");
    const classValue = classSelect ? classSelect.value : "";

    if (!container) return;

    if (!classValue) {
        container.innerHTML = "Please select the classes you can teach first.";
        container.className = "h-[92px] p-3 bg-slate-100 border border-slate-300 rounded-xl text-sm text-slate-400 opacity-70 cursor-not-allowed";
        container.setAttribute("aria-disabled", "true");
        const hiddenSub = document.getElementById("tSubjects");
        if (hiddenSub) hiddenSub.value = "";
        return;
    }

    container.innerHTML = "";
    container.className = "h-[92px] overflow-y-auto p-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-700 shadow-sm";
    container.setAttribute("aria-disabled", "false");

    const list = classValue === "senior" ? tutorSubjectsSenior : tutorSubjectsGeneral;
    const grid = document.createElement("div");
    grid.className = "grid grid-cols-2 gap-x-2 gap-y-1 w-full";

    list.forEach((subject, index) => {
        const label = document.createElement("label");
        label.className = "flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-purple-600 px-1 py-0.5 rounded";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "tSubjectCheckbox";
        checkbox.value = subject;
        checkbox.id = `t_subject_${index}`;
        checkbox.className = "rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4";
        checkbox.addEventListener("change", updateTutorSubjects);
        const text = document.createElement("span");
        text.textContent = subject;
        label.append(checkbox, text);
        grid.appendChild(label);
    });
    container.appendChild(grid);
    updateTutorSubjects();
}

function updateTutorSubjects() {
    const selected = Array.from(document.querySelectorAll('input[name="tSubjectCheckbox"]:checked'))
        .map(checkbox => checkbox.value);
    const hiddenSub = document.getElementById("tSubjects");
    if (hiddenSub) hiddenSub.value = selected.join(", ");
    validateTutorForm();
}

function togglePassword(fieldId, iconId) {
    const field = document.getElementById(fieldId);
    const icon = document.getElementById(iconId);
    if (!field || !icon) return;
    if (field.type === 'password') {
        field.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        field.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
    return /^(\+91[\-\s]?)?[6-9]\d{9}$/.test(phone);
}

function validatePassword(password) {
    return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!\%*?&]{8,}$/.test(password);
}

function validateTutorForm() {
    const phoneEl = document.getElementById('tPhone');
    const emailEl = document.getElementById('tEmail');
    
    const phone = phoneEl ? phoneEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';

    const resumeInput = document.getElementById('tResume');
    const eduDocsInput = document.getElementById('tEduDocs');
    const idTypeEl = document.getElementById('tIdType');
    const idFileInput = document.getElementById('tIdFile');
    const passwordEl = document.getElementById('tPassword');

    const resume = resumeInput ? resumeInput.files.length > 0 : false;
    const eduDocs = eduDocsInput ? eduDocsInput.files.length > 0 : false;
    const idType = idTypeEl ? idTypeEl.value : '';
    const idFile = idFileInput ? idFileInput.files.length > 0 : false;
    const password = passwordEl ? passwordEl.value : '';

    const phoneErr = document.getElementById('tPhoneError');
    const emailErr = document.getElementById('tEmailError');
    const passError = document.getElementById('tPasswordError');
    const submitBtn = document.getElementById('tSubmitBtn');

    const isPhoneValid = phoneEl ? validatePhone(phone) : true;
    const isEmailValid = emailEl ? validateEmail(email) : true;
    const isPassValid = validatePassword(password);

    if (phoneEl && phoneErr) {
        if (phone.length > 0) {
            phoneErr.className = isPhoneValid ? "text-[10px] text-emerald-600 mt-1" : "text-[10px] text-rose-500 mt-1";
            phoneErr.innerText = isPhoneValid ? "Valid phone number format." : "Enter valid 10-digit mobile number.";
        } else {
            phoneErr.className = "text-[10px] text-slate-400 mt-1";
            phoneErr.innerText = "10-digit mobile number";
        }
    }

    if (emailEl && emailErr) {
        if (email.length > 0) {
            emailErr.className = isEmailValid ? "text-[10px] text-emerald-600 mt-1" : "text-[10px] text-rose-500 mt-1";
            emailErr.innerText = isEmailValid ? "Valid email format." : "Enter a valid email address.";
        } else {
            emailErr.className = "text-[10px] text-slate-400 mt-1";
            emailErr.innerText = "Valid email format";
        }
    }

    if (password.length > 0 && passError) {
        passError.className = isPassValid ? "text-[11px] text-emerald-600 mt-1" : "text-[11px] text-rose-500 mt-1";
        passError.innerText = isPassValid ? "Password criteria met successfully!" : "Password must be min 8 chars with letters, numbers & special character.";
    } else if (passError) {
        passError.className = "text-[11px] text-slate-400 mt-1";
        passError.innerText = "Must be min 8 chars, include letters, numbers & special character.";
    }

    const allFilled = isPhoneValid && isEmailValid && resume && eduDocs && idType && idFile && isPassValid;

    if (submitBtn) {
        if (allFilled) {
            submitBtn.removeAttribute('disabled');
        } else {
            submitBtn.setAttribute('disabled', 'true');
        }
    }
}

async function handleTutorSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById("tSubmitBtn");
    if (submitBtn) submitBtn.disabled = true;

    const formData = new FormData();

    formData.append("fullName", document.getElementById("tName") ? document.getElementById("tName").value.trim() : "");
    formData.append("phone", document.getElementById("tPhone") ? document.getElementById("tPhone").value.trim() : "");
    formData.append("email", document.getElementById("tEmail") ? document.getElementById("tEmail").value.trim() : "");
    formData.append("password", document.getElementById("tPassword") ? document.getElementById("tPassword").value : "");
    formData.append("location", document.getElementById("tLocation") ? document.getElementById("tLocation").value.trim() : "");
    
    const classSelect = document.getElementById("tClasses");
    formData.append("classes", classSelect && classSelect.selectedOptions[0] ? classSelect.selectedOptions[0].textContent.trim() : "");
    
    formData.append("subjects", document.getElementById("tSubjects") ? document.getElementById("tSubjects").value.trim() : "");
    formData.append("qualification", document.getElementById("tQualification") ? document.getElementById("tQualification").value.trim() : "");
    formData.append("experience", document.getElementById("tExperience") ? document.getElementById("tExperience").value.trim() : "");
    formData.append("idType", document.getElementById("tIdType") ? document.getElementById("tIdType").value : "");

    const resumeFile = document.getElementById("tResume").files[0];
    if (resumeFile) formData.append("resume", resumeFile);

    Array.from(document.getElementById("tEduDocs").files).forEach(file => {
        formData.append("educationDocs", file);
    });

    const idProofFile = document.getElementById("tIdFile").files[0];
    if (idProofFile) formData.append("idProof", idProofFile);

    try {
        const response = await fetch("http://localhost:5000/api/auth/register/tutor", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Registration failed.");
        }

        alert(result.message || "Tutor registration successful.");
        document.getElementById("tutorSignupForm").reset();
    } catch (error) {
        alert(error.message || "Cannot connect to the server.");
        console.error("Tutor signup error:", error);
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        validateTutorForm();
    }
}