// api/index.ts - resilient Vercel handler
// Reemplazado para importar la app directamente desde el código fuente (server/index)
import app from "../server/index";

// Exportamos la app (Express) como handler para Vercel.
// Vercel @vercel/node aceptará una función (req,res) o una app de express.
export default app as any;
