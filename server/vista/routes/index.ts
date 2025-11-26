import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { registerDomainRoutes } from "./registerDomainRoutes";
import { setupAuth } from "../../negocio/auth";

// Punto de entrada de rutas de la carpeta `routes/`.
// Si en algún lugar del proyecto se importa `./vista/routes/index`,
// esta función expondrá el mismo contrato que `registerRoutes` del archivo padre.
export async function registerRoutes(app: Express): Promise<Server> {
  // Garantizar auth inicial
  setupAuth(app);
  const apiRouter = express.Router();

  // Delegamos el registro de rutas por dominio (rooms, bookings, users, payments, etc.)
  await registerDomainRoutes(apiRouter, app);

  app.use("/api", apiRouter);
  return createServer(app);
}
