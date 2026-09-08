/**
 * authMiddleware.js
 *
 * Protects routes that require a logged-in user. Reads the JWT from the
 * Authorization header, verifies it, and attaches the decoded (safe, no
 * password) user info to req.user for downstream controllers to use.
 */

const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authentication required. Please log in and try again.",
        });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication required. Please log in and try again.",
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Only ever attach the safe fields a token was signed with —
        // never a password, even if one somehow ended up in the payload.
        req.user = {
            id: decoded.id,
            name: decoded.name,
            email: decoded.email,
        };
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired session. Please log in again.",
        });
    }
}

module.exports = authMiddleware;
