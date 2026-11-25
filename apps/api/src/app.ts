import express from "express";
import errorHandler from "./middlewares/errorHandler";
import userRoutes from "./routes/user.route";
import contactRoutes from "./routes/contact.route";

/** Builds the Express app without connecting to the database or listening, so tests can use it directly. */
export function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/users", userRoutes);
  app.use("/api/contacts", contactRoutes);
  app.use(errorHandler);
  return app;
}
