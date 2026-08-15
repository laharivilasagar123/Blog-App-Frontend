/**
 * db.js
 *
 * Handles the MongoDB connection using Mongoose. Called once from
 * server.js before the Express app starts listening.
 */
const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require("mongoose");

async function connectDB() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        console.error(
            "MONGODB_URI is not set. Copy server/.env.example to server/.env and fill in your MongoDB connection string."
        );
        process.exit(1);
    }

    // Fail fast instead of hanging if MongoDB is unreachable
    mongoose.set("strictQuery", true);

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 8000,
        });
        console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
    } catch (err) {
        console.error("MongoDB connection failed:", err.message);
        console.error(
            "Check that MONGODB_URI in server/.env is correct and that your IP is allowed to access the cluster (Atlas Network Access) or that your local mongod is running."
        );
        process.exit(1);
    }

    mongoose.connection.on("error", (err) => {
        console.error("MongoDB connection error after initial connect:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
        console.warn("MongoDB disconnected.");
    });
}

module.exports = connectDB;
