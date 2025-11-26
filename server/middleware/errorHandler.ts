import type { Request, Response, NextFunction } from "express";
import { logger } from "../negocio/logger.ts";
import { systemLogsStorage } from "../negocio/storage/systemLogsStorage.ts";

export async function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  // Manejo específico de errores de Multer
  if (err && (err.code === 'LIMIT_FILE_SIZE' || err.name === 'MulterError')) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'El archivo excede el tamaño máximo de 5MB.'
      : (err.message || 'Error al subir archivo.');
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ message });
  }
  if (err && /Formato no permitido/i.test(err.message || '')) {
    return res.status(400).json({ message: err.message });
  }

  const status = err.status || err.statusCode || 500;
  const severity = status >= 500 ? "CRITICAL" : "ERROR";

  // Log a archivos/console
  logger.error(err.message || "Internal Server Error", {
    status,
    endpoint: req.originalUrl,
    userId: (req as any).user?.id,
    method: req.method,
    stack: err.stack,
    userAgent: req.headers["user-agent"],
  });

  // Intentar persistir en BD (no bloquear la respuesta)
  try {
    await systemLogsStorage.createLog({
      severity: severity as any,
      message: err.message || "Internal Server Error",
      stack: String(err.stack || ""),
      endpoint: req.originalUrl,
      userId: (req as any).user?.id,
      userAgent: String(req.headers["user-agent"] || ""),
      url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
    });
  } catch (e) {
    // Evitar que un fallo de BD rompa el flujo
    logger.warn("No se pudo persistir el log en BD", { error: (e as Error).message });
  }

  res.status(status).json({ message: err.message || "Internal Server Error" });
}
