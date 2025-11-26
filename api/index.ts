// Handler para Vercel: exporta la instancia de Express
// Importamos la app desde el bundle compilado (npm run build genera dist/index.js)
import app from "../dist/index.js";
export default app;
// Nota: El código en server/index.ts evita hacer listen si process.env.VERCEL está definido.
