/**
 * blogModel.js
 *
 * Simple "model" for blog posts, backed by server/data/blogs.json instead
 * of a real database.
 */

const path = require("path");
const { readJson, writeJson } = require("../utils/jsonStore");

const BLOGS_FILE = path.join(__dirname, "..", "data", "blogs.json");

function getAllBlogs() {
    return readJson(BLOGS_FILE, []);
}

function saveAllBlogs(blogs) {
    return writeJson(BLOGS_FILE, blogs);
}

function getBlogById(id) {
    const blogs = getAllBlogs();
    return blogs.find((b) => b.id === id);
}

function getBlogsByAuthorId(authorId) {
    const blogs = getAllBlogs();
    return blogs.filter((b) => b.authorId === authorId);
}

function getPublishedBlogs() {
    const blogs = getAllBlogs();
    return blogs.filter((b) => b.status === "published");
}

async function createBlog({ title, category, description, content, tags, authorId, status, image }) {
    const blogs = getAllBlogs();

    const newBlog = {
        id: blogs.length > 0 ? Math.max(...blogs.map((b) => b.id)) + 1 : 1,
        title,
        category,
        description,
        content,
        tags: Array.isArray(tags) ? tags : [],
        image: image || "",
        authorId,
        status: status === "draft" ? "draft" : "published",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    blogs.unshift(newBlog);
    await saveAllBlogs(blogs);
    return newBlog;
}

async function updateBlog(id, updates) {
    const blogs = getAllBlogs();
    const index = blogs.findIndex((b) => b.id === id);
    if (index === -1) return null;

    blogs[index] = {
        ...blogs[index],
        ...updates,
        id: blogs[index].id, // id and authorId can never be overwritten by an update
        authorId: blogs[index].authorId,
        updatedAt: new Date().toISOString(),
    };

    await saveAllBlogs(blogs);
    return blogs[index];
}

async function deleteBlog(id) {
    const blogs = getAllBlogs();
    const index = blogs.findIndex((b) => b.id === id);
    if (index === -1) return false;

    blogs.splice(index, 1);
    await saveAllBlogs(blogs);
    return true;
}

module.exports = {
    getAllBlogs,
    getBlogById,
    getBlogsByAuthorId,
    getPublishedBlogs,
    createBlog,
    updateBlog,
    deleteBlog,
};
