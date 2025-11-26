import type { Router } from "express";
import { bookingStorage } from "../../negocio/storage/bookingStorage";
import { roomStorage } from "../../negocio/storage/roomStorage";
import { userStorage } from "../../negocio/storage/userStorage";
import { systemConfigsStorage } from "../../negocio/storage/systemConfigsStorage";
import { paymentStorage } from "../../negocio/storage/paymentStorage";
import { insertBookingSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { asyncRoute, isAuthenticated, isAdmin } from "./middleware";
import type { User as AppUser } from "@shared/schema";

// Rutas relacionadas con reservas (bookings)
export function registerBookingRoutes(router: Router) {
  // GET /api/bookings (con múltiples combinaciones de filtros)
  router.get("/bookings", asyncRoute(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    const { userId, roomId, date, startDate, endDate, status } = req.query as Record<string, string | undefined>;
    if (status && !["confirmed","cancelled","completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Helper parse
    const parseIntOrUndefined = (v?: string) => v ? parseInt(v,10) : undefined;
    const uId = parseIntOrUndefined(userId);
    const rId = parseIntOrUndefined(roomId);

    // Prioridad de filtros según combinaciones en código original
    if (uId && status) {
      const byUser = await bookingStorage.getBookingsByUser(uId);
      return res.json(byUser.filter(b => b.status === status));
    }
    if (startDate && endDate && status) {
      const range = await bookingStorage.getBookingsByDateRange(startDate, endDate);
      return res.json(range.filter(b => (!rId || b.roomId === rId) && b.status === status));
    }
    if (rId && date && status) {
      const roomDate = await bookingStorage.getBookingsByRoomAndDate(rId, date);
      return res.json(roomDate.filter(b => b.status === status));
    }
    if (rId && status) {
      const roomBookings = await bookingStorage.getBookingsByRoom(rId);
      return res.json(roomBookings.filter(b => b.status === status));
    }
    if (date && status) {
      const dateBookings = await bookingStorage.getBookingsByDate(date);
      return res.json(dateBookings.filter(b => b.status === status));
    }
    if (status) {
      const statusBookings = await bookingStorage.getBookingsByStatus(status);
      return res.json(statusBookings);
    }
    if (uId) {
      const userBookings = await bookingStorage.getBookingsByUser(uId);
      return res.json(userBookings);
    }
    if (startDate && endDate) {
      const range = await bookingStorage.getBookingsByDateRange(startDate, endDate);
      return res.json(rId ? range.filter(b => b.roomId === rId) : range);
    }
    if (rId && date) {
      const roomDate = await bookingStorage.getBookingsByRoomAndDate(rId, date);
      return res.json(roomDate);
    }
    if (rId) {
      const roomBookings = await bookingStorage.getBookingsByRoom(rId);
      return res.json(roomBookings);
    }
    if (date) {
      const dateBookings = await bookingStorage.getBookingsByDate(date);
      return res.json(dateBookings);
    }
    const all = await bookingStorage.getAllBookings();
    return res.json(all);
  }));

  // GET /api/bookings/:id
  router.get("/bookings/:id", asyncRoute(async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid booking ID" });
    const booking = await bookingStorage.getBooking(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  }));

  // PATCH /api/bookings/:id/status (admin + dueño con reglas de cancelación)
  router.patch("/bookings/:id/status", isAuthenticated, asyncRoute(async (req, res) => {
    const bookingId = parseInt(req.params.id);
    if (isNaN(bookingId)) return res.status(400).json({ message: "ID de reserva inválido" });
    const { status } = req.body as { status?: string };
    if (!status || !["confirmed","cancelled","completed"].includes(status)) {
      return res.status(400).json({ message: "Estado de reserva inválido" });
    }
    const booking = await bookingStorage.getBooking(bookingId);
    if (!booking) return res.status(404).json({ message: "Reserva no encontrada" });

    const user = req.user as AppUser;
    if (booking.userId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ message: "No autorizado a modificar esta reserva" });
    }

    if (status === 'cancelled' && user.role !== 'admin') {
      const cancelConfig = await systemConfigsStorage.getSystemConfig('cancellation_hours_notice');
      const minHours = cancelConfig ? parseInt(cancelConfig.value) : 24;
      const bookingDate = new Date(`${booking.date}T${booking.startTime}`);
      const now = new Date();
      const diffHours = (bookingDate.getTime() - now.getTime()) / (1000*60*60);
      if (diffHours < minHours) {
        return res.status(400).json({ message: `Solo se pueden cancelar reservas con al menos ${minHours} horas de anticipación` });
      }
    }

    const updated = await bookingStorage.updateBookingStatus(bookingId, status);
    res.json(updated);
  }));

  // POST /api/bookings - crear reserva
  router.post("/bookings", isAuthenticated, asyncRoute(async (req, res) => {
    const userId = (req.user as any).id;
    const payload = { ...req.body, userId };
    try {
      const user = await userStorage.getUser(userId);
      if (!user || user.documentationStatus !== 'approved') {
        return res.status(403).json({ message: "Debes tener documentación aprobada antes de reservar", documentationRequired: true });
      }
      const validated = insertBookingSchema.parse(payload);
      const room = await roomStorage.getRoom(validated.roomId);
      if (!room) return res.status(404).json({ message: "Room not found" });

      // Configs
      const advanceCfg = await systemConfigsStorage.getSystemConfig('advance_booking_days');
      const maxActiveCfg = await systemConfigsStorage.getSystemConfig('max_active_bookings');
      const maxHoursCfg = await systemConfigsStorage.getSystemConfig('max_booking_duration_hours');
      const advanceDays = advanceCfg ? parseInt(advanceCfg.value) : 0;
      const maxActive = maxActiveCfg ? parseInt(maxActiveCfg.value) : 8;
      const maxHours = maxHoursCfg ? parseInt(maxHoursCfg.value) : 4;

      const bookingDateObj = new Date(`${validated.date}T${validated.startTime}`);
      const now = new Date();
      if (bookingDateObj < now) return res.status(400).json({ message: "No se pueden crear reservas en fechas pasadas" });
      const diffDays = (bookingDateObj.getTime() - now.getTime()) / (1000*60*60*24);
      if (diffDays < advanceDays) return res.status(400).json({ message: `Las reservas deben hacerse con al menos ${advanceDays} días de anticipación` });

      const activeBookings = (await bookingStorage.getBookingsByUser(userId)).filter(b => b.status === 'confirmed');
      if (activeBookings.length >= maxActive) return res.status(400).json({ message: `Has alcanzado el límite máximo de ${maxActive} reservas activas` });

      const startHour = parseInt(validated.startTime.split(':')[0]);
      const endHour = parseInt(validated.endTime.split(':')[0]);
      const duration = endHour - startHour;
      if (duration > maxHours) return res.status(400).json({ message: `No se permiten reservas de más de ${maxHours} horas consecutivas` });

      const sameDayBookings = await bookingStorage.getBookingsByRoomAndDate(validated.roomId, validated.date);
      const conflict = sameDayBookings.some(b => b.status !== 'cancelled' && (
        (validated.startTime >= b.startTime && validated.startTime < b.endTime) ||
        (validated.endTime > b.startTime && validated.endTime <= b.endTime) ||
        (validated.startTime <= b.startTime && validated.endTime >= b.endTime)
      ));
      if (conflict) return res.status(409).json({ message: "Room is already booked for this time" });

      const unpaid = await paymentStorage.getPaymentByUserAndStatus(userId, 'pending');
      if (unpaid.length > maxActive) return res.status(409).json({ message: "Tiene pagos pendientes" });

      // amount en pesos a partir de price en centavos
      const hours = duration;
      const amount = (room.price * hours) / 100; // price en centavos
      const booking = await bookingStorage.createBooking(validated);
      await paymentStorage.createPayment({
        userId: validated.userId,
        amount: amount.toFixed(2),
        concept: `Renta de ${room.name} por ${user.fullName} el ${bookingDateObj.toISOString()}`,
        bookingId: booking.id
      });
      res.status(201).json(booking);
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid booking data', errors: fromZodError(e).message });
      }
      const err: any = e instanceof Error ? e : new Error('Failed to create booking');
      err.status = 500; throw err;
    }
  }));

  // POST /api/bookings/:id/penalize - aplicar penalización (descuento sobre pago)
  router.post('/bookings/:id/penalize', isAdmin, asyncRoute(async (req, res) => {
    const bookingId = parseInt(req.params.id);
    const { percentage } = req.body as { percentage?: number };
    if (isNaN(bookingId)) return res.status(400).json({ message: 'ID de reserva inválido' });
    if (percentage == null || isNaN(percentage)) return res.status(400).json({ message: 'Porcentaje inválido' });
    const payment = await paymentStorage.getPaymentByBooking(bookingId);
    if (!payment) return res.status(404).json({ message: 'No se encontró el pago asociado a esta reserva' });
    const updated = await paymentStorage.paymentPercentageDiscount(payment.id, percentage);
    res.status(200).json({ message: `Penalización del ${percentage}% aplicada correctamente.`, payment: updated });
  }));
}
