import "dotenv/config";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.PORT = process.env.PORT || "5001";

const mongoServer = await MongoMemoryServer.create({
  binary: {
    version: "7.0.14",
  },
});

process.env.MONGODB_URI = mongoServer.getUri("digital-health-record-test");

export const stopMongoMemoryServer = async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
};
