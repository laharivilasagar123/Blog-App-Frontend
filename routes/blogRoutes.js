/**
 * blogRoutes.js
 *
 * POST   /api/blogs             (auth required)
 * GET    /api/blogs
 * GET    /api/blogs/my-blogs    (auth required)
 * GET    /api/blogs/:id
 * PUT    /api/blogs/:id         (auth required, owner only)
 * DELETE /api/blogs/:id         (auth required, owner only)
 */

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
    createBlog,
    getBlogs,
    getBlogById,
    getMyBlogs,
    updateBlog,
    deleteBlog,
} = require("../controllers/blogController");

// NOTE: /my-blogs must be declared before /:id, otherwise Express would
// treat "my-blogs" as a value for the :id parameter.
router.get("/my-blogs", authMiddleware, getMyBlogs);

router.post("/", authMiddleware, createBlog);
router.get("/", getBlogs);
router.get("/:id", getBlogById);
router.put("/:id", authMiddleware, updateBlog);
router.delete("/:id", authMiddleware, deleteBlog);

module.exports = router;
