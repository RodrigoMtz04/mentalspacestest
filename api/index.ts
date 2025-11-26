// Handler para Vercel: exporta la instancia de Express
export default app;
import app from "../server/index.ts";
// Asegúrate de que VERCEL esté definido en el entorno de despliegue para que server/index.ts no haga listen.

