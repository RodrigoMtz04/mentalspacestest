import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./vista/routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { registerProcessErrorHandlers } from "./negocio/logger.ts";
import { errorHandler } from "./middleware/errorHandler.ts";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson: any): Response {
    capturedJsonResponse = bodyJson;

    return originalResJson.call(res, bodyJson);
  } as any;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Registrar manejadores globales de errores del proceso
registerProcessErrorHandlers();

(async () => {
  // 1) Servir archivos subidos ANTES de registrar Vite o el catch-all
  const uploadsDir = path.join(process.cwd(), "uploads");
  app.use(
    "/uploads",
    express.static(uploadsDir, {
      index: false,
      fallthrough: false,
      // express.static ya maneja Content-Type adecuadamente
    })
  );

  // 2) Registrar rutas de la API
  const server = await registerRoutes(app);

  // 3) Manejador de errores JSON para la API (usa Winston + BD)
  app.use(errorHandler);

  // 4) Configurar Vite (dev) o estáticos (prod) DESPUÉS de montar '/uploads'
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // 5) Escuchar puerto
  const port = 5000;
  server.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
