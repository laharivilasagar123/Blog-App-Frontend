/**
 * userModel.js
 *
 * Simple "model" for users, backed by server/data/users.json instead of a
 * real database. Every function returns/accepts plain JavaScript objects.
 */

const path = require("path");
const { readJson, writeJson } = require("../utils/jsonStore");

const USERS_FILE = path.join(__dirname, "..", "data", "users.json");

function getAllUsers() {
    return readJson(USERS_FILE, []);
}

function saveAllUsers(users) {
    return writeJson(USERS_FILE, users);
}

function findUserByEmail(email) {
    const users = getAllUsers();
    return users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
}

function findUserById(id) {
    const users = getAllUsers();
    return users.find((u) => u.id === id);
}

/**
 * Creates a new user record and appends it to users.json.
 * `passwordHash` must already be a bcrypt hash — this model never hashes
 * or verifies passwords itself, that's the controller's job.
 */
async function createUser({ name, email, passwordHash }) {
    const users = getAllUsers();

    const newUser = {
        id: users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1,
        name,
        email,
        password: passwordHash,
        createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    await saveAllUsers(users);
    return newUser;
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
