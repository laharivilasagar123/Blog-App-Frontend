/**
 * blogModel.js (Module 3: MongoDB-backed)
 *
 * Same function names as the Module 2 JSON-file version (see
 * server/models/legacy-json/blogModel.js) so blogController.js barely had
 * to change — only the storage underneath is different now. Every
 * function is async because talking to MongoDB is asynchronous.
 */

const mongoose = require("mongoose");
const Blog = require("./schemas/Blog");

// Converts a Mongoose document (or a plain lean() object) into a plain
// object with a string "id" field, matching what the frontend expects.
function toPlainBlog(doc) {
    if (!doc) return null;
    const obj = doc.toObject ? doc.toObject() : doc;
    return {
        id: obj._id.toString(),
        title: obj.title,
        category: obj.category,
        description: obj.description,
        content: obj.content,
        tags: obj.tags || [],
        image: obj.image || "",
        authorId: obj.authorId,
        status: obj.status,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
    };
}

function isValidId(id) {
    return Boolean(id) && mongoose.Types.ObjectId.isValid(id);
}

async function getAllBlogs() {
    const blogs = await Blog.find().sort({ createdAt: -1 }).lean();
    return blogs.map(toPlainBlog);
}

async function getBlogById(id) {
    if (!isValidId(id)) return null;
    const blog = await Blog.findById(id).lean();
    return toPlainBlog(blog);
}

async function getBlogsByAuthorId(authorId) {
    const blogs = await Blog.find({ authorId }).sort({ createdAt: -1 }).lean();
    return blogs.map(toPlainBlog);
}

async function getPublishedBlogs() {
    const blogs = await Blog.find({ status: "published" }).sort({ createdAt: -1 }).lean();
    return blogs.map(toPlainBlog);
}

async function createBlog({ title, category, description, content, tags, authorId, status, image }) {
    const blog = await Blog.create({
        title,
        category,
        description,
        content,
        tags: Array.isArray(tags) ? tags : [],
        image: image || "",
        authorId,
        status: status === "draft" ? "draft" : "published",
    });
    return toPlainBlog(blog);
}

async function updateBlog(id, updates) {
    if (!isValidId(id)) return null;

    // authorId can never be changed through an update, no matter what's passed in
    const safeUpdates = { ...updates };
    delete safeUpdates.authorId;
    delete safeUpdates.id;
    delete safeUpdates._id;

    const blog = await Blog.findByIdAndUpdate(id, safeUpdates, { new: true, runValidators: true }).lean();
    return toPlainBlog(blog);
}

async function deleteBlog(id) {
    if (!isValidId(id)) return false;
    const result = await Blog.findByIdAndDelete(id);
    return Boolean(result);
}

module.exports = {
    getAllBlogs,
    getBlogById,
    getBlogsByAuthorId,
    getPublishedBlogs,
    createBlog,
    updateBlog,
    deleteBlog,
    isValidId,
};
