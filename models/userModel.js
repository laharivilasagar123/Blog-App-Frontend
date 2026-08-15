/**
 * userModel.js (Module 3: MongoDB-backed)
 *
 * Same function names as the Module 2 JSON-file version (see
 * server/models/legacy-json/userModel.js) so authController.js barely had
 * to change — only the storage underneath is different now. Every
 * function is async because talking to MongoDB is asynchronous.
 */

const mongoose = require("mongoose");
const User = require("./schemas/User");

// Converts a Mongoose document (or a plain lean() object) into a plain
// object with a string "id" field, matching what the frontend expects.
function toPlainUser(doc) {
    if (!doc) return null;
    const obj = doc.toObject ? doc.toObject() : doc;
    return {
        id: obj._id.toString(),
        name: obj.name,
        email: obj.email,
        password: obj.password, // stripped out by toPublicUser() before ever leaving the server
        createdAt: obj.createdAt,
    };
}

async function getAllUsers() {
    const users = await User.find().lean();
    return users.map(toPlainUser);
}

async function findUserByEmail(email) {
    if (!email) return null;
    const user = await User.findOne({ email: email.toLowerCase().trim() }).lean();
    return toPlainUser(user);
}

async function findUserById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const user = await User.findById(id).lean();
    return toPlainUser(user);
}

/**
 * Creates a new user record in MongoDB.
 * `passwordHash` must already be a bcrypt hash — this model never hashes
 * or verifies passwords itself, that's the controller's job.
 */
async function createUser({ name, email, passwordHash }) {
    const user = await User.create({
        name,
        email: email.toLowerCase().trim(),
        password: passwordHash,
    });
    return toPlainUser(user);
}

// Strips the password hash before a user object is ever sent in a response
function toPublicUser(user) {
    if (!user) return null;
    const { password, ...publicUser } = user;
    return publicUser;
}

module.exports = {
    getAllUsers,
    findUserByEmail,
    findUserById,
    createUser,
    toPublicUser,
};
