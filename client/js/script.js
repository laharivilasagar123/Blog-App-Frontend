/* ==========================================================================
   BlogSphere — script.js (Module 2: connected to the Express backend)

   All authentication and blog data now come from the REST API at
   API_BASE_URL instead of localStorage. localStorage is still used, but
   only to hold the JWT + basic user info between page loads — never a
   password, and never blog data.
   ========================================================================== */

/* -------------------------------------------------------------------------
   0. Config, storage keys & small utilities
   ------------------------------------------------------------------------- */
const API_BASE_URL = "http://localhost:5000/api";

const STORAGE_KEYS = {
    TOKEN: "blogsphere_token",
    USER: "blogsphere_user",
    FLASH: "blogsphere_flash",
};

// Shorthand query-selector helpers
const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

// Escape user-entered text before inserting it as HTML, to avoid broken markup
function escapeHtml(str = "") {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// Turn a date string into something friendly, e.g. "Aug 8, 2026"
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/* -------------------------------------------------------------------------
   1. Toast messages (success / error banners shown briefly on screen)
   ------------------------------------------------------------------------- */
function showToast(message, type = "success") {
    let toast = qs("#toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.className = "toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast show toast-${type}`;

    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3200);
}

// Store a message in sessionStorage so it survives a redirect (e.g. after login)
function setFlashMessage(message, type = "success") {
    sessionStorage.setItem(STORAGE_KEYS.FLASH, JSON.stringify({ message, type }));
}

function consumeFlashMessage() {
    const raw = sessionStorage.getItem(STORAGE_KEYS.FLASH);
    if (!raw) return;
    sessionStorage.removeItem(STORAGE_KEYS.FLASH);
    try {
        const { message, type } = JSON.parse(raw);
        showToast(message, type);
    } catch (err) {
        console.error("Could not read flash message:", err);
    }
}

/* -------------------------------------------------------------------------
   2. Mobile navigation menu
   ------------------------------------------------------------------------- */
function initMobileNav() {
    const hamburger = qs("#hamburger");
    const navMenu = qs("#navMenu");
    if (!hamburger || !navMenu) return;

    hamburger.addEventListener("click", () => {
        const isOpen = navMenu.classList.toggle("is-open");
        hamburger.classList.toggle("is-open", isOpen);
        hamburger.setAttribute("aria-expanded", String(isOpen));
    });

    qsa("a", navMenu).forEach((link) => {
        link.addEventListener("click", () => {
            navMenu.classList.remove("is-open");
            hamburger.classList.remove("is-open");
            hamburger.setAttribute("aria-expanded", "false");
        });
    });
}

// Highlight the current page in the navbar
function markActiveNavLink() {
    const current = window.location.pathname.split("/").pop() || "index.html";
    qsa(".nav-links a").forEach((link) => {
        const href = link.getAttribute("href");
        if (href === current) {
            link.classList.add("active");
        }
    });
}

/* -------------------------------------------------------------------------
   3. Session helpers (JWT + user info only — never a password)
   ------------------------------------------------------------------------- */

// "Remember me" checked -> persists across browser restarts (localStorage).
// Unchecked -> cleared when the tab closes (sessionStorage).
function setSession(token, user, remember) {
    const storage = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;

    storage.setItem(STORAGE_KEYS.TOKEN, token);
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    other.removeItem(STORAGE_KEYS.TOKEN);
    other.removeItem(STORAGE_KEYS.USER);
}

function getToken() {
    return localStorage.getItem(STORAGE_KEYS.TOKEN) || sessionStorage.getItem(STORAGE_KEYS.TOKEN);
}

function getStoredUser() {
    const raw = localStorage.getItem(STORAGE_KEYS.USER) || sessionStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (err) {
        console.error("Could not read stored user:", err);
        return null;
    }
}

function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
}

function logout() {
    clearSession();
    setFlashMessage("You have been logged out.", "success");
    window.location.href = "login.html";
}

// Redirect away from pages that require login before any API call is made
function requireAuth() {
    const token = getToken();
    const user = getStoredUser();
    if (!token || !user) {
        setFlashMessage("Please log in to continue.", "error");
        window.location.href = "login.html";
        return null;
    }
    return { token, user };
}

// If the API says our token is missing/invalid/expired, clear it and bounce
// to login — used after any authenticated fetch() comes back 401.
function handleUnauthorizedResponse() {
    clearSession();
    setFlashMessage("Your session has expired. Please log in again.", "error");
    window.location.href = "login.html";
}

// Update navbar auth-dependent buttons (Login/Register vs Dashboard/Logout)
function renderAuthAwareNav() {
    const user = getStoredUser();
    const authSlot = qs("#navAuthSlot");
    if (!authSlot) return;

    if (user) {
        authSlot.innerHTML = `
            <a href="dashboard.html" class="btn btn-outline btn-sm">Dashboard</a>
            <button type="button" class="btn btn-primary btn-sm" id="navLogoutBtn">Logout</button>
        `;
        const logoutBtn = qs("#navLogoutBtn", authSlot);
        if (logoutBtn) logoutBtn.addEventListener("click", logout);
    } else {
        authSlot.innerHTML = `
            <a href="login.html" class="btn btn-outline btn-sm">Login</a>
            <a href="register.html" class="btn btn-primary btn-sm">Register</a>
        `;
    }
}

/* -------------------------------------------------------------------------
   4. Small fetch() wrapper around the BlogSphere API
   ------------------------------------------------------------------------- */

/**
 * Calls the BlogSphere API and returns the parsed JSON body.
 * - Automatically attaches the JWT (if present) as a Bearer token.
 * - On a 401 response, clears the session and redirects to Login.
 * - Network failures (server not running, CORS, etc.) are reported as a
 *   friendly error message instead of an unhandled exception.
 */
async function apiRequest(path, { method = "GET", body, auth = false } = {}) {
    const headers = { "Content-Type": "application/json" };

    if (auth) {
        const token = getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
    }

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch (err) {
        console.error(`Network error calling ${path}:`, err);
        throw new Error(
            "Could not reach the BlogSphere server. Make sure the backend is running on http://localhost:5000."
        );
    }

    if (response.status === 401 && auth) {
        handleUnauthorizedResponse();
        // Stop further processing on this page — we're navigating away
        throw new Error("Session expired.");
    }

    let data = {};
    try {
        data = await response.json();
    } catch (err) {
        // Non-JSON response body (rare) — fall through with an empty object
    }

    if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}.`);
    }

    return data;
}

/* -------------------------------------------------------------------------
   5. Field validation helpers
   ------------------------------------------------------------------------- */
function isValidEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email.trim());
}

function setFieldError(inputEl, errorEl, message) {
    if (message) {
        inputEl.classList.add("is-invalid");
        inputEl.classList.remove("is-valid");
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.add("show");
        }
        inputEl.setAttribute("aria-invalid", "true");
    } else {
        inputEl.classList.remove("is-invalid");
        inputEl.classList.add("is-valid");
        if (errorEl) {
            errorEl.textContent = "";
            errorEl.classList.remove("show");
        }
        inputEl.setAttribute("aria-invalid", "false");
    }
}

/* -------------------------------------------------------------------------
   6. Login page logic
   ------------------------------------------------------------------------- */
function initLoginPage() {
    const form = qs("#loginForm");
    if (!form) return;

    const emailInput = qs("#loginEmail");
    const passwordInput = qs("#loginPassword");
    const rememberInput = qs("#loginRemember");
    const emailError = qs("#loginEmailError");
    const passwordError = qs("#loginPasswordError");
    const formAlert = qs("#loginAlert");
    const submitBtn = qs('button[type="submit"]', form);

    if (getToken() && getStoredUser()) {
        window.location.href = "dashboard.html";
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        formAlert.classList.remove("show");

        let isValid = true;

        if (!emailInput.value.trim()) {
            setFieldError(emailInput, emailError, "Email is required.");
            isValid = false;
        } else if (!isValidEmail(emailInput.value)) {
            setFieldError(emailInput, emailError, "Enter a valid email address.");
            isValid = false;
        } else {
            setFieldError(emailInput, emailError, "");
        }

        if (!passwordInput.value) {
            setFieldError(passwordInput, passwordError, "Password is required.");
            isValid = false;
        } else if (passwordInput.value.length < 6) {
            setFieldError(passwordInput, passwordError, "Password must be at least 6 characters.");
            isValid = false;
        } else {
            setFieldError(passwordInput, passwordError, "");
        }

        if (!isValid) return;

        submitBtn.disabled = true;
        submitBtn.textContent = "Logging in...";

        try {
            const data = await apiRequest("/auth/login", {
                method: "POST",
                body: { email: emailInput.value.trim(), password: passwordInput.value },
            });

            setSession(data.token, data.user, rememberInput.checked);
            setFlashMessage(`Welcome back, ${data.user.name.split(" ")[0]}!`, "success");
            window.location.href = "dashboard.html";
        } catch (err) {
            formAlert.textContent = err.message || "Incorrect email or password. Please try again.";
            formAlert.className = "alert alert-error show";
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Login";
        }
    });

    const toggleBtn = qs("#toggleLoginPassword");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            const isPassword = passwordInput.type === "password";
            passwordInput.type = isPassword ? "text" : "password";
            toggleBtn.textContent = isPassword ? "Hide" : "Show";
        });
    }
}

/* -------------------------------------------------------------------------
   7. Register page logic
   ------------------------------------------------------------------------- */
function initRegisterPage() {
    const form = qs("#registerForm");
    if (!form) return;

    const nameInput = qs("#registerName");
    const emailInput = qs("#registerEmail");
    const passwordInput = qs("#registerPassword");
    const confirmInput = qs("#registerConfirm");
    const termsInput = qs("#registerTerms");

    const nameError = qs("#registerNameError");
    const emailError = qs("#registerEmailError");
    const passwordError = qs("#registerPasswordError");
    const confirmError = qs("#registerConfirmError");
    const termsError = qs("#registerTermsError");
    const formAlert = qs("#registerAlert");
    const successPanel = qs("#registerSuccess");
    const submitBtn = qs('button[type="submit"]', form);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        formAlert.classList.remove("show");

        let isValid = true;

        if (!nameInput.value.trim()) {
            setFieldError(nameInput, nameError, "Full name is required.");
            isValid = false;
        } else {
            setFieldError(nameInput, nameError, "");
        }

        if (!emailInput.value.trim()) {
            setFieldError(emailInput, emailError, "Email is required.");
            isValid = false;
        } else if (!isValidEmail(emailInput.value)) {
            setFieldError(emailInput, emailError, "Enter a valid email address.");
            isValid = false;
        } else {
            setFieldError(emailInput, emailError, "");
        }

        if (!passwordInput.value) {
            setFieldError(passwordInput, passwordError, "Password is required.");
            isValid = false;
        } else if (passwordInput.value.length < 6) {
            setFieldError(passwordInput, passwordError, "Password must be at least 6 characters.");
            isValid = false;
        } else {
            setFieldError(passwordInput, passwordError, "");
        }

        if (!confirmInput.value) {
            setFieldError(confirmInput, confirmError, "Please confirm your password.");
            isValid = false;
        } else if (confirmInput.value !== passwordInput.value) {
            setFieldError(confirmInput, confirmError, "Passwords do not match.");
            isValid = false;
        } else {
            setFieldError(confirmInput, confirmError, "");
        }

        if (!termsInput.checked) {
            termsError.classList.add("show");
            isValid = false;
        } else {
            termsError.classList.remove("show");
        }

        if (!isValid) return;

        submitBtn.disabled = true;
        submitBtn.textContent = "Creating account...";

        try {
            await apiRequest("/auth/register", {
                method: "POST",
                body: {
                    name: nameInput.value.trim(),
                    email: emailInput.value.trim(),
                    password: passwordInput.value,
                },
            });

            form.classList.add("visually-hidden");
            successPanel.classList.add("show");
            successPanel.style.display = "flex";
        } catch (err) {
            // The backend tells us plainly, e.g. "Email already registered"
            formAlert.textContent = err.message || "Something went wrong. Please try again.";
            formAlert.className = "alert alert-error show";

            if (/email/i.test(err.message || "")) {
                setFieldError(emailInput, emailError, err.message);
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Create Account";
        }
    });
}

/* -------------------------------------------------------------------------
   8. Home page — popular blogs, search, category filter (from the API)
   ------------------------------------------------------------------------- */
function initHomeBlogSection() {
    const grid = qs("#blogGrid");
    if (!grid) return;

    const searchInput = qs("#blogSearchInput");
    const chipsWrap = qs("#categoryChips");

    let allBlogs = [];
    let activeCategory = "All";
    let searchTerm = "";

    function getInitials(name = "") {
        return name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
    }

    function renderBlogCard(blog) {
        return `
            <article class="blog-card">
                <div class="blog-card-media" aria-hidden="true">${escapeHtml(blog.category)}</div>
                <div class="blog-card-body">
                    <span class="blog-category">${escapeHtml(blog.category)}</span>
                    <h3>${escapeHtml(blog.title)}</h3>
                    <p>${escapeHtml(blog.description)}</p>
                    <div class="blog-meta">
                        <span class="blog-author">
                            <span class="author-avatar" aria-hidden="true">${getInitials(blog.author)}</span>
                            ${escapeHtml(blog.author)}
                        </span>
                        <span>${formatDate(blog.createdAt)}</span>
                    </div>
                    <a href="blog-details.html?id=${encodeURIComponent(blog.id)}" class="read-more">Read More &rarr;</a>
                </div>
            </article>
        `;
    }

    function renderChips() {
        if (!chipsWrap) return;
        const categories = ["All", ...new Set(allBlogs.map((b) => b.category))];

        chipsWrap.innerHTML = categories
            .map(
                (cat) => `
                <button type="button" class="chip ${cat === activeCategory ? "active" : ""}" data-category="${escapeHtml(cat)}">
                    ${escapeHtml(cat)}
                </button>
            `
            )
            .join("");

        qsa(".chip", chipsWrap).forEach((chip) => {
            chip.addEventListener("click", () => {
                activeCategory = chip.dataset.category;
                renderChips();
                renderGrid();
            });
        });
    }

    function renderGrid() {
        const filtered = allBlogs.filter((blog) => {
            const matchesCategory = activeCategory === "All" || blog.category === activeCategory;
            const haystack = `${blog.title} ${blog.description}`.toLowerCase();
            const matchesSearch = haystack.includes(searchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>No blogs found</h3>
                    <p>Try a different search term or category, or be the first to publish one!</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = filtered.map(renderBlogCard).join("");
    }

    if (searchInput) {
        searchInput.addEventListener("input", (event) => {
            searchTerm = event.target.value;
            renderGrid();
        });
    }

    async function loadBlogs() {
        grid.innerHTML = `<div class="empty-state"><p>Loading blogs...</p></div>`;
        try {
            const data = await apiRequest("/blogs");
            allBlogs = data.blogs || [];
            renderChips();
            renderGrid();
        } catch (err) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h3>Couldn't load blogs</h3>
                    <p>${escapeHtml(err.message)}</p>
                </div>
            `;
        }
    }

    loadBlogs();
}

// Lightweight read-only preview for a blog card on the Home page
function openBlogPreview(blog) {
    let overlay = qs("#readBlogModal");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "readBlogModal";
        overlay.className = "modal-overlay";
        overlay.innerHTML = `
            <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="readBlogTitle">
                <div class="modal-header">
                    <h2 id="readBlogTitle">Blog Post</h2>
                    <button type="button" class="modal-close" id="readBlogClose" aria-label="Close preview">&times;</button>
                </div>
                <div class="modal-body" id="readBlogBody"></div>
            </div>
        `;
        document.body.appendChild(overlay);
        qs("#readBlogClose", overlay).addEventListener("click", () => overlay.classList.remove("show"));
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) overlay.classList.remove("show");
        });
    }

    qs("#readBlogTitle", overlay).textContent = blog.title;
    qs("#readBlogBody", overlay).innerHTML = `
        <div class="preview-media" aria-hidden="true">${escapeHtml(blog.category)}</div>
        <span class="blog-category">${escapeHtml(blog.category)}</span>
        <h3>${escapeHtml(blog.title)}</h3>
        <div class="blog-meta">
            <span class="blog-author">${escapeHtml(blog.author || "You")}</span>
            <span>${formatDate(blog.createdAt || new Date().toISOString())}</span>
        </div>
        <p class="preview-content">${escapeHtml(blog.content)}</p>
        <div class="preview-tags">
            ${(blog.tags || []).map((t) => `<span>#${escapeHtml(t)}</span>`).join("")}
        </div>
    `;
    overlay.classList.add("show");
}

/* -------------------------------------------------------------------------
   8b. Blog Details page — full view of a single published blog
   ------------------------------------------------------------------------- */
function initBlogDetailsPage() {
    const shell = qs("#blogDetailsShell");
    if (!shell) return;

    const statusBox = qs("#blogDetailsStatus");
    const card = qs("#blogDetailsCard");

    function getInitials(name = "") {
        return name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
    }

    function showStatus(icon, title, message) {
        statusBox.innerHTML = `
            <div class="empty-icon">${icon}</div>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(message)}</p>
            <a href="index.html#popular-blogs" class="btn btn-primary">Back to Home</a>
        `;
        statusBox.style.display = "block";
        card.style.display = "none";
    }

    function renderBlog(blog) {
        document.title = `${blog.title} — BlogSphere`;

        qs("#blogDetailsMedia").textContent = blog.category;
        qs("#blogDetailsCategory").textContent = blog.category;
        qs("#blogDetailsTitle").textContent = blog.title;
        qs("#blogDetailsAvatar").textContent = getInitials(blog.author);
        qs("#blogDetailsAuthor").textContent = blog.author;
        qs("#blogDetailsDate").textContent = formatDate(blog.createdAt);
        qs("#blogDetailsDescription").textContent = blog.description;
        qs("#blogDetailsContent").textContent = blog.content;
        qs("#blogDetailsTags").innerHTML = (blog.tags || [])
            .map((t) => `<span>#${escapeHtml(t)}</span>`)
            .join("");

        statusBox.style.display = "none";
        card.style.display = "block";
    }

    async function loadBlog() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("id");

        if (!id) {
            showStatus("⚠️", "No blog specified", "This link is missing a blog id.");
            return;
        }

        try {
            const data = await apiRequest(`/blogs/${encodeURIComponent(id)}`);
            renderBlog(data.blog);
        } catch (err) {
            showStatus("🔍", "Blog not found", err.message || "This blog post may have been removed.");
        }
    }

    loadBlog();
}

/* -------------------------------------------------------------------------
   9. Dashboard page
   ------------------------------------------------------------------------- */
function initDashboardPage() {
    const dashboardRoot = qs("#dashboardShell");
    if (!dashboardRoot) return;

    const session = requireAuth();
    if (!session) return;
    const { user } = session;

    qsa(".user-name-slot").forEach((el) => (el.textContent = user.name.split(" ")[0]));
    const avatarSlot = qs("#sidebarAvatar");
    if (avatarSlot) {
        avatarSlot.textContent = user.name
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
    }
    const emailSlot = qs("#sidebarEmail");
    if (emailSlot) emailSlot.textContent = user.email;

    const logoutBtn = qs("#sidebarLogout");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);

    function renderStats(blogs) {
        const published = blogs.filter((b) => b.status === "published");
        const drafts = blogs.filter((b) => b.status === "draft");
        const totalViews = blogs.reduce((sum, b) => sum + (b.views || 0), 0);

        qs("#statTotalBlogs").textContent = blogs.length;
        qs("#statPublished").textContent = published.length;
        qs("#statDrafts").textContent = drafts.length;
        qs("#statViews").textContent = totalViews;
    }

    function renderTable(blogs) {
        const tableBody = qs("#myBlogsTableBody");
        const emptyState = qs("#dashboardEmptyState");
        const tableWrap = qs("#myBlogsTableWrap");

        if (blogs.length === 0) {
            tableWrap.style.display = "none";
            emptyState.style.display = "block";
            return;
        }

        tableWrap.style.display = "block";
        emptyState.style.display = "none";

        tableBody.innerHTML = blogs
            .map(
                (blog) => `
                <tr>
                    <td>${escapeHtml(blog.title)}</td>
                    <td>${escapeHtml(blog.category)}</td>
                    <td>${formatDate(blog.createdAt)}</td>
                    <td><span class="status-badge ${blog.status}">${blog.status}</span></td>
                    <td>
                        <div class="table-actions">
                            <button type="button" class="icon-btn edit-btn" data-id="${blog.id}" title="Edit" aria-label="Edit ${escapeHtml(blog.title)}">✎</button>
                            <button type="button" class="icon-btn delete-btn" data-id="${blog.id}" title="Delete" aria-label="Delete ${escapeHtml(blog.title)}">🗑</button>
                        </div>
                    </td>
                </tr>
            `
            )
            .join("");

        qsa(".edit-btn", tableBody).forEach((btn) => {
            btn.addEventListener("click", () => {
                window.location.href = `create-blog.html?edit=${btn.dataset.id}`;
            });
        });

        qsa(".delete-btn", tableBody).forEach((btn) => {
            btn.addEventListener("click", async () => {
                const blog = blogs.find((b) => String(b.id) === btn.dataset.id);
                if (!blog) return;
                const confirmed = window.confirm(`Delete "${blog.title}"? This cannot be undone.`);
                if (!confirmed) return;

                try {
                    await apiRequest(`/blogs/${btn.dataset.id}`, { method: "DELETE", auth: true });
                    showToast("Blog deleted successfully.", "success");
                    loadMyBlogs();
                } catch (err) {
                    showToast(err.message || "Could not delete this blog.", "error");
                }
            });
        });
    }

    async function loadMyBlogs() {
        try {
            const data = await apiRequest("/blogs/my-blogs", { auth: true });
            const blogs = data.blogs || [];
            renderStats(blogs);
            renderTable(blogs);
        } catch (err) {
            if (err.message !== "Session expired.") {
                showToast(err.message || "Could not load your blogs.", "error");
            }
        }
    }

    consumeFlashMessage();
    loadMyBlogs();
}

/* -------------------------------------------------------------------------
   10. Create Blog page
   ------------------------------------------------------------------------- */
function initCreateBlogPage() {
    const form = qs("#createBlogForm");
    if (!form) return;

    const session = requireAuth();
    if (!session) return;
    const { user } = session;

    const CONTENT_LIMIT = 2000;

    const titleInput = qs("#blogTitle");
    const categoryInput = qs("#blogCategory");
    const authorInput = qs("#blogAuthor");
    const imageInput = qs("#blogImage");
    const descriptionInput = qs("#blogDescription");
    const contentInput = qs("#blogContent");
    const tagsInput = qs("#blogTags");
    const charCounter = qs("#charCounter");

    // Author is always the logged-in user — the server enforces this too,
    // taking the author from the JWT rather than anything sent here.
    authorInput.value = user.name;

    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    let editingBlogId = null;

    async function loadBlogForEditing() {
        try {
            const data = await apiRequest(`/blogs/${editId}`);
            const blog = data.blog;

            if (!blog || blog.authorId !== user.id) {
                showToast("You can only edit your own blogs.", "error");
                window.location.href = "dashboard.html";
                return;
            }

            editingBlogId = blog.id;
            qs("#formTitle").textContent = "Edit Blog";
            qs("#formSubtitle").textContent = "Update your post below and save your changes.";
            titleInput.value = blog.title;
            categoryInput.value = blog.category;
            imageInput.value = blog.image || "";
            descriptionInput.value = blog.description;
            contentInput.value = blog.content;
            tagsInput.value = (blog.tags || []).join(", ");
            const statusRadio = qs(`input[name="publishStatus"][value="${blog.status}"]`);
            if (statusRadio) statusRadio.checked = true;
            updateCharCounter();
        } catch (err) {
            showToast(err.message || "Could not load this blog for editing.", "error");
            window.location.href = "dashboard.html";
        }
    }

    if (editId) {
        loadBlogForEditing();
    }

    function updateCharCounter() {
        const length = contentInput.value.length;
        charCounter.textContent = `${length} / ${CONTENT_LIMIT} characters`;
        charCounter.classList.remove("limit-near", "limit-over");
        if (length > CONTENT_LIMIT) {
            charCounter.classList.add("limit-over");
        } else if (length > CONTENT_LIMIT * 0.85) {
            charCounter.classList.add("limit-near");
        }
    }

    contentInput.addEventListener("input", updateCharCounter);
    updateCharCounter();

    function validateFields() {
        let isValid = true;

        const requiredFields = [
            { input: titleInput, errorId: "#blogTitleError", message: "Blog title is required." },
            { input: categoryInput, errorId: "#blogCategoryError", message: "Please choose a category." },
            { input: descriptionInput, errorId: "#blogDescriptionError", message: "Short description is required." },
            { input: contentInput, errorId: "#blogContentError", message: "Blog content is required." },
        ];

        requiredFields.forEach(({ input, errorId, message }) => {
            const errorEl = qs(errorId);
            if (!input.value.trim()) {
                setFieldError(input, errorEl, message);
                isValid = false;
            } else {
                setFieldError(input, errorEl, "");
            }
        });

        if (contentInput.value.length > CONTENT_LIMIT) {
            setFieldError(contentInput, qs("#blogContentError"), `Content must be under ${CONTENT_LIMIT} characters.`);
            isValid = false;
        }

        return isValid;
    }

    function collectFormData(status) {
        const tags = tagsInput.value
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);

        return {
            title: titleInput.value.trim(),
            category: categoryInput.value,
            image: imageInput.value.trim(),
            description: descriptionInput.value.trim(),
            content: contentInput.value.trim(),
            tags,
            status,
        };
    }

    async function persistBlog(status) {
        const blogData = collectFormData(status);

        if (editingBlogId) {
            return apiRequest(`/blogs/${editingBlogId}`, { method: "PUT", body: blogData, auth: true });
        }
        return apiRequest("/blogs", { method: "POST", body: blogData, auth: true });
    }

    // Preview button — shows exactly what the reader would see
    const previewBtn = qs("#previewBlogBtn");
    if (previewBtn) {
        previewBtn.addEventListener("click", () => {
            if (!validateFields()) {
                showToast("Please complete the required fields before previewing.", "error");
                return;
            }
            openBlogPreview({
                ...collectFormData("draft"),
                author: user.name,
                createdAt: new Date().toISOString(),
            });
        });
    }

    // Save as Draft
    const saveDraftBtn = qs("#saveDraftBtn");
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener("click", async () => {
            if (!titleInput.value.trim()) {
                setFieldError(titleInput, qs("#blogTitleError"), "Give your draft a title before saving.");
                return;
            }
            if (!categoryInput.value || !descriptionInput.value.trim() || !contentInput.value.trim()) {
                showToast("Fill in category, description and content before saving.", "error");
                return;
            }

            saveDraftBtn.disabled = true;
            try {
                await persistBlog("draft");
                setFlashMessage("Draft saved successfully.", "success");
                window.location.href = "dashboard.html";
            } catch (err) {
                if (err.message !== "Session expired.") {
                    showToast(err.message || "Could not save this draft.", "error");
                }
            } finally {
                saveDraftBtn.disabled = false;
            }
        });
    }

    // Publish
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!validateFields()) {
            showToast("Please fix the highlighted fields.", "error");
            return;
        }

        const publishBtn = qs('button[type="submit"]', form);
        publishBtn.disabled = true;

        try {
            await persistBlog("published");
            setFlashMessage("Blog published successfully!", "success");
            window.location.href = "dashboard.html";
        } catch (err) {
            if (err.message !== "Session expired.") {
                showToast(err.message || "Could not publish this blog.", "error");
            }
        } finally {
            publishBtn.disabled = false;
        }
    });

    // Cancel — return to dashboard without saving
    const cancelBtn = qs("#cancelBlogBtn");
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            window.location.href = "dashboard.html";
        });
    }
}

/* -------------------------------------------------------------------------
   11. Boot: run the relevant initializers once the DOM is ready
   ------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    initMobileNav();
    markActiveNavLink();
    renderAuthAwareNav();
    consumeFlashMessage();

    initHomeBlogSection();
    initBlogDetailsPage();
    initLoginPage();
    initRegisterPage();
    initDashboardPage();
    initCreateBlogPage();
});
