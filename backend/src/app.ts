import express from "express";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import routes from "./routes";

const app = express();

app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
