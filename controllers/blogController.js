/**
 * blogController.js (Module 3: MongoDB-backed)
 *
 * Handles creating, reading, updating and deleting blog posts.
 * The author of a blog is always taken from the authenticated JWT user
 * (req.user), never from anything the client sends in the request body.
 *
 * Blog ids are now MongoDB ObjectId strings (e.g. "64f1a2b3c4d5e6f7a8b9c0d1")
 * instead of the small integers used in the Module 2 JSON-file version, so
 * route params are used as-is instead of being run through Number().
 */

const blogModel = require("../models/blogModel");
const userModel = require("../models/userModel");

async function attachAuthorName(blog) {
    if (!blog) return blog;
    const author = await userModel.findUserById(blog.authorId);
    return { ...blog, author: author ? author.name : "Unknown Author" };
}

async function attachAuthorNames(blogs) {
    return Promise.all(blogs.map(attachAuthorName));
}

async function createBlog(req, res) {
    try {
        const { title, category, description, content, tags, status, image } = req.body || {};

        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: "Blog title is required." });
        }
        if (!category || !category.trim()) {
            return res.status(400).json({ success: false, message: "Category is required." });
        }
        if (!description || !description.trim()) {
            return res.status(400).json({ success: false, message: "Short description is required." });
        }
        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, message: "Blog content is required." });
        }

        const newBlog = await blogModel.createBlog({
            title: title.trim(),
            category: category.trim(),
            description: description.trim(),
            content: content.trim(),
            tags: Array.isArray(tags) ? tags : [],
            image: typeof image === "string" ? image.trim() : "",
            authorId: req.user.id, // taken from the verified JWT — never trust the client for this
            status,
        });

        return res.status(201).json({
            success: true,
            message: "Blog created successfully",
            blog: await attachAuthorName(newBlog),
        });
    } catch (err) {
        console.error("createBlog error:", err);
        return res.status(500).json({ success: false, message: "Something went wrong while creating the blog." });
    }
}

async function getBlogs(req, res) {
    try {
        const blogs = await blogModel.getPublishedBlogs();
        return res.status(200).json({ success: true, blogs: await attachAuthorNames(blogs) });
    } catch (err) {
        console.error("getBlogs error:", err);
        return res.status(500).json({ success: false, message: "Something went wrong while fetching blogs." });
    }
}

async function getBlogById(req, res) {
    try {
        const { id } = req.params;
        const blog = await blogModel.getBlogById(id);

        if (!blog) {
            return res.status(404).json({ success: false, message: "Blog not found." });
        }

        return res.status(200).json({ success: true, blog: await attachAuthorName(blog) });
    } catch (err) {
        console.error("getBlogById error:", err);
        return res.status(500).json({ success: false, message: "Something went wrong while fetching the blog." });
    }
}

async function getMyBlogs(req, res) {
    try {
        const blogs = await blogModel.getBlogsByAuthorId(req.user.id);
        return res.status(200).json({ success: true, blogs: await attachAuthorNames(blogs) });
    } catch (err) {
        console.error("getMyBlogs error:", err);
        return res.status(500).json({ success: false, message: "Something went wrong while fetching your blogs." });
    }
}

async function updateBlog(req, res) {
    try {
        const { id } = req.params;
        const existingBlog = await blogModel.getBlogById(id);

        if (!existingBlog) {
            return res.status(404).json({ success: false, message: "Blog not found." });
        }

        if (existingBlog.authorId !== req.user.id) {
            return res.status(403).json({ success: false, message: "You are not allowed to modify this blog." });
        }

        const { title, category, description, content, tags, status, image } = req.body || {};

        if (title !== undefined && !title.trim()) {
            return res.status(400).json({ success: false, message: "Blog title cannot be empty." });
        }
        if (description !== undefined && !description.trim()) {
            return res.status(400).json({ success: false, message: "Short description cannot be empty." });
        }
        if (content !== undefined && !content.trim()) {
            return res.status(400).json({ success: false, message: "Blog content cannot be empty." });
        }

        const updates = {};
        if (title !== undefined) updates.title = title.trim();
        if (category !== undefined) updates.category = category.trim();
        if (description !== undefined) updates.description = description.trim();
        if (content !== undefined) updates.content = content.trim();
        if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
        if (image !== undefined) updates.image = image.trim();
        if (status !== undefined) updates.status = status === "draft" ? "draft" : "published";

        const updatedBlog = await blogModel.updateBlog(id, updates);

        return res.status(200).json({
            success: true,
            message: "Blog updated successfully",
            blog: await attachAuthorName(updatedBlog),
        });
    } catch (err) {
        console.error("updateBlog error:", err);
        return res.status(500).json({ success: false, message: "Something went wrong while updating the blog." });
    }
}

async function deleteBlog(req, res) {
    try {
        const { id } = req.params;
        const existingBlog = await blogModel.getBlogById(id);

        if (!existingBlog) {
            return res.status(404).json({ success: false, message: "Blog not found." });
        }

        if (existingBlog.authorId !== req.user.id) {
            return res.status(403).json({ success: false, message: "You are not allowed to delete this blog." });
        }

        await blogModel.deleteBlog(id);

        return res.status(200).json({ success: true, message: "Blog deleted successfully" });
    } catch (err) {
        console.error("deleteBlog error:", err);
        return res.status(500).json({ success: false, message: "Something went wrong while deleting the blog." });
    }
}

module.exports = {
    createBlog,
    getBlogs,
    getBlogById,
    getMyBlogs,
    updateBlog,
    deleteBlog,
};
