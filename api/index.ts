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
  // Fallback: intentar cargar server/index.js (si el builder lo dejó) o ../server/index
  const serverJs = path.resolve(process.cwd(), "server", "index.js");
  if (fs.existsSync(serverJs)) {
    app = (await import(pathToFileURL(serverJs).href)).default;
  } else {
    try {
      app = (await import("../server/index")).default;
    } catch (err) {
      console.error("No se pudo importar app desde dist ni server/index:", err);
      throw err;
    }
  }
}

export default app;
