/**
 * jsonStore.js
 *
 * Small helper around Node's fs module for reading and writing the
 * JSON "database" files (data/users.json, data/blogs.json).
 *
 * Module 2 intentionally uses flat JSON files instead of a real database
 * (see README.md → "Why JSON files?"). To keep that approach safe, writes
 * for the same file are queued one after another instead of running in
 * parallel, so two requests arriving at nearly the same time can't
 * interleave and corrupt the file.
 */

const fs = require("fs");
const path = require("path");

// One queue (a running Promise chain) per file path, so writes to
// users.json and blogs.json never block each other, but writes to the
// SAME file always happen one at a time, in order.
const writeQueues = new Map();

function getQueue(filePath) {
    if (!writeQueues.has(filePath)) {
        writeQueues.set(filePath, Promise.resolve());
    }
    return writeQueues.get(filePath);
}

/**
 * Read and parse a JSON file. Returns `fallback` if the file is missing
 * or contains invalid JSON, instead of crashing the server.
 */
function readJson(filePath, fallback = []) {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
            return fallback;
        }
        const raw = fs.readFileSync(filePath, "utf-8");
        if (!raw.trim()) return fallback;
        return JSON.parse(raw);
    } catch (err) {
        console.error(`Failed to read JSON file at ${filePath}:`, err.message);
        return fallback;
    }
}

/**
 * Write data to a JSON file safely: writes to a temporary file first,
 * then renames it over the real file. A rename is atomic on the same
 * filesystem, so a crash mid-write can't leave a half-written file behind.
 *
 * Queued per file path so concurrent requests don't race each other.
 */
function writeJson(filePath, data) {
    const task = () =>
        new Promise((resolve, reject) => {
            const tempPath = path.join(
                path.dirname(filePath),
                `.${path.basename(filePath)}.tmp`
            );
            fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf-8", (writeErr) => {
                if (writeErr) return reject(writeErr);
                fs.rename(tempPath, filePath, (renameErr) => {
                    if (renameErr) return reject(renameErr);
                    resolve(data);
                });
            });
        });

    const nextInQueue = getQueue(filePath).then(task, task);
    // Keep the queue alive even if this particular write fails
    writeQueues.set(filePath, nextInQueue.catch(() => {}));
    return nextInQueue;
}

module.exports = { readJson, writeJson };
