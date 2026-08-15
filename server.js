/**
 * server.js
 *
 * BlogSphere API — Module 3 (Database Integration)
 * Codomax Digital Solutions — Full Stack Web Development Internship
 *
 * A small Express server exposing REST APIs for registration, login, and
 * blog CRUD, backed by MongoDB (see config/db.js and models/schemas/).
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const blogRoutes = require("./routes/blogRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

/* ---------------------------------------------------------------------
   Core middleware
   --------------------------------------------------------------------- */

// Allow the frontend (served separately, e.g. via VS Code Live Server) to
// call this API during local development.
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";
app.use(
    cors({
        origin: CLIENT_ORIGIN,
    })
);

app.use(express.json());

/* ---------------------------------------------------------------------
   Routes
   --------------------------------------------------------------------- */

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "BlogSphere API is running",
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/blogs", blogRoutes);

/* ---------------------------------------------------------------------
   404 handler — any request that didn't match a route above
   --------------------------------------------------------------------- */
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
});

/* ---------------------------------------------------------------------
   Centralized error handler
   Catches: invalid JSON bodies, Mongoose validation/cast errors, and
   anything next(err) is called with.
   Must be defined last, and must take exactly 4 arguments for Express to
   recognize it as an error handler.
   --------------------------------------------------------------------- */
app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON in request body.",
        });
    }

    // Mongoose schema validation failed (e.g. a required field was missing)
    if (err.name === "ValidationError") {
        const firstMessage = Object.values(err.errors)[0]?.message || "Invalid data.";
        return res.status(400).json({ success: false, message: firstMessage });
    }

    // Mongoose couldn't cast a value to the expected type (e.g. a malformed ObjectId)
    if (err.name === "CastError") {
        return res.status(400).json({ success: false, message: "Invalid id format." });
    }

    // MongoDB duplicate-key error (e.g. the unique email index)
    if (err.code === 11000) {
        return res.status(400).json({ success: false, message: "That value is already in use." });
    }

    console.error("Unhandled server error:", err);
    return res.status(500).json({
        success: false,
        message: "Internal server error. Please try again later.",
    });
});

/* ---------------------------------------------------------------------
   Start: connect to MongoDB first, then start accepting requests.
   --------------------------------------------------------------------- */
async function startServer() {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`BlogSphere API is running on http://localhost:${PORT}`);
    });
}

startServer();
