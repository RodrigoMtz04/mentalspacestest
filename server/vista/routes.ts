import dotenv from "dotenv";
dotenv.config();

import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "../negocio/auth.ts";
import { registerDomainRoutes } from "./routes/registerDomainRoutes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configuración de sesión y autenticación
  setupAuth(app);

  const apiRouter = express.Router();
  // Importante: aplicar json solo en router para no interferir con webhook montado en app
  apiRouter.use(express.json());

  await registerDomainRoutes(apiRouter, app);

  app.use("/api", apiRouter);
  return createServer(app);
}
