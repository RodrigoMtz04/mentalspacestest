import { logger } from "../negocio/logger";

// Pequeña prueba para validar timestamp local en logs
logger.info("Logger smoke test - info", { test: true });
logger.error("Logger smoke test - error", { test: true });

console.log("Smoke logs escritos. Revisa la carpeta logs/");

