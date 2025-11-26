import express, { type Express } from "express";
import path from "path";
import { registerRoutes } from "./vista/routes";
import { errorHandler } from "./middleware/errorHandler";
import { serveStatic } from "./vite";

export async function createApp(): Promise<Express> {
  const app = express();
  // No json global: el webhook usa raw
  app.use(express.urlencoded({ extended: false }));

  // uploads (nota: en Vercel no persiste)
  const uploadsDir = path.join(process.cwd(), "uploads");
  app.use("/uploads", express.static(uploadsDir, { index: false, fallthrough: false }));

  await registerRoutes(app);
  app.use(errorHandler);
  serveStatic(app);

  return app;
}

