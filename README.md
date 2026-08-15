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

Module 2 added a real backend and connected it to the existing Module 1 frontend. The
`localStorage`-based auth and blog storage from Module 1 was replaced with `fetch()` calls to a
new Express API, initially backed by JSON files.

## Module 3

**Database Integration** (Day 9+)

Technologies:
- MongoDB
- Mongoose (ODM)

Module 3 replaces the JSON-file storage from Module 2 with **MongoDB**, using Mongoose schemas
for users and blogs. The API surface, request/response shapes, JWT authentication, and the
existing frontend pages are unchanged — only what's underneath the API changed. This module also
adds a dedicated **Blog Details** page (`client/blog-details.html`) so a reader can open a full
post instead of only seeing it in a preview card.

## Features

- User registration (bcrypt-hashed passwords, stored in MongoDB)
- User login with JWT-based authentication
- JWT-protected routes for anything user-specific
- Create blog (title, category, description, content, tags, draft/published) — stored in MongoDB
- View all published blogs (Home page)
- View a single blog's full details (new Blog Details page)
- View only your own blogs (Dashboard)
- Edit blog (owner only)
- Delete blog (owner only)
- Full frontend ↔ backend integration via `fetch()`

## Project Architecture

BlogSphere is a **client/server** application:

```
BlogSphere/
│
├── client/                      Static frontend (HTML, CSS, vanilla JS)
│   ├── index.html               Home — fetches published blogs from the API
│   ├── login.html               Login — calls POST /api/auth/login
│   ├── register.html            Register — calls POST /api/auth/register
│   ├── dashboard.html           Dashboard — calls GET /api/blogs/my-blogs
│   ├── create-blog.html         Create/Edit — calls POST or PUT /api/blogs
│   ├── blog-details.html        NEW (Module 3) — calls GET /api/blogs/:id
│   ├── css/style.css
│   ├── js/script.js             All fetch() calls + UI logic live here
│   └── images/
│
├── server/                      Express REST API
│   ├── server.js                App entry point (connects to MongoDB, then starts Express)
│   ├── package.json
│   ├── .env                     Local environment variables (NOT committed)
│   ├── .env.example             Template for .env
│   ├── config/
│   │   └── db.js                NEW (Module 3) — Mongoose connection handling
│   ├── routes/                   authRoutes.js, blogRoutes.js (unchanged from Module 2)
│   ├── controllers/               authController.js, blogController.js (now async, MongoDB-backed)
│   ├── models/
│   │   ├── schemas/               NEW (Module 3) — User.js, Blog.js (Mongoose schemas)
│   │   ├── userModel.js           NEW (Module 3) — MongoDB-backed, same function names as Module 2
│   │   ├── blogModel.js           NEW (Module 3) — MongoDB-backed, same function names as Module 2
│   │   └── legacy-json/           Module 2's original JSON-file models, kept for reference/rollback
│   ├── middleware/
│   │   └── authMiddleware.js      JWT verification (unchanged from Module 2)
│   ├── utils/
│   │   └── jsonStore.js           Module 2's JSON helper — no longer used, kept for reference
│   └── data/
│       ├── users.json             Module 2's JSON "database" — no longer used, kept for reference
│       └── blogs.json             Module 2's JSON "database" — no longer used, kept for reference
│
├── .gitignore
└── README.md
```

The **client** is served independently as static files (e.g. via VS Code Live Server) and talks
to the **server** over HTTP using `fetch()`. They are two separate processes during development.

### Why does `server/data/` and `legacy-json/` still exist?

Per the Module 3 requirements, the Module 2 JSON-file storage was **not deleted** — it's kept
around until the MongoDB implementation has been verified working end to end (see *Testing*
below). `server/models/legacy-json/userModel.js` and `blogModel.js` are the original Module 2
data-access functions; they are no longer imported anywhere in the running app, but they're left
in place as a safety net and a reference. Once you've confirmed MongoDB works, `server/data/`,
`server/utils/jsonStore.js`, and `server/models/legacy-json/` can all be safely deleted.

## Database Structure

MongoDB stores two collections, defined by Mongoose schemas in `server/models/schemas/`.

### `users` collection (`schemas/User.js`)

| Field       | Type     | Notes                                             |
|-------------|----------|------------------------------------------------------|
| `_id`       | ObjectId | Generated automatically by MongoDB                    |
| `name`      | String   | Required                                              |
| `email`     | String   | Required, **unique** (enforced by a MongoDB index), lowercased |
| `password`  | String   | Required — a **bcrypt hash**, never plain text        |
| `createdAt` | Date     | Added automatically (`timestamps: true`)               |
| `updatedAt` | Date     | Added automatically (`timestamps: true`)               |

### `blogs` collection (`schemas/Blog.js`)

| Field         | Type       | Notes                                                    |
|----------------|------------|--------------------------------------------------------------|
| `_id`          | ObjectId   | Generated automatically by MongoDB                            |
| `title`        | String     | Required                                                      |
| `category`     | String     | Required                                                      |
| `description`  | String     | Required — short summary shown on blog cards                  |
| `content`      | String     | Required — the full post body                                 |
| `tags`         | [String]   | Defaults to `[]`                                               |
| `image`        | String     | Optional featured-image URL, defaults to `""`                  |
| `authorId`     | String     | The owning user's `_id` as a string — set from the JWT, never the client |
| `status`       | String     | `"draft"` or `"published"` (default `"published"`)             |
| `createdAt`    | Date       | Added automatically (`timestamps: true`)                        |
| `updatedAt`    | Date       | Added automatically (`timestamps: true`)                        |

**Note on ids:** blog and user ids are now MongoDB `ObjectId`s (24-character hex strings, e.g.
`"64f1a2b3c4d5e6f7a8b9c0d1"`) instead of the small sequential integers used in Module 2's JSON
files. The API always returns these as plain strings in an `id` field, and the frontend treats
`id` as an opaque string throughout — nothing in the client assumes it's a number.

## API Endpoints

Base URL during local development: `http://localhost:5000/api`

All responses are JSON in the shape `{ "success": boolean, "message"?: string, ... }`. The
endpoints, methods, and response shapes are unchanged from Module 2 — only the underlying storage
(and the format of `id` values) is different.

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

Create a new account. Passwords are hashed with bcryptjs before being stored in MongoDB — never
saved or returned in plain text.

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
  - `400` — `{ "success": false, "message": "Email already registered" }` (checked in the
    controller, and backed by a unique index in MongoDB as a second line of defense)
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
    "user": { "id": "64f1a2b3c4d5e6f7a8b9c0d1", "name": "Lahari", "email": "lahari@example.com" }
  }
  ```
- **Possible errors:**
  - `400` — missing email or password
  - `401` — `{ "success": false, "message": "Invalid email or password" }`
  - `500` — unexpected server error

---

### `GET /api/blogs`

List all **published** blogs from MongoDB, newest first. Used by the Home page.

- **Auth required:** No
- **Response `200`:**
  ```json
  { "success": true, "blogs": [ { "id": "64f1...", "title": "...", "author": "Lahari", "...": "..." } ] }
  ```

---

### `GET /api/blogs/:id`

Get a single blog by id (any status — used for the Edit form and the new Blog Details page).
`:id` must be a valid MongoDB ObjectId.

- **Auth required:** No
- **Response `200`:** `{ "success": true, "blog": { ... } }`
- **Possible errors:**
  - `404` — `{ "success": false, "message": "Blog not found." }` (also returned for a
    malformed/invalid id, rather than a server error)

---

### `GET /api/blogs/my-blogs`

List every blog (draft and published) belonging to the logged-in user. Used by the Dashboard.

- **Auth required:** **Yes** — `Authorization: Bearer <token>`
- **Response `200`:** `{ "success": true, "blogs": [ ... ] }`
- **Possible errors:** `401` — missing/invalid/expired token

---

### `POST /api/blogs`

Create a new blog post in MongoDB. The author is always taken from the verified JWT — the client
cannot choose who a post is attributed to.

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
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "title": "Introduction to Web Development",
      "category": "Technology",
      "description": "A beginner-friendly introduction.",
      "content": "Web development is...",
      "tags": ["HTML", "CSS", "JavaScript"],
      "authorId": "64f1a2b3c4d5e6f7a8b9c0aa",
      "author": "Lahari",
      "status": "published",
      "createdAt": "2026-08-12T10:00:00.000Z",
      "updatedAt": "2026-08-12T10:00:00.000Z"
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
- **Request body:** any subset of `title`, `category`, `description`, `content`, `tags`, `status`, `image`
- **Response `200`:** `{ "success": true, "message": "Blog updated successfully", "blog": { ... } }`
- **Possible errors:**
  - `400` — a provided field was emptied out (e.g. blank title), or the id is malformed
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

## MongoDB Setup

You need a MongoDB connection string before the server will start — it refuses to boot without
one (see `server/config/db.js`). Either option below works:

### Option A — MongoDB Atlas (cloud, no local install)

1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**, create a database user with a username and password.
3. Under **Network Access**, add your current IP address (or `0.0.0.0/0` for local development
   only — not recommended for production).
4. Click **Connect → Drivers**, copy the connection string, and swap in your database user's
   username/password and a database name, e.g.:
   ```
   mongodb+srv://<username>:<password>@<cluster-url>/blogsphere?retryWrites=true&w=majority
   ```

### Option B — Local MongoDB

1. Install MongoDB Community Server for your OS.
2. Start it (e.g. `mongod` or via your OS's service manager).
3. Use this connection string:
   ```
   mongodb://127.0.0.1:27017/blogsphere
   ```

Either way, MongoDB creates the `blogsphere` database and its collections automatically the first
time data is written — there's no separate "create database" step.

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

If `MONGODB_URI` is missing or MongoDB can't be reached, the server logs a clear error and exits
instead of starting in a broken state — check `server/.env` first if this happens. Once
connected, the API starts at **http://localhost:5000**. Visit `http://localhost:5000/api/health`
to confirm it's running.

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

| Variable          | Purpose                                                | Example                                                    |
|--------------------|------------------------------------------------------------|------------------------------------------------------------|
| `PORT`             | Port the Express server listens on                          | `5000`                                                      |
| `JWT_SECRET`        | Secret key used to sign/verify JWTs — keep this private      | `a_long_random_string`                                      |
| `JWT_EXPIRES_IN`    | How long a login session/token stays valid                    | `7d`                                                         |
| `CLIENT_ORIGIN`     | Origin allowed by CORS to call this API                        | `http://127.0.0.1:5500`                                     |
| `MONGODB_URI`       | **NEW (Module 3)** — MongoDB connection string                  | `mongodb://127.0.0.1:27017/blogsphere` or an Atlas SRV URI  |

**Never commit a real `.env` file** — it's listed in `.gitignore`, and in particular
`MONGODB_URI` often contains a database password. Only `.env.example` (with placeholder values)
is committed.

### CORS

The server uses the `cors` package, restricted to `CLIENT_ORIGIN` from the `.env` file, so only
the frontend's own origin (e.g. Live Server on `http://127.0.0.1:5500`) can call the API from a
browser during local development. If your Live Server uses a different port, update
`CLIENT_ORIGIN` in `.env` to match.

## Testing

The API was designed to be tested with **Postman** (or any REST client, e.g. Insomnia, Thunder
Client), and the pages should also be exercised directly in the browser. Suggested sequence for
Module 3:

1. `GET /api/health` → confirm the server responds, and check the terminal log for
   `MongoDB connected: ...`
2. `POST /api/auth/register` → create a user; confirm a new document appears in the `users`
   collection (e.g. via MongoDB Compass or Atlas's Collections view) with a hashed `password`
3. `POST /api/auth/register` again with the same email → confirm `400 Email already registered`
4. `POST /api/auth/login` with the correct password → confirm you receive a token and a
   MongoDB-style `id` (24-character hex string)
5. `POST /api/auth/login` with the wrong password → confirm `401 Invalid email or password`
6. `POST /api/blogs` without an `Authorization` header → confirm `401`
7. `POST /api/blogs` with a valid `Bearer` token → confirm `201`, and confirm a new document
   appears in the `blogs` collection with the correct `authorId`
8. `GET /api/blogs` → confirm the new published blog appears
9. `GET /api/blogs/my-blogs` with your token → confirm it lists only your blogs
10. `GET /api/blogs/:id` with a real id → confirm the full blog loads
11. `GET /api/blogs/:id` with a made-up id (e.g. `000000000000000000000000`) → confirm `404`,
    not a `500` crash
12. `PUT /api/blogs/:id` as the owner → confirm it updates, and `updatedAt` changes
13. `PUT /api/blogs/:id` (or `DELETE`) using a **different** user's token → confirm `403 Forbidden`
14. `DELETE /api/blogs/:id` as the owner → confirm it's removed from the `blogs` collection
15. In the browser: open the Home page, click **Read More** on a published post → confirm
    `blog-details.html?id=...` loads and shows the full title, category, author, date,
    description, content, and tags
16. In the browser: log out from the Dashboard → confirm the token is cleared and you're
    redirected to Login

Only remove the Module 2 JSON-file fallback (`server/data/`, `server/utils/jsonStore.js`,
`server/models/legacy-json/`) after all of the above pass.

## Security Notes

- Passwords are hashed with **bcryptjs** before being stored in MongoDB — plain-text passwords
  are never written or returned in any API response.
- Authentication uses **JWT**, verified on every protected route by `authMiddleware.js`.
- The blog author is always derived from the verified token (`req.user.id`), never from anything
  the client sends — so a user can't claim someone else's identity when creating a post.
- Editing or deleting a blog checks blog ownership server-side and returns `403 Forbidden`
  otherwise — this can't be bypassed from the frontend.
- Emails are enforced unique both in the controller logic and by a MongoDB index, so a race
  condition between two near-simultaneous registrations still can't create duplicate accounts.
- The MongoDB connection string and JWT secret both live in `.env` and are never hardcoded or
  committed.
- The frontend stores only the JWT and basic user info (`id`, `name`, `email`) in browser
  storage — never a password.

This is still a **learning project**. Token revocation, refresh tokens, rate limiting, and
production-grade secret/credential management are out of scope for Module 3 — see below.

## Future Enhancements

- Production-grade authentication (refresh tokens, rate limiting, account lockout)
- Image upload for featured images (instead of a URL field), e.g. with cloud storage
- Comments on blog posts
- Likes / reactions
- Public user profile pages
- An admin panel for content moderation
- Cloud deployment (e.g. Render/Railway for the API + MongoDB Atlas, Netlify/Vercel for the
  static frontend)
