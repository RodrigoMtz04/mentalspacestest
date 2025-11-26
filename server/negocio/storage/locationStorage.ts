import {InsertLocation, Location, locations,} from "@shared/schema.ts";
import {db} from "../../persistencia/db.ts";
import {eq} from "drizzle-orm";

export interface interRoomStorage {
    getLocation(id: number): Promise<Location | undefined>;

    getAllLocations(): Promise<Location[]>;

    getActiveLocation(): Promise<Location[]>;

    createLocation(location: InsertLocation): Promise<Location>;

    updateLocation(id: number, room: Partial<Location>): Promise<Location | undefined>;
}

export class DBLocationStorage implements interRoomStorage {
    async createLocation(location: InsertLocation): Promise<Location> {
        const result = await db.insert(locations).values(location).returning();
        return result[0];
    }

    async getActiveLocation(): Promise<Location[]> {
        return db.select().from(locations).where(eq(locations.isActive, true));
    }

    async getAllLocations(): Promise<Location[]> {
        return db.select().from(locations);
    }

    async getLocation(id: number): Promise<Location | undefined> {
        const result = await db.select().from(locations).where(eq(locations.id, id));
        return result[0];
    }

    async updateLocation(id: number, location: Partial<Location>): Promise<Location | undefined> {
        const result = await db.update(locations).set(location).where(eq(locations.id, id)).returning();
        return result[0];
    }
}

export const locationStorage = new DBLocationStorage();