const mongoose = require("mongoose");
require("dotenv").config();

const DB = process.env.MONGODB_URL;

const dbConnect = async () => {
  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(DB, {
      serverSelectionTimeoutMS: 30000,
    });

    console.log("DB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
  }
};

mongoose.connection.on("connected", () => {
  console.log("MongoDB Connected");
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB Disconnected");
});

mongoose.connection.on("error", (err) => {
  console.log("MongoDB Error:", err);
});

module.exports = dbConnect;