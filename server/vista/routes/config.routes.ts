import type { Router } from "express";
import { systemConfigsStorage } from "../../negocio/storage/systemConfigsStorage";
import { insertSystemConfigSchema, User } from "@shared/schema";
import { z } from "zod";
import { asyncRoute, isAdmin } from "./middleware";

// Rutas relacionadas con configuracin del sistema
export function registerConfigRoutes(router: Router) {
  // GET /api/config - todas las configuraciones
  router.get('/config', asyncRoute(async (_req, res) => {
    const configs = await systemConfigsStorage.getAllSystemConfig();
    res.json(configs);
  }));

  // GET /api/config/:key - una configuración
  router.get('/config/:key', asyncRoute(async (req, res) => {
    const config = await systemConfigsStorage.getSystemConfig(req.params.key);
    if (!config) return res.status(404).json({ message: 'Configuración no encontrada' });
    res.json(config);
  }));

  // PUT /api/config/:key - actualizar valor
  router.put('/config/:key', isAdmin, asyncRoute(async (req, res) => {
    const { value } = req.body as { value?: string };
    if (!value) return res.status(400).json({ message: 'Se requiere un valor' });
    const userId = (req.user as User).id;
    const updated = await systemConfigsStorage.updateSystemConfig(req.params.key, value, userId);
    if (!updated) return res.status(404).json({ message: 'Configuración no encontrada' });
    res.json(updated);
  }));

  // POST /api/config - crear nueva configuración (uso desarrolladores)
  router.post('/config', isAdmin, asyncRoute(async (req, res) => {
    try {
      const userId = (req.user as User).id;
      const parsed = insertSystemConfigSchema.parse({ ...req.body, updatedBy: userId });
      const newConfig = await systemConfigsStorage.createSystemConfig(parsed);
      res.status(201).json(newConfig);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: 'Datos inválidos', errors: e.errors });
      if ((e as any).code === '23505') return res.status(409).json({ message: 'La clave de configuración ya existe' });
      throw e;
    }
  }));
}
