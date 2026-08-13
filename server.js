/**
 * server.js
 *
 * BlogSphere API — Module 2 (Backend Development)
 * Codomax Digital Solutions — Full Stack Web Development Internship
 *
 * A small Express server exposing REST APIs for registration, login, and
 * blog CRUD, backed by JSON files instead of a real database.
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");

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
   Catches: invalid JSON bodies, and anything next(err) is called with.
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

    console.error("Unhandled server error:", err);
    return res.status(500).json({
        success: false,
        message: "Internal server error. Please try again later.",
    });
});

app.listen(PORT, () => {
    console.log(`BlogSphere API is running on http://localhost:${PORT}`);
});
