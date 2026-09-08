# BlogSphere – Full Stack Blog Application

## Internship

**Codomax Digital Solutions**
Full Stack Web Development Internship

## Module 1

**Frontend Development** (Day 1–4)

Technologies:
- HTML5
- CSS3
- JavaScript (Vanilla)

Module 1 delivered a fully responsive frontend for BlogSphere — Home, Login, Register,
Dashboard and Create Blog pages — originally backed by `localStorage`.

## Module 2

**Backend Development** (Day 5–8)

Technologies:
- Node.js
- Express.js
- REST API
- JWT (JSON Web Tokens)
- bcryptjs

Module 2 adds a real backend and connects it to the existing Module 1 frontend. The frontend's
`localStorage`-based auth and blog storage from Module 1 has been replaced with `fetch()` calls
to the new Express API — the pages, styling, and UX are unchanged.

## Features

- User registration (with hashed passwords)
- User login with JWT-based authentication
- JWT-protected routes for anything user-specific
- Create blog (title, category, description, content, tags, draft/published)
- View all published blogs (Home page)
- View only your own blogs (Dashboard)
- Edit blog (owner only)
- Delete blog (owner only)
- Full frontend ↔ backend integration via `fetch()`

## Project Architecture

BlogSphere is a **client/server** application:

```
BlogSphere/
│
├── client/                 Static frontend (HTML, CSS, vanilla JS)
│   ├── index.html          Home — fetches published blogs from the API
│   ├── login.html          Login — calls POST /api/auth/login
│   ├── register.html       Register — calls POST /api/auth/register
│   ├── dashboard.html      Dashboard — calls GET /api/blogs/my-blogs
│   ├── create-blog.html    Create/Edit — calls POST or PUT /api/blogs
│   ├── css/style.css
│   ├── js/script.js        All fetch() calls + UI logic live here
│   └── images/
│
├── server/                 Express REST API
│   ├── server.js           App entry point (Express setup, routes, error handling)
│   ├── package.json
│   ├── .env                Local environment variables (NOT committed)
│   ├── .env.example        Template for .env
│   ├── routes/              authRoutes.js, blogRoutes.js
│   ├── controllers/         authController.js, blogController.js
│   ├── models/               userModel.js, blogModel.js (JSON-file-backed)
│   ├── middleware/           authMiddleware.js (JWT verification)
│   └── data/                 users.json, blogs.json ("database" for Module 2)
│
├── .gitignore
└── README.md
```

The **client** is served independently as static files (e.g. via VS Code Live Server) and talks
to the **server** over HTTP using `fetch()`. They are two separate processes during development.

### Why JSON files instead of a database?

Module 2 intentionally stores data in `server/data/users.json` and `server/data/blogs.json`
instead of a real database, to keep the backend approachable at an intermediate level. Reads and
writes go through `server/utils/jsonStore.js`, which:

- Queues writes to the same file so two requests can't corrupt it by writing at the same time.
- Writes to a temporary file and renames it into place, so a crash mid-write can't leave a
  half-written JSON file behind.

This is fine for learning and local development, but it is **not** how a production app should
store data. See *Future Enhancements* below for what would replace it.

## API Endpoints

Base URL during local development: `http://localhost:5000/api`

All responses are JSON in the shape `{ "success": boolean, "message"?: string, ... }`.

---

### `GET /api/health`

Health check.

- **Auth required:** No
- **Response `200`:**
  ```json
  { "success": true, "message": "BlogSphere API is running" }
  ```

---

### `POST /api/auth/register`

Create a new account. Passwords are hashed with bcryptjs before being stored — never saved or
returned in plain text.

- **Auth required:** No
- **Request body:**
  ```json
  { "name": "Lahari", "email": "lahari@example.com", "password": "password123" }
  ```
- **Response `201`:**
  ```json
  { "success": true, "message": "User registered successfully" }
  ```
- **Possible errors:**
  - `400` — missing name / email / password, invalid email format, password under 6 characters
  - `400` — `{ "success": false, "message": "Email already registered" }`
  - `500` — unexpected server error

---

### `POST /api/auth/login`

Authenticate and receive a JWT.

- **Auth required:** No
- **Request body:**
  ```json
  { "email": "lahari@example.com", "password": "password123" }
  ```
- **Response `200`:**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "JWT_TOKEN",
    "user": { "id": 1, "name": "Lahari", "email": "lahari@example.com" }
  }
  ```
- **Possible errors:**
  - `400` — missing email or password
  - `401` — `{ "success": false, "message": "Invalid email or password" }`
  - `500` — unexpected server error

---

### `GET /api/blogs`

List all **published** blogs, newest first. Used by the Home page.

- **Auth required:** No
- **Response `200`:**
  ```json
  { "success": true, "blogs": [ { "id": 1, "title": "...", "author": "Lahari", "...": "..." } ] }
  ```

---

### `GET /api/blogs/:id`

Get a single blog by id (any status — used for the Edit form and blog previews).

- **Auth required:** No
- **Response `200`:** `{ "success": true, "blog": { ... } }`
- **Possible errors:** `404` — `{ "success": false, "message": "Blog not found." }`

---

### `GET /api/blogs/my-blogs`

List every blog (draft and published) belonging to the logged-in user. Used by the Dashboard.

- **Auth required:** **Yes** — `Authorization: Bearer <token>`
- **Response `200`:** `{ "success": true, "blogs": [ ... ] }`
- **Possible errors:** `401` — missing/invalid/expired token

---

### `POST /api/blogs`

Create a new blog post. The author is always taken from the verified JWT — the client cannot
choose who a post is attributed to.

- **Auth required:** **Yes** — `Authorization: Bearer <token>`
- **Request body:**
  ```json
  {
    "title": "Introduction to Web Development",
    "category": "Technology",
    "description": "A beginner-friendly introduction to web development.",
    "content": "Web development is...",
    "tags": ["HTML", "CSS", "JavaScript"],
    "status": "published"
  }
  ```
- **Response `201`:**
  ```json
  {
    "success": true,
    "message": "Blog created successfully",
    "blog": {
      "id": 1,
      "title": "Introduction to Web Development",
      "category": "Technology",
      "description": "A beginner-friendly introduction.",
      "content": "Web development is...",
      "tags": ["HTML", "CSS", "JavaScript"],
      "authorId": 1,
      "author": "Lahari",
      "status": "published",
      "createdAt": "2026-08-12T10:00:00.000Z"
    }
  }
  ```
- **Possible errors:**
  - `400` — missing title / category / description / content
  - `401` — missing/invalid/expired token
  - `500` — unexpected server error

---

### `PUT /api/blogs/:id`

Update a blog. Owner only.

- **Auth required:** **Yes** — `Authorization: Bearer <token>`
- **Request body:** any subset of `title`, `category`, `description`, `content`, `tags`, `status`
- **Response `200`:** `{ "success": true, "message": "Blog updated successfully", "blog": { ... } }`
- **Possible errors:**
  - `400` — a provided field was emptied out (e.g. blank title)
  - `401` — missing/invalid/expired token
  - `403` — `{ "success": false, "message": "You are not allowed to modify this blog." }`
  - `404` — blog not found

---

### `DELETE /api/blogs/:id`

Delete a blog. Owner only.

- **Auth required:** **Yes** — `Authorization: Bearer <token>`
- **Response `200`:** `{ "success": true, "message": "Blog deleted successfully" }`
- **Possible errors:**
  - `401` — missing/invalid/expired token
  - `403` — `{ "success": false, "message": "You are not allowed to delete this blog." }`
  - `404` — blog not found

## Installation

```bash
cd server
npm install
npm run dev
```

`npm run dev` uses **nodemon** to restart the server automatically on file changes.
`npm start` runs it once with plain Node, for production-style use.

## Running the Application

**Backend** — from the `server/` folder:

```bash
npm run dev
```

The API starts at **http://localhost:5000**. Visit `http://localhost:5000/api/health` to confirm
it's running.

**Frontend** — open the `client/` folder in VS Code and right-click `index.html` →
**Open with Live Server** (or any static file server). The frontend calls the API at
`http://localhost:5000/api` — make sure the backend is running first.

> Both must be running at the same time during development: the backend on port 5000, the
> frontend on whatever port Live Server assigns (typically 5500).

## Environment Variables

The server reads configuration from `server/.env` (not committed — see `.gitignore`). Copy the
template to get started:

```bash
cd server
cp .env.example .env
```

| Variable          | Purpose                                               | Example                         |
|--------------------|--------------------------------------------------------|----------------------------------|
| `PORT`             | Port the Express server listens on                     | `5000`                          |
| `JWT_SECRET`        | Secret key used to sign/verify JWTs — keep this private | `a_long_random_string`          |
| `JWT_EXPIRES_IN`    | How long a login session/token stays valid              | `7d`                             |
| `CLIENT_ORIGIN`     | Origin allowed by CORS to call this API                 | `http://127.0.0.1:5500`         |

**Never commit a real `.env` file.** `.env` is listed in `.gitignore`; only `.env.example` (with
placeholder values) is committed.

### CORS

The server uses the `cors` package, restricted to `CLIENT_ORIGIN` from the `.env` file, so only
the frontend's own origin (e.g. Live Server on `http://127.0.0.1:5500`) can call the API from a
browser during local development. If your Live Server uses a different port, update
`CLIENT_ORIGIN` in `.env` to match.

## Testing

The API was designed to be tested with **Postman** (or any REST client, e.g. Insomnia, Thunder
Client). Suggested test sequence:

1. `GET /api/health` → confirm the server responds
2. `POST /api/auth/register` → create a user
3. `POST /api/auth/register` again with the same email → confirm `400 Email already registered`
4. `POST /api/auth/login` with the correct password → confirm you receive a token
5. `POST /api/auth/login` with the wrong password → confirm `401 Invalid email or password`
6. `POST /api/blogs` without an `Authorization` header → confirm `401`
7. `POST /api/blogs` with a valid `Bearer` token → confirm `201` and the blog is created
8. `GET /api/blogs` → confirm the new published blog appears
9. `GET /api/blogs/my-blogs` with your token → confirm it lists only your blogs
10. `GET /api/blogs/:id` → confirm a single blog loads
11. `PUT /api/blogs/:id` as the owner → confirm it updates
12. `PUT /api/blogs/:id` (or `DELETE`) using a **different** user's token → confirm `403 Forbidden`
13. `DELETE /api/blogs/:id` as the owner → confirm it's removed
14. In the browser: log out from the Dashboard → confirm the token is cleared and you're
    redirected to Login

## Security Notes

- Passwords are hashed with **bcryptjs** before being stored — plain-text passwords are never
  written to disk or returned in any API response.
- Authentication uses **JWT**, verified on every protected route by `authMiddleware.js`.
- The blog author is always derived from the verified token (`req.user.id`), never from anything
  the client sends — so a user can't claim someone else's identity when creating a post.
- Editing or deleting a blog checks blog ownership server-side and returns `403 Forbidden`
  otherwise — this can't be bypassed from the frontend.
- The JWT secret lives in `.env` and is never hardcoded or committed.
- The frontend stores only the JWT and basic user info (`id`, `name`, `email`) in browser
  storage — never a password.

This is still a **learning project**. Token revocation, refresh tokens, rate limiting, and
production-grade secret management are out of scope for Module 2 — see below.

## Future Enhancements

- Replace JSON file storage with a real database (MySQL / PostgreSQL / MongoDB)
- Production-grade authentication (refresh tokens, rate limiting, account lockout)
- Image upload for featured images (instead of a URL field)
- Comments on blog posts
- Likes / reactions
- Public user profile pages
- An admin panel for content moderation
- Cloud deployment (e.g. Render/Railway for the API, Netlify/Vercel for the static frontend)
