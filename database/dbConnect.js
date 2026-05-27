const mongoose = require("mongoose");
require("dotenv").config();

const DB = process.env.MONGODB_URL;

const dbConnect = async () => {
  await mongoose
    .connect(DB)
    .then(() => {
      console.log("DB connected");
    })
    .catch((error) => {
      console.log(`${error} while connecting with db`);
    });
};

module.exports = dbConnect;
