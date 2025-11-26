import fs from "fs";
import path from "path";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");

// Permite forzar zona horaria via env: LOG_TZ o TZ (p.ej. "America/Mexico_City").
// Si no se define, usa la zona local del sistema.
const LOG_TZ = process.env.LOG_TZ || process.env.TZ;

// Formatter de timestamp en hora local del sistema (o TZ configurada)
const timestampLocal = winston.format.timestamp({
  format: () =>
    new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "short",
      // Sólo pasamos timeZone si viene desde env; evita cambiar comportamiento por defecto del sistema
      ...(LOG_TZ ? { timeZone: LOG_TZ } : {}),
    }).format(new Date()),
});

const isProd = process.env.NODE_ENV === "production";
const isVercel = !!process.env.VERCEL;

const transports: winston.transport[] = [];

if (isProd && isVercel) {
  transports.push(new winston.transports.Console({ level: "info" }));
} else {
  transports.push(new winston.transports.Console({ level: "debug" }));
}

export const logger = winston.createLogger({
  level: isProd ? "info" : "debug",
  format: winston.format.combine(
    timestampLocal,
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      dirname: logsDir,
      filename: "app-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "30d",
      zippedArchive: true,
      level: "info",
    }),
    new DailyRotateFile({
      dirname: logsDir,
      filename: "error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "30d",
      zippedArchive: true,
      level: "error",
    }),
  ],
});

// Consola con colores para desarrollo
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      level,
      format: winston.format.combine(
        winston.format.colorize(),
        timestampLocal,
        winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
          const msg = stack || message;
          const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
          return `${timestamp} [${level}] ${msg}${rest}`;
        })
      ),
    })
  );
}

// Manejo global de errores no controlados
export function registerProcessErrorHandlers() {
  process.on("unhandledRejection", (reason: any, _promise) => {
    let message: string = "Unhandled Promise Rejection";
    let stack: string | undefined;

    if (reason instanceof Error) {
      message = reason.message || message;
      stack = reason.stack;
    } else if (typeof reason === 'string') {
      message = reason;
    } else if (reason && typeof reason === 'object') {
      try {
        message = JSON.stringify(reason);
      } catch {
        message = String(reason);
      }
    }

    logger.error("Unhandled Promise Rejection", {
      message,
      stack,
      reason: (() => {
        try { return JSON.stringify(reason); } catch { return String(reason); }
      })(),
    });
  });

  process.on("uncaughtException", (err: Error) => {
    logger.error("Uncaught Exception", { message: err.message, stack: err.stack });
    // En producción, después de loggear, salimos para evitar estado inconsistente
    if (process.env.NODE_ENV === "production") {
      setTimeout(() => process.exit(1), 250);
    }
  });
}

export function log(message: string, scope?: string) {
  if (scope) {
    logger.info(`[${scope}] ${message}`);
  } else {
    logger.info(message);
  }
}
