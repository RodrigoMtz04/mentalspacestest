import { app } from "../server/index";
import { registerRoutes } from "../server/vista/routes";
import { errorHandler } from "../server/middleware/errorHandler";
let initialized = false;
async function init() {
  if (initialized) return;
  await registerRoutes(app);
  app.use(errorHandler);
  initialized = true;
}
await init();
export default app;
