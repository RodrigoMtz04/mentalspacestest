import {db} from "../../persistencia/db.ts";
import {eq} from "drizzle-orm";
import {availability, Availability, InsertAvailability, systemConfig, SystemConfig} from "@shared/schema.ts";
/*
Hola, Juan Carlo aqui. Lean los comentarios en roomStorage.ts, ya que la logica es la misma.
 */

export interface interAvailabilityStorage {
    getRoomAvailability(roomId: number): Promise<Availability[]>;
    createAvailability(availability: InsertAvailability): Promise<Availability>;
}

export class MemAvailabilityStorage implements interAvailabilityStorage {
    private availabilities: Map<number, Availability>;
    private currentId: number;

    constructor() {
        this.availabilities = new Map();
        this.currentId = 1;
    }

    // Availability operations
    async getRoomAvailability(roomId: number): Promise<Availability[]> {
        return Array.from(this.availabilities.values()).filter(
            availability => availability.roomId === roomId
        );
    }

    async createAvailability(insertAvailability: InsertAvailability): Promise<Availability> {
        const id = this.currentId++;
        const availability: Availability = {
            ...insertAvailability,
            id,
            isClosed: insertAvailability.isClosed !== undefined ? insertAvailability.isClosed : false
        };
        this.availabilities.set(id, availability);
        return availability;
    }
}

export class BDAvailabilityStorage implements interAvailabilityStorage {
    // ==== AVAILABILITY OPERATIONS ====
    async getRoomAvailability(roomId: number): Promise<Availability[]> {
        return await db.select().from(availability).where(eq(availability.roomId, roomId));
    }

    async createAvailability(insertAvailability: InsertAvailability): Promise<Availability> {
        const result = await db.insert(availability).values(insertAvailability).returning();
        return result[0];
    }
}

export const availabilityStorage = new BDAvailabilityStorage();