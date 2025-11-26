import dotenv from "dotenv";
dotenv.config();
import {db} from "../../persistencia/db.ts";
import {and, eq, gte, lte} from "drizzle-orm";
import {Booking, bookings, InsertBooking} from "@shared/schema.ts";
import {sendBookingEmail} from "../email/mailer.ts";
import { users } from "@shared/schema.ts";

/**
 * DBBookingStorage: Implementación de almacenamiento de reservas en base de datos.
 *
 * Esta clase proporciona las operaciones CRUD y de consulta para los registros
 * de reservas (bookings) dentro de la base de datos, usando Drizzle ORM.
 *
 * @author Marco
 */

export interface interBookingStorage {
    getBooking(id: number): Promise<Booking | undefined>;

    getAllBookings(): Promise<Booking[]>;

    getBookingsByUser(userId: number): Promise<Booking[]>;

    getBookingsByRoom(roomId: number): Promise<Booking[]>;

    getBookingsByDate(date: string): Promise<Booking[]>;

    getBookingsByRoomAndDate(roomId: number, date: string): Promise<Booking[]>;

    getBookingsByStatus(status: string): Promise<Booking[]>;

    getBookingsByDateRange(startDate: string, endDate: string): Promise<Booking[]>;

    createBooking(booking: InsertBooking): Promise<Booking>;

    updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;
}

export class MemBookingStorage implements interBookingStorage {
    private bookings: Map<number, Booking>;
    private currentId: number;

    constructor() {
        this.bookings = new Map();
        this.currentId = 1;
    }

    async getBooking(id: number): Promise<Booking | undefined> {
        return this.bookings.get(id);
    }

    async getAllBookings(): Promise<Booking[]> {
        return Array.from(this.bookings.values());
    }

    async getBookingsByUser(userId: number): Promise<Booking[]> {
        console.log(`[storage] Buscando reservas para usuario con ID ${userId}`);
        const allBookings = Array.from(this.bookings.values());
        console.log(`[storage] Total de reservas en el sistema: ${allBookings.length}`);

        const userBookings = allBookings.filter(booking => {
            const match = booking.userId === userId;
            console.log(`[storage] Reserva ${booking.id}: userId=${booking.userId}, coincide con ${userId}? ${match}`);
            return match;
        });

        console.log(`[storage] Encontradas ${userBookings.length} reservas para usuario ${userId}`);
        return userBookings;
    }

    async getBookingsByRoom(roomId: number): Promise<Booking[]> {
        return Array.from(this.bookings.values()).filter(booking => booking.roomId === roomId);
    }

    async getBookingsByDate(date: string): Promise<Booking[]> {
        return Array.from(this.bookings.values()).filter(booking => booking.date === date);
    }

    async getBookingsByRoomAndDate(roomId: number, date: string): Promise<Booking[]> {
        return Array.from(this.bookings.values()).filter(
            booking => booking.roomId === roomId && booking.date === date
        );
    }

    async getBookingsByStatus(status: string): Promise<Booking[]> {
        return Array.from(this.bookings.values()).filter(b => b.status === status);
    }

    async getBookingsByDateRange(startDate: string, endDate: string): Promise<Booking[]> {
        return Array.from(this.bookings.values()).filter(b => b.date >= startDate && b.date <= endDate);
    }

    async createBooking(insertBooking: InsertBooking): Promise<Booking> {
        const id = this.currentId++;
        const booking: Booking = {
            ...insertBooking,
            id,
            notes: insertBooking.notes || null,
            status: insertBooking.status || "confirmed"
        };
        this.bookings.set(id, booking);
        return booking;
    }

    async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
        const booking = this.bookings.get(id);
        if (!booking) return undefined;

        const updatedBooking = { ...booking, status };
        this.bookings.set(id, updatedBooking);
        return updatedBooking;
    }
}

export class DBBookingStorage implements interBookingStorage {
    /**
     * Recupera una reserva por su identificador único.
     *
     * @param id identificador de la reserva.
     * @return la reserva correspondiente, o undefined si no existe.
     * @throws Error si ocurre un fallo en la conexión con la base de datos.
     *
     */
    async getBooking(id: number): Promise<Booking | undefined> {
        const result = await db.select().from(bookings).where(eq(bookings.id, id));
        return result[0];
    }

    /**
     * Obtiene todas las reservas registradas en la base de datos.
     * @return un arreglo con todas las reservas existentes.
     */
    async getAllBookings(): Promise<Booking[]> {
        return await db.select().from(bookings);
    }

    /**
     * Obtiene todas las reservas de un usuario especifico registradas en la base de datos.
     * @param userId identificador del usuario.
     * @return un arreglo con todas las reservas existentes de ese usuario.
     */
    async getBookingsByUser(userId: number): Promise<Booking[]> {
        return await db.select().from(bookings).where(eq(bookings.userId, userId));
    }

    /**
     * Obtiene todas las reservas con un id especifico registradas en la base de datos.
     * @param roomId identificador del consultorio.
     * @return un arreglo con todas las reservas existentes con esa habitaci[on].
     */
    async getBookingsByRoom(roomId: number): Promise<Booking[]> {
        return await db.select().from(bookings).where(eq(bookings.roomId, roomId));
    }

    /**
     * Obtiene todas las reservas en un dia especifico registradas en la base de datos.
     * @param date fecha a buscar.
     * @return un arreglo con todas las reservas existentes con ese dia].
     */
    async getBookingsByDate(date: string): Promise<Booking[]> {
        return await db.select().from(bookings).where(eq(bookings.date, date));
    }

    /**
     * Obtiene todas las reservas con un id especifico en un dia determinado registradas en la base de datos.
     * @param roomId identificador del consultorio.
     * @param date fecha a buscar.
     * @return un arreglo con todas las reservas existentes de ese consiltorio con ese dia.
     */
    async getBookingsByRoomAndDate(roomId: number, date: string): Promise<Booking[]> {
        return await db.select().from(bookings).where(
            and(eq(bookings.roomId, roomId), eq(bookings.date, date))
        );
    }

    /*
    Obtiene todas las reservas con un estado (status) específico registradas en la base de datos.
    @param status estado a buscar ("confirmed", "cancelled", "completed").
    @return un arreglo con todas las reservas existentes con ese estado.
     */
    async getBookingsByStatus(status: string): Promise<Booking[]> {
        return await db.select().from(bookings).where(eq(bookings.status, status));
    }

    /*
    Obtiene todas las reservas dentro de un rango inclusivo de fechas específico.
    Que sea inclusivo simplemente quiere decir que incluye el día de inicio y el día final.
    @param startDate fecha de inicio del rango (formato "YYYY-MM-DD").
    @param endDate fecha de fin del rango (igual, formato "YYYY-MM-DD").
    @return un arreglo con todas las reservas existentes dentro de ese rango de fechas.
     */
    async getBookingsByDateRange(startDate: string, endDate: string): Promise<Booking[]> {
        return await db.select().from(bookings).where(
            //gte es greather than
            //y lte es less than
            //creí que sería buena idea aclararlo :p
            and(gte(bookings.date, startDate), lte(bookings.date, endDate))
        );
    }

    /**
     * Crea una nueva reserva en la base de datos.
     *
     * @param insertBooking objeto con los datos de la reserva.
     * @return la reserva creada, incluyendo su identificador asignado.
     */
    async createBooking(insertBooking: InsertBooking): Promise<Booking> {
        const result = await db.insert(bookings).values(insertBooking).returning();
        const booking = result[0];
        // Agarrar correo de user
        const userResult = await db.select().from(users).where(eq(users.id, insertBooking.userId));
        const userEmail = userResult[0].email;

        // Enviar correo de notificación
        try {
            await sendBookingEmail(userEmail, {
                date: booking.date,
                startTime: booking.startTime,
                endTime: booking.endTime,
                roomId: booking.roomId
            });
            console.log("Correo enviado correctamente ✔");
        } catch (err) {
            console.error("Error enviando correo:", err);
        }
        return booking;
    }

    /**
     * Actualiza el estado (status) de una reserva existente.
     *
     * @param id identificador de la reserva.
     * @param status nuevo estado a asignar.
     * @return la reserva actualizada, o undefined si no existe.
     */
 async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
        const result = await db.update(bookings)
            .set({ status })
            .where(eq(bookings.id, id))
            .returning();
        return result[0];
    }
}

export const bookingStorage = new DBBookingStorage();