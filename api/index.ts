// api/index.ts - resilient Vercel handler
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

let app: any;

const distPath = path.resolve(process.cwd(), "dist", "index.js");
if (fs.existsSync(distPath)) {
  // Preferimos el bundle compilado (generado por `npm run build` en la fase de build)
  app = (await import(pathToFileURL(distPath).href)).default;
} else {
  // Fallback: intentar cargar server/index.js (si el builder dejó un JS)
  const serverJs = path.resolve(process.cwd(), "server", "index.js");
  if (fs.existsSync(serverJs)) {
    app = (await import(pathToFileURL(serverJs).href)).default;
  } else {
    // No intentar importar archivos TypeScript en runtime (no estarán presentes en Vercel)
    const msg = "Could not find a compiled server bundle. Please run `npm run build` during the build step so that `dist/index.js` is available to the serverless runtime.";
    console.error(msg);
    throw new Error(msg);
  }
}

// Exportar un handler compatible con Vercel: una función (req,res) que delega en el Express app.
// Esto evita problemas donde el runtime esperaba una función y recibía un objeto `app`.
export default async function handler(req: any, res: any) {
  if (!app) {
    res.statusCode = 500;
    return res.end("Server not initialized");
  }

  // Si `app` es un handler ya (por ejemplo serverless-http), simplemente llamarlo.
  if (typeof app === "function") {
    return app(req, res);
  }

  // Si `app` es una instancia de Express, delegar la petición
  return app(req, res);
}
