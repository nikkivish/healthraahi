import cors from "cors";
import { env } from "../config/env";

const allowedOrigins = env.corsOrigin
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
});
