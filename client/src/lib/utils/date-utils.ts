import { format, isToday as isDayToday, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Booking } from "@shared/schema";

/**
 * Format a date as YYYY-MM-DD
 * Esta función asegura que la fecha se convierta correctamente al formato YYYY-MM-DD
 * independientemente de la zona horaria, manteniendo el día seleccionado por el usuario.
 * Si la fecha es null o undefined, usa la fecha actual del sistema.
 */
export function formatDateForAPI(date?: Date | null): string {
  // Si no hay fecha, usar la fecha actual
  const dateToUse = date || new Date();
  
  // Esto garantiza que usamos la fecha local del usuario sin ajustes de zona horaria
  const year = dateToUse.getFullYear();
  const month = String(dateToUse.getMonth() + 1).padStart(2, '0');
  const day = String(dateToUse.getDate()).padStart(2, '0');
  
  console.log(`Formateando fecha para API: ${dateToUse} -> ${year}-${month}-${day}`);
  return `${year}-${month}-${day}`;
}

/**
 * Format a time as HH:MM
 */
export function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

/**
 * Format a date in Spanish locale
 */
export function formatDateLocalized(date: Date): string {
  return format(date, "d 'de' MMMM, yyyy", { locale: es });
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return isDayToday(dateObj);
}

/**
 * Get a readable string for a time range
 */
export function formatTimeRange(start: Date | string, end: Date | string): string {
  const startStr = typeof start === "string" ? start : formatTime(start);
  const endStr = typeof end === "string" ? end : formatTime(end);
  return `${startStr} - ${endStr}`;
}

/**
 * Calculate room availability based on current time and bookings
 */
export function calculateRoomAvailability(bookings: Booking[], roomId: number): "available" | "limited" | "unavailable" {
  if (!bookings || bookings.length === 0) return "available";
  
  const roomBookings = bookings.filter(b => b.roomId === roomId && b.status !== "cancelled");
  
  if (roomBookings.length === 0) return "available";
  
  // If there are more than 3 bookings, consider availability limited
  if (roomBookings.length >= 3) return "limited";
  
  // Check if there are any time slots left in the day (assuming 9-6 workday)
  const timeSlots = 9; // 9 hours in a workday
  const bookedHours = roomBookings.reduce((total, booking) => {
    const startHour = parseInt(booking.startTime.split(":")[0]);
    const endHour = parseInt(booking.endTime.split(":")[0]);
    return total + (endHour - startHour);
  }, 0);
  
  if (bookedHours >= timeSlots) return "unavailable";
  if (bookedHours >= timeSlots * 0.7) return "limited";
  
  return "available";
}