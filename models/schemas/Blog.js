/**
 * Blog.js (Mongoose schema)
 *
 * Represents a blog post. `authorId` is stored as a string equal to the
 * owning User's _id — set from the verified JWT in blogController.js,
 * never from anything the client sends directly.
 */

const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        tags: {
            type: [String],
            default: [],
        },
        image: {
            type: String,
            default: "",
            trim: true,
        },
        authorId: {
            type: String,
            required: true,
            index: true, // frequently queried in getBlogsByAuthorId / my-blogs
        },
        status: {
            type: String,
            enum: ["draft", "published"],
            default: "published",
        },
    },
    { timestamps: true } // adds createdAt / updatedAt automatically
);

module.exports = mongoose.model("Blog", blogSchema);
