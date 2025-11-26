import { eq } from "drizzle-orm";
import {
    Booking,
    bookings,
    InsertUser,
    User, users
} from "@shared/schema.ts";
import {db} from "../../persistencia/db.ts";
import bcrypt from "bcrypt";


/*
Hola, Juan Carlo aqui. Lean los comentarios en roomStorage.ts, ya que la logica es la misma.
 */

export interface interUserStorage {
    // User operations
    getUser(id: number): Promise<User | undefined>;
    getUserByUsername(username: string): Promise<User | undefined>;
    getAllUsers(): Promise<User[]>;
    createUser(user: InsertUser): Promise<User>;
    updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
    getUserBookings(userId: number): Promise<Booking[]>;
}

export class DBUserStorage implements interUserStorage {
    // ==== USER OPERATIONS ====
    async getUser(id: number): Promise<User | undefined> {
        const result = await db.select().from(users).where(eq(users.id, id));
        return result[0];
    }

    async getUserByUsername(username: string): Promise<User | undefined> {
        const result = await db.select().from(users).where(eq(users.username, username));
        return result[0];
    }

    async getAllUsers(): Promise<User[]> {
        return await db.select().from(users);
    }

    async createUser(insertUser: InsertUser): Promise<User> {
        // Encriptar contraseña antes de guardar
        const hashedPassword = await bcrypt.hash(insertUser.password, 10);

        // Forzar estado inicial de pago inactivo siempre al crear usuario.
        const payload: any = {
            ...insertUser,
            password: hashedPassword,
            paymentStatus: 'inactive',
        };
        // Normalizar documentationStatus: ignorar si viene distinto
        payload.documentationStatus = 'none';
        if (payload.identificationUrl || payload.diplomaUrl) {
            payload.documentationStatus = 'pending';
        }
        if (payload.paymentStatus !== 'inactive') {
            payload.paymentStatus = 'inactive';
        }

        const result = await db
            .insert(users)
            .values(payload)
            .returning();

        return result[0];
    }

    async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
        const result = await db.update(users).set(user).where(eq(users.id, id)).returning();
        return result[0];
    }

    async getUserBookings(userId: number): Promise<Booking[]> {
        return await db.select().from(bookings).where(eq(bookings.userId, userId));
    }
}

export const userStorage = new DBUserStorage();