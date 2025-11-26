import type { Router } from "express";
import { db } from "../../persistencia/db";
import { users, bookings, insertUserSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { asyncRoute, isAuthenticated, isAdmin } from "./middleware";
import type { User as AppUser } from "@shared/schema";
import multer from "multer";
import fs from "fs";
import path from "path";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { userStorage } from "../../negocio/storage/userStorage";
import { bookingStorage } from "../../negocio/storage/bookingStorage";

// Configuración de uploads (solo para creación/actualización de usuarios)
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const storageMulter = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = String(file.originalname || 'file').replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const upload = multer({
  storage: storageMulter,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const imageMimes = ["image/jpeg","image/jpg","image/png"];
    const docMimes = ["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    const allowed = new Set(["profileImage","identification","diploma"]);
    if (!allowed.has(file.fieldname)) return cb(new Error("Campo de archivo no permitido"));
    if (file.fieldname === 'profileImage' && !imageMimes.includes(file.mimetype)) return cb(new Error("Formato inválido para imagen de perfil"));
    if ((file.fieldname === 'identification' || file.fieldname === 'diploma') && ![...imageMimes, ...docMimes].includes(file.mimetype)) return cb(new Error("Formato inválido para documento"));
    cb(null, true);
  }
});

export function registerUserRoutes(router: Router) {
  // Listado básico público (sanitizado) - reemplaza antiguo /users y /users/public
  router.get("/users", asyncRoute(async (_req, res) => {
    const result = await db.select().from(users);
    const sanitized = result.map(({ password, ...u }) => u as any);
    res.json(sanitized);
  }));

  router.get("/users/public", isAuthenticated, asyncRoute(async (_req, res) => {
    const result = await db.select().from(users);
    const publicUsers = result.map(u => ({
      id: u.id,
      fullName: u.fullName,
      professionalType: u.professionalType,
      isActive: u.isActive,
    }));
    res.json(publicUsers);
  }));

  // Reservas de un usuario
  router.get("/users/:userId/bookings", asyncRoute(async (req, res) => {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) return res.status(400).json({ message: "ID de usuario inválido" });
    const userBookings = await db.select().from(bookings).where(eq(bookings.userId, userId));
    res.json(userBookings);
  }));

  // Crear usuario (admin) con multipart
  router.post('/users', isAdmin, upload.any(), asyncRoute(async (req, res) => {
    try {
      const filesArr = (req as any).files as any[] || [];
      const files: Record<string, any[]> = filesArr.reduce((acc, f) => {
        acc[f.fieldname] = acc[f.fieldname] || []; acc[f.fieldname].push(f); return acc;
      }, {} as Record<string, any[]>);
      const raw = req.body || {};
      const coerceBool = (v: any) => typeof v === 'string' ? v === 'true' : Boolean(v);
      const coerceNum = (v: any) => (v === undefined || v === null || v === '' ? undefined : Number(v));
      const baseData: any = {
        username: raw.username,
        password: raw.password,
        fullName: raw.fullName,
        role: raw.role,
        email: raw.email,
        phone: raw.phone ?? undefined,
        specialty: raw.specialty ?? undefined,
        bio: raw.bio ?? undefined,
        profileImageUrl: raw.profileImageUrl ?? undefined,
        isActive: raw.isActive !== undefined ? coerceBool(raw.isActive) : undefined,
        paymentStatus: raw.paymentStatus ?? undefined,
        professionalType: raw.professionalType ?? undefined,
        professionalTypeDetails: raw.professionalTypeDetails ?? undefined,
        professionalLicense: raw.professionalLicense ?? undefined,
        bookingCount: coerceNum(raw.bookingCount),
      };
      if (files?.profileImage?.[0]) baseData.profileImageUrl = `/uploads/${files.profileImage[0].filename}`;
      if (files?.identification?.[0]) baseData.identificationUrl = `/uploads/${files.identification[0].filename}`; else if (raw.identificationUrl) baseData.identificationUrl = raw.identificationUrl;
      if (files?.diploma?.[0]) baseData.diplomaUrl = `/uploads/${files.diploma[0].filename}`; else if (raw.diplomaUrl) baseData.diplomaUrl = raw.diplomaUrl;
      const userData = insertUserSchema.parse(baseData);
      const existing = await userStorage.getUserByUsername(userData.username);
      if (existing) return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
      const newUser = await userStorage.createUser(userData);
      const { password, ...userResp } = newUser as any;
      res.status(201).json(userResp);
    } catch (e) {
      if (e instanceof ZodError) return res.status(400).json({ message: 'Datos de usuario inválidos', errors: fromZodError(e).message });
      throw e;
    }
  }));

  // Obtener usuario específico (autenticado dueño o admin)
  router.get('/users/:id', isAuthenticated, asyncRoute(async (req, res) => {
    const userId = parseInt(req.params.id); if (isNaN(userId)) return res.status(400).json({ message: 'ID inválido' });
    const current = req.user as AppUser;
    if (current.id !== userId && current.role !== 'admin') return res.status(403).json({ message: 'No autorizado' });
    const user = await userStorage.getUser(userId); if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    const { password, ...safe } = user; res.json(safe);
  }));

  // Actualizar usuario
  router.patch('/users/:id', isAuthenticated, asyncRoute(async (req, res) => {
    const userId = parseInt(req.params.id); if (isNaN(userId)) return res.status(400).json({ message: 'ID inválido' });
    const current = req.user as AppUser;
    if (current.id !== userId && current.role !== 'admin') return res.status(403).json({ message: 'No autorizado' });
    const user = await userStorage.getUser(userId); if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (req.body.role && current.role !== 'admin') delete req.body.role;
    if (req.body.password) delete req.body.password; // cambio de contraseña separado
    const updated = await userStorage.updateUser(userId, req.body);
    if (!updated) return res.status(500).json({ message: 'Error al actualizar' });
    const { password, ...safe } = updated; res.json(safe);
  }));

  // Cambiar contraseña
  router.post('/users/:id/change-password', isAuthenticated, asyncRoute(async (req, res) => {
    const userId = parseInt(req.params.id); if (isNaN(userId)) return res.status(400).json({ message: 'ID inválido' });
    const current = req.user as AppUser; if (current.id !== userId && current.role !== 'admin') return res.status(403).json({ message: 'No autorizado' });
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Se requiere contraseña actual y nueva' });
    if (current.id === userId) {
      const user = await userStorage.getUser(userId); if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
      if (user.password !== currentPassword) return res.status(400).json({ message: 'Contraseña actual incorrecta' });
    }
    const updated = await userStorage.updateUser(userId, { password: newPassword } as any);
    if (!updated) return res.status(500).json({ message: 'Error al cambiar contraseña' });
    res.json({ message: 'Contraseña actualizada correctamente' });
  }));

  // Subida de documentos
  router.post('/users/:id/documents', isAuthenticated, upload.fields([
    { name: 'identification', maxCount: 1 },
    { name: 'diploma', maxCount: 1 },
  ]), asyncRoute(async (req, res) => {
    const targetId = parseInt(req.params.id); if (isNaN(targetId)) return res.status(400).json({ message: 'ID inválido' });
    const current = req.user as AppUser; if (current.id !== targetId && current.role !== 'admin') return res.status(403).json({ message: 'No autorizado' });
    const files = (req as any).files as Record<string, any[]>;
    const toUpdate: any = {};
    if (files?.identification?.[0]) toUpdate.identificationUrl = `/uploads/${files.identification[0].filename}`;
    if (files?.diploma?.[0]) toUpdate.diplomaUrl = `/uploads/${files.diploma[0].filename}`;
    if (!toUpdate.identificationUrl && !toUpdate.diplomaUrl) return res.status(400).json({ message: 'No se subieron archivos válidos' });
    // Siempre que se suban docs y el estado actual no sea approved, poner en pending
    const existing = await userStorage.getUser(targetId);
    if (!existing) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (existing.documentationStatus !== 'approved') {
      toUpdate.documentationStatus = 'pending';
    }
    const updated = await userStorage.updateUser(targetId, toUpdate);
    if (!updated) return res.status(404).json({ message: 'Usuario no encontrado' });
    const { password, ...safe } = updated; res.json(safe);
  }));

  // Obtener documentos de un usuario (solo admin o dueño)
  router.get('/users/:id/documents', isAuthenticated, asyncRoute(async (req, res) => {
    const targetId = parseInt(req.params.id); if (isNaN(targetId)) return res.status(400).json({ message: 'ID inválido' });
    const current = req.user as AppUser; if (current.id !== targetId && current.role !== 'admin') return res.status(403).json({ message: 'No autorizado' });
    const userDocs = await userStorage.getUser(targetId);
    if (!userDocs) return res.status(404).json({ message: 'Usuario no encontrado' });
    const { identificationUrl, diplomaUrl, documentationStatus } = userDocs;
    res.json({ identificationUrl, diplomaUrl, documentationStatus });
  }));

  // Validar (aprobar/rechazar) documentación - solo admin
  router.post('/users/:id/documents/validate', isAdmin, asyncRoute(async (req, res) => {
    const targetId = parseInt(req.params.id); if (isNaN(targetId)) return res.status(400).json({ message: 'ID inválido' });
    const { action } = req.body as { action?: string };
    if (!['approve','reject'].includes(action || '')) return res.status(400).json({ message: 'Acción inválida. Use approve o reject' });
    const userDocs = await userStorage.getUser(targetId);
    if (!userDocs) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (!userDocs.identificationUrl && !userDocs.diplomaUrl) return res.status(400).json({ message: 'No hay documentos para validar' });
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const updated = await userStorage.updateUser(targetId, { documentationStatus: newStatus } as any);
    if (!updated) return res.status(500).json({ message: 'Error al actualizar estado' });
    res.json({ message: 'Estado de documentación actualizado', documentationStatus: newStatus });
  }));
}
