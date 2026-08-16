import app from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";

const startServer = async (): Promise<void> => {
  await connectDatabase();

  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port} (${env.nodeEnv})`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
