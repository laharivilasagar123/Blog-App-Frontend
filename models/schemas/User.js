/**
 * User.js (Mongoose schema)
 *
 * Represents a BlogSphere account. The `password` field always holds a
 * bcrypt hash — it is set by authController.js, never a plain-text value.
 */

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true, // enforced at the database level too, not just in the controller
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true, // this is a bcrypt hash, never plain text
        },
    },
    { timestamps: true } // adds createdAt / updatedAt automatically
);

module.exports = mongoose.model("User", userSchema);
