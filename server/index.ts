import express, { Response } from "express";
import { registerRoutes } from "./vista/routes";
import { registerProcessErrorHandlers } from "./negocio/logger";
import { errorHandler } from "./middleware/errorHandler";
import { log } from "./log";
// Importamos lazily vite helpers solo si los necesitamos en dev local
// (evita cargar rollup/optional deps en entorno serverless)
let setupVite: any = null;
let serveStatic: any = null;
try {
  // dinámico, no falla si el bundle de producción no incluye vite
  ({ setupVite, serveStatic } = await import("./vite"));
} catch {
  // ignoramos si no existe (p.ej. en serverless con build reducido)
}

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const requestPath = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;
    const originalResJson = res.json;
    res.json = function (bodyJson: any): Response {
      capturedJsonResponse = bodyJson;
      return originalResJson.call(res, bodyJson);
    } as any;
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (requestPath.startsWith("/api")) {
        let logLine = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
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
  registerProcessErrorHandlers();
  return app;
}

// Instancia única reutilizable
const app = createApp();
export { app };
export default app;

async function bootstrapStandalone() {
  // Si estamos en entorno serverless (Vercel) no levantamos listen; sólo preparamos rutas.
  const uploadsDir = path.join(process.cwd(), "uploads");
  app.use(
    "/uploads",
    express.static(uploadsDir, { index: false, fallthrough: false })
  );
  await registerRoutes(app);
  app.use(errorHandler);

  if (process.env.VERCEL) {
    // Vercel invocará la función handler (api/index.ts) y reutilizará esta app.
    log("App inicializada para entorno Vercel", "bootstrap");
    return;
  }

  // Modo standalone local: montar Vite en dev o estáticos en prod
  const server = await registerRoutes(app);
  app.use(errorHandler);

  const isDev = app.get("env") === "development" && setupVite;
  if (isDev) {
    await setupVite(app, server);
  } else if (serveStatic) {
    serveStatic(app);
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
  server.listen(
    { port, host: "0.0.0.0" },
    () => {
      log(`serving on port ${port}`, "bootstrap");
    }
  );
}

// Ejecutar sólo si este módulo es el entrypoint directo (node server/index.ts)
if (
  import.meta.url ===
  `file://${process.cwd().replace(/\\/g, "/")}/server/index.ts`
) {
  bootstrapStandalone().catch((e) => console.error("Fallo en bootstrap", e));
}
