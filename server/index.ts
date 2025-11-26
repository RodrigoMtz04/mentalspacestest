import express, { Response } from "express";
import cors from "cors";
import path from "path";
import { registerRoutes } from "./vista/routes";
import { registerProcessErrorHandlers } from "./negocio/logger";
import { errorHandler } from "./middleware/errorHandler";
import { log } from "./log";
// Importamos lazily vite helpers solo si los necesitamos en dev local
// (evita cargar rollup/optional deps en entorno serverless)
let setupVite: any = null;
let serveStatic: any = null;
// No importar aquí al cargar el módulo para evitar que Vite/Rollup se carguen en producción.
async function loadViteIfNeeded() {
  try {
    // Cargamos solo en desarrollo o cuando explícitamente se necesite
    if (process.env.NODE_ENV === "development" || process.env.REPL_ID !== undefined) {
      const mod = await import("./vite");
      setupVite = mod.setupVite;
      serveStatic = mod.serveStatic;
    }
  } catch (e) {
    // No hacemos fail en producción; dejamos setupVite/serveStatic en null
    console.warn("Vite helpers not available:", (e as Error).message || e);
  }
}

export function createApp() {
  const app = express();
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        if (process.env.DEBUG_RAW_BODY === "1") {
          try {
            req.rawBody = buf.toString("utf8");
            console.log("DEBUG_RAW_BODY", req.method, req.path, req.rawBody);
          } catch (e) {
            console.warn("DEBUG_RAW_BODY: failed to capture raw body", e);
          }
        }
      },
    }),
  );
  app.use(express.urlencoded({ extended: false }));

  // Habilitar CORS para permitir llamadas desde el cliente en dev (preflight OPTIONS incluidas)
  // Permitimos credenciales (cookies/sesiones) y Content-Type JSON
  app.use(
    cors({
      origin: (origin, callback) => {
        // Aceptar la mayoría de orígenes en desarrollo. En producción restringir a dominios válidos.
        callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      preflightContinue: false,
    }),
  );

  // Asegurar respuesta a preflight OPTIONS para todas las rutas (evita 405 en algunos entornos)
  app.options("*", cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    preflightContinue: false,
  }));

  // Middleware explícito para forzar cabeceras CORS y responder OPTIONS rápidamente.
  app.use((req, res, next) => {
    const origin = req.headers.origin || "*";
    // Cuando se usan credenciales no se puede usar '*', devolvemos el origin recibido
    res.setHeader("Access-Control-Allow-Origin", origin === "*" ? "*" : origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    next();
  });

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
  console.log('bootstrapStandalone: comenzando inicialización');
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

  // Cargar helpers de vite solo si se necesita (evita cargar rollup en producción)
  await loadViteIfNeeded();
  const isDev = app.get("env") === "development" && typeof setupVite === "function";
  if (isDev) {
    await setupVite(app, server);
  } else if (typeof serveStatic === "function") {
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
const entrypoint1 = `file://${process.cwd().replace(/\\/g, "/")}/server/index.ts`;
const entrypoint2 = `file:///${process.cwd().replace(/\\/g, "/")}/server/index.ts`;
if (import.meta.url === entrypoint1 || import.meta.url === entrypoint2) {
  bootstrapStandalone().catch((e) => console.error("Fallo en bootstrap", e));
}
