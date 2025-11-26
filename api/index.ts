import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverless from "serverless-http";
import express from "express";
import { registerRoutes } from "../server/vista/routes";
import { serveStatic } from "../server/vite";
import { errorHandler } from "../server/middleware/errorHandler";

// Construimos una app Express para Vercel Function
const app = express();
// No aplicar express.json global: payments webhook usa raw body
app.use(express.urlencoded({ extended: false }));

(async () => {
  // Montar rutas API y errores
  const server = await registerRoutes(app);
  app.use(errorHandler);
  // Servir estáticos preconstruidos (SPA)
  serveStatic(app);
})();

const handler = serverless(app);

export default async function (req: VercelRequest, res: VercelResponse) {
  return handler(req as any, res as any);
}

