import mongoose from "mongoose";

let mongoReady = false;

export function isMongoReady() {
  return mongoReady;
}

export async function connectMongoOptional() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.log("MongoDB not configured. Continuing without DB.");
    mongoReady = false;
    return;
  }

  try {
    await mongoose.connect(uri);
    mongoReady = true;
    console.log("MongoDB connected");
  } catch (err) {
    mongoReady = false;
    console.log("MongoDB connection failed. Continuing without DB.");
    console.log(String(err));
  }
}