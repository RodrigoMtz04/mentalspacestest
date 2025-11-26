import express from "express";
import { registerRoutes } from "./vista/routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { registerProcessErrorHandlers } from "./negocio/logger.ts";
import { errorHandler } from "./middleware/errorHandler.ts";

const app = express();
// Nota: NO aplicar express.json() global aquí, el webhook usa raw body.
app.use(express.urlencoded({ extended: false }));

// Logger simple de métricas
app.use((req, res, next) => {
  const start = Date.now();
  const p = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  const originalResJson = res.json as any;
  res.json = function (bodyJson: any) {
    capturedJsonResponse = bodyJson;
    return originalResJson.call(res, bodyJson);
  } as any;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (p.startsWith("/api")) {
      let logLine = `${req.method} ${p} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });
  next();
});

registerProcessErrorHandlers();

(async () => {
  const uploadsDir = path.join(process.cwd(), "uploads");
  app.use(
    "/uploads",
    express.static(uploadsDir, { index: false, fallthrough: false })
  );

  const server = await registerRoutes(app);
  app.use(errorHandler);

  if (app.get("env") === "development") {
    await setupVite(app, server);
    const port = 5000;
    server.listen({ port, host: "0.0.0.0" }, () => {
      log(`serving on port ${port}`);
    });
  } else {
    // En producción (Vercel), no se debe llamar listen(). El servidor será manejado por la Function.
    serveStatic(app);
  }
})();
