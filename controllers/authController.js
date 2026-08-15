/**
 * authController.js
 *
 * Handles user registration and login. Passwords are always hashed with
 * bcryptjs before being stored, and are never included in any response.
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10;

function signToken(user) {
    return jwt.sign(
        { id: user.id, name: user.name, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );
}

async function registerUser(req, res) {
    try {
        const { name, email, password } = req.body || {};

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Name is required." });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ success: false, message: "Email is required." });
        }
        if (!EMAIL_PATTERN.test(email.trim())) {
            return res.status(400).json({ success: false, message: "Enter a valid email address." });
        }
        if (!password) {
            return res.status(400).json({ success: false, message: "Password is required." });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
        }

        const existingUser = await userModel.findUserByEmail(email.trim());
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already registered" });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        await userModel.createUser({
            name: name.trim(),
            email: email.trim(),
            passwordHash,
        });

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
        });
    } catch (err) {
        // MongoDB's own unique index on email is a second line of defense in
        // case two registrations for the same email land at almost the same time.
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: "Email already registered" });
        }
        console.error("registerUser error:", err);
        return res.status(500).json({ success: false, message: "Something went wrong while registering. Please try again." });
    }
}

async function loginUser(req, res) {
    try {
        const { email, password } = req.body || {};

        if (!email || !email.trim() || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }

        const user = await userModel.findUserByEmail(email.trim());
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const token = signToken(user);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (err) {
        console.error("loginUser error:", err);
        return res.status(500).json({ success: false, message: "Something went wrong while logging in. Please try again." });
    }
}

module.exports = { registerUser, loginUser };
