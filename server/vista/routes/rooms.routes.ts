import type { Router } from "express";
import { roomStorage } from "../../negocio/storage/roomStorage";
import { bookingStorage } from "../../negocio/storage/bookingStorage";
import { availabilityStorage } from "../../negocio/storage/availabilityStorage";
import { insertRoomSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { asyncRoute, isAdmin } from "./middleware";


// Rutas relacionadas con cubículos/salas (rooms)
export function registerRoomRoutes(router: Router) {
  // GET /api/rooms - listar salas activas
  router.get("/rooms", asyncRoute(async (_req, res) => {
    const rooms = await roomStorage.getActiveRooms();
    res.json(rooms);
  }));

  // GET /api/rooms/all - listar todas las salas (incluyendo inactivas)
  router.get("/rooms/all", asyncRoute(async (_req, res) => {
    const rooms = await roomStorage.getAllRooms();
    res.json(rooms);
  }));

  // GET /api/rooms/:id - detalle
  router.get("/rooms/:id", asyncRoute(async (req, res) => {
    const roomId = parseInt(req.params.id);
    if (isNaN(roomId)) return res.status(400).json({ message: "ID de sala inválido" });
    const room = await roomStorage.getRoom(roomId);
    if (!room) return res.status(404).json({ message: "Sala no encontrada" });
    res.json(room);
  }));

  // GET /api/rooms/:id/future-bookings - reservas futuras (admin / uso interno)
  router.get("/rooms/:id/future-bookings", asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "ID de sala inválido" });
    const all = await bookingStorage.getBookingsByRoom(id);
    const today = new Date().toISOString().split('T')[0];
    const future = all.filter(b => b.date >= today && ["confirmed","pending"].includes(b.status));
    res.json(future);
  }));

  // GET /api/rooms/:id/availability - disponibilidad del cubículo
  router.get("/rooms/:id/availability", asyncRoute(async (req, res) => {
    const roomId = parseInt(req.params.id);
    if (isNaN(roomId)) return res.status(400).json({ message: "ID de sala inválido" });
    const availability = await availabilityStorage.getRoomAvailability(roomId);
    res.json(availability);
  }));

  // POST /api/rooms - crear sala
  router.post("/rooms", isAdmin, asyncRoute(async (req, res) => {
    try {
      const validated = insertRoomSchema.parse(req.body);
      const room = await roomStorage.createRoom(validated);
      res.status(201).json(room);
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(400).json({ message: "Datos de sala inválidos", errors: fromZodError(e).message });
      }
      throw e;
    }
  }));

  // PATCH /api/rooms/:id - actualizar parcial
  router.patch("/rooms/:id", isAdmin, asyncRoute(async (req, res) => {
    const roomId = parseInt(req.params.id);
    if (isNaN(roomId)) return res.status(400).json({ message: "ID de sala inválido" });
    const room = await roomStorage.getRoom(roomId);
    if (!room) return res.status(404).json({ message: "Sala no encontrada" });
    const updated = await roomStorage.updateRoom(roomId, req.body);
    res.json(updated);
  }));

  // DELETE /api/rooms/:id - baja lógica
  router.delete("/rooms/:id", isAdmin, asyncRoute(async (req, res) => {
    const roomId = parseInt(req.params.id);
    if (isNaN(roomId)) return res.status(400).json({ message: "ID de sala inválido" });
    const room = await roomStorage.getRoom(roomId);
    if (!room) return res.status(404).json({ message: "Sala no encontrada" });
    if (room.isActive === false) return res.status(400).json({ message: "La sala ya está inactiva" });

    const allBookings = await bookingStorage.getBookingsByRoom(roomId);
    const today = new Date().toISOString().split("T")[0];
    const futureBookings = allBookings.filter(b => b.date >= today && ["confirmed","pending"].includes(b.status));
    const forceDelete = req.query.force === "true";
    if (forceDelete && futureBookings.length > 0) {
      for (const b of futureBookings) {
        await bookingStorage.updateBookingStatus(b.id, "cancelled");
      }
    }
    await roomStorage.updateRoom(roomId, { isActive: false });
    res.status(200).json({ message: "Sala dada de baja correctamente" });
  }));
}
