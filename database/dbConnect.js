const mongoose = require("mongoose");
require("dotenv").config();

const DB = process.env.MONGODB_URL;

const dbConnect = async () => {
  console.log('Connecting to DB...');
  await mongoose
    .connect(DB, {
      serverSelectionTimeoutMS: 30000,
    })
    .then(() => {
      console.log("DB connected");
    })
    .catch((error) => {
      console.log(`${error} while connecting with db`);
    });
};

module.exports = dbConnect;
