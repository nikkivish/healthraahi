import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET"] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongodbUri: process.env.MONGODB_URI as string,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};
