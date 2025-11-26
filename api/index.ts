import { app } from "../server/index.ts";
import { registerRoutes } from "../server/vista/routes.ts";
import { errorHandler } from "../server/middleware/errorHandler.ts";
let initialized = false;
async function init() {
  if (initialized) return;
  await registerRoutes(app);
  app.use(errorHandler);
  initialized = true;
}
await init();
export default app;
