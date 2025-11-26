import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Wrapper para manejar errores async y responder con JSON consistente
export function asyncRoute(handler: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch((err) => {
      if (err instanceof ZodError) {
        return res.status(400).json({
          message: 'Datos inválidos',
          errors: fromZodError(err).message,
        });
      }
      (err as any).status = (err as any).status || 500;
      next(err);
    });
  };
}

// Middleware: requiere autenticación
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'No autorizado' });
}

// Middleware: requiere rol admin
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated() && (req.user as any)?.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Acceso denegado' });
}

