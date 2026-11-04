const API_BASE_URL = "http://localhost:5000";
const DASHBOARD_URL = "/admin/index.html";

function showLoginMessage(message, type = "info") {
    const messageElement = document.getElementById("loginMessage");

    if (!messageElement) return;

    const styles = {
        info: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
        success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
        error: "bg-red-500/10 text-red-300 border-red-500/20"
    };

    messageElement.className =
        `text-sm rounded-lg px-4 py-3 border ${styles[type] || styles.info}`;

    messageElement.textContent = message;
    messageElement.classList.remove("hidden");
}

function setLoginLoading(isLoading) {
    const button = document.querySelector(
        '#signInForm button[type="submit"]'
    );

    if (!button) return;

    button.disabled = isLoading;
    button.textContent = isLoading
        ? "Signing in..."
        : "Sign In to Dashboard";
}

function saveAdminSession(token, admin, rememberDevice) {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminUser");

    const storage = rememberDevice ? localStorage : sessionStorage;

    storage.setItem("adminToken", token);
    storage.setItem("adminUser", JSON.stringify(admin));
}

async function handleAuth(event) {
    event.preventDefault();

    const email = document.getElementById("adminEmail")?.value
        .trim()
        .toLowerCase();

    const password = document.getElementById("adminPassword")?.value;
    const rememberDevice =
        document.getElementById("rememberDevice")?.checked ?? false;

    if (!email || !password) {
        showLoginMessage("Enter your email and password.", "error");
        return;
    }

    setLoginLoading(true);
    showLoginMessage("Verifying your credentials...");

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message || "Login failed. Check your credentials."
            );
        }

        if (
            !data.token ||
            !data.admin ||
            data.admin.role !== "admin"
        ) {
            throw new Error("Invalid login response from the server.");
        }

        saveAdminSession(data.token, data.admin, rememberDevice);

        showLoginMessage("Login successful. Opening dashboard...", "success");

        window.location.assign(DASHBOARD_URL);
    } catch (error) {
        const message = error instanceof TypeError
            ? "Cannot connect to the login API. Check that the backend is running."
            : error.message;

        showLoginMessage(message, "error");
        setLoginLoading(false);
    }
}

function initializeAdminLogin() {
    const form = document.getElementById("signInForm");

    if (!form) {
        console.error("Admin login form #signInForm was not found.");
        return;
    }

    form.addEventListener("submit", handleAuth);
}

document.addEventListener("DOMContentLoaded", initializeAdminLogin);
