// public/js/parent_signup.js

const defaultParentSchema = [
    { id: "pName", label: "Full Name", type: "text", placeholder: "e.g. Ramesh Sharma", required: true, width: "full" },
    { id: "pPhone", label: "Phone Number", type: "tel", placeholder: "+91 9876543210", required: true, width: "half", errorId: "phoneError", defaultErrorText: "10-digit mobile number" },
    { id: "pEmail", label: "Email ID", type: "email", placeholder: "e.g. parent@example.com", required: true, width: "half", errorId: "emailError", defaultErrorText: "Valid email format" },
    { id: "pLocation", label: "Area / Location", type: "text", placeholder: "e.g. Sector 62, Noida", required: true, width: "full" }
];

const subjectsLower = ["Hindi", "English", "Maths", "Science", "SST", "Computer", "All Subjects", "Others"];
const subjectsSenior = ["Physics", "Maths", "Chemistry", "Biology", "Accounts", "Economics", "Humanities", "Computer Science", "Others"];

export function initParentSignup() {
    // Expose functions to global window scope so HTML inline attributes can find them
    window.onClassChange = onClassChange;
    window.handleCheckboxChange = handleCheckboxChange;
    window.togglePassword = togglePassword;
    window.updatePreferredTimeValue = updatePreferredTimeValue;
    window.validateParentForm = validateParentForm;
    window.handleParentSubmit = handleParentSubmit;

    renderDynamicParentFields();
}

async function renderDynamicParentFields() {
    const container = document.getElementById('dynamicFieldsContainer');
    let fields = [];

    try {
        const response = await fetch('http://127.0.0.1:5000/api/schemas/parent');
        if (response.ok) {
            fields = await response.json();
        }
    } catch (e) {
        console.warn("MongoDB schema unreachable, checking localStorage fallback...");
    }

    if (!fields || fields.length === 0) {
        const storedSchema = localStorage.getItem('parent_signup_schema');
        fields = storedSchema ? JSON.parse(storedSchema) : defaultParentSchema;
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
                   class="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all shadow-sm" 
                   oninput="validateParentForm()">
            ${helperHTML}
        `;
        container.appendChild(wrapper);
    });
}

function onClassChange() {
    const classSelect = document.getElementById('pClass');
    const container = document.getElementById('pSubjectsContainer');
    const otherContainer = document.getElementById('pSubjectsOtherContainer');
    const otherInput = document.getElementById('pSubjectsOther');

    const selectedType = classSelect ? classSelect.value : '';
    if (otherContainer) otherContainer.classList.add('hidden');
    if (otherInput) {
        otherInput.value = '';
        otherInput.required = false;
    }
    if (!container) return;
    container.innerHTML = '';

    if (!selectedType) {
        container.innerHTML = '<span class="text-slate-400">Please select a child\'s class first.</span>';
        container.className = "p-4 bg-slate-100 border border-slate-300 rounded-xl text-sm text-slate-400";
    } else {
        container.className = "p-4 bg-white border border-slate-300 rounded-xl text-sm text-slate-700 shadow-sm";
        let list = (selectedType === 'senior') ? subjectsSenior : subjectsLower;

        const gridDiv = document.createElement('div');
        gridDiv.className = "grid grid-cols-2 gap-2.5 w-full";

        list.forEach((sub, index) => {
            const label = document.createElement('label');
            label.className = "flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-blue-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors";
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'pSubjectCheckbox';
            checkbox.value = sub;
            checkbox.id = `sub_${index}`;
            checkbox.className = "rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4";
            checkbox.onchange = function() {
                handleCheckboxChange();
                validateParentForm();
            };

            const span = document.createElement('span');
            span.textContent = sub;

            label.appendChild(checkbox);
            label.appendChild(span);
            gridDiv.appendChild(label);
        });

        container.appendChild(gridDiv);
    }

    validateParentForm();
}

function handleCheckboxChange() {
    const checkboxes = document.querySelectorAll('input[name="pSubjectCheckbox"]');
    const otherContainer = document.getElementById('pSubjectsOtherContainer');
    const otherInput = document.getElementById('pSubjectsOther');

    let isOthersChecked = Array.from(checkboxes).some(cb => cb.value === 'Others' && cb.checked);

    if (otherContainer && otherInput) {
        if (isOthersChecked) {
            otherContainer.classList.remove('hidden');
            otherInput.required = true;
        } else {
            otherContainer.classList.add('hidden');
            otherInput.required = false;
            otherInput.value = '';
        }
    }
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

function updatePreferredTimeValue() {
    const hour = document.getElementById('pTimeHour').value;
    const minute = document.getElementById('pTimeMinute').value;
    const period = document.getElementById('pTimePeriod').value;
    const hiddenTimeInput = document.getElementById('pTime');

    if (hiddenTimeInput) {
        hiddenTimeInput.value = (hour && minute) ? `${hour}:${minute} ${period}` : '';
    }
    validateParentForm();
}

function validateParentForm() {
    const nameEl = document.getElementById('pName');
    const phoneEl = document.getElementById('pPhone');
    const emailEl = document.getElementById('pEmail');
    const locationEl = document.getElementById('pLocation');

    const name = nameEl ? nameEl.value.trim() : 'Valid';
    const phone = phoneEl ? phoneEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';
    const location = locationEl ? locationEl.value.trim() : 'Valid';

    const cls = document.getElementById('pClass').value;
    const budget = document.getElementById('pBudget').value;
    const password = document.getElementById('pPassword').value;

    const phoneErr = document.getElementById('phoneError');
    const emailErr = document.getElementById('emailError');
    const passError = document.getElementById('pPasswordError');
    const submitBtn = document.getElementById('pSubmitBtn');

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

    const checkedSubjects = document.querySelectorAll('input[name="pSubjectCheckbox"]:checked');
    const isSubjectSelected = checkedSubjects.length > 0;
    let isOthersChecked = Array.from(checkedSubjects).some(cb => cb.value === 'Others');
    let isOthersValid = !isOthersChecked || document.getElementById('pSubjectsOther').value.trim().length > 0;

    const requiredFilled = name && isPhoneValid && isEmailValid && location && cls && isSubjectSelected && isOthersValid && budget && isPassValid;

    if (submitBtn) {
        if (requiredFilled) {
            submitBtn.removeAttribute('disabled');
        } else {
            submitBtn.setAttribute('disabled', 'true');
        }
    }
}

async function handleParentSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById("pSubmitBtn");
    if (submitBtn) submitBtn.disabled = true;

    const checkedBoxes = document.querySelectorAll('input[name="pSubjectCheckbox"]:checked');
    let subjects = Array.from(checkedBoxes).map(cb => cb.value);

    const othersInput = document.getElementById('pSubjectsOther');
    if (othersInput && !othersInput.closest('#pSubjectsOtherContainer').classList.contains('hidden')) {
        const customSub = othersInput.value.trim();
        if (customSub) subjects.push(customSub);
    }

    const payload = {
        fullName: document.getElementById('pName') ? document.getElementById('pName').value.trim() : '',
        phone: document.getElementById('pPhone') ? document.getElementById('pPhone').value.trim() : '',
        email: document.getElementById('pEmail') ? document.getElementById('pEmail').value.trim() : '',
        password: document.getElementById('pPassword').value,
        location: document.getElementById('pLocation') ? document.getElementById('pLocation').value.trim() : '',
        studentClass: document.getElementById('pClass').selectedOptions[0].textContent.trim(),
        subjectsNeeded: subjects,
        preferredTime: document.getElementById('pTime').value || 'Flexible',
        budget: document.getElementById('pBudget').value
    };

    try {
        const response = await fetch("http://localhost:5000/api/auth/register/parent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Registration failed.");
        }

        alert(result.message || "Parent registration successful.");
        document.getElementById("parentSignupForm").reset();
    } catch (error) {
        alert(error.message || "Cannot connect to the server.");
        console.error("Parent signup error:", error);
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        validateParentForm();
    }
}