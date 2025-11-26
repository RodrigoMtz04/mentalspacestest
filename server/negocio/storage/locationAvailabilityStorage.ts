import {InsertLocationAvailability, locationAvailability, LocationAvailability} from "@shared/schema.ts";
import {db} from "../../persistencia/db.ts";
import {and, eq} from "drizzle-orm";

export interface interLocationAvailabilityStorage {
    getLocationAvailability(locationId: number): Promise<LocationAvailability[]>;
    createLocationAvailability(availability: InsertLocationAvailability): Promise<LocationAvailability>;
}

export class DBLocationAvailabilityStorage implements interLocationAvailabilityStorage {
    /**
     * Obtiene todos los horarios de disponibilidad de una sede específica desde la base de datos.
     *
     * @param locationId - ID de la sede.
     * @returns Promesa que resuelve un arreglo de objetos LocationAvailability.
     */
    async getLocationAvailability(locationId: number): Promise<LocationAvailability[]> {
        return db.select().from(locationAvailability).where(eq(locationAvailability.locationId, locationId));
    }

    /**
     * Crea un nuevo horario de disponibilidad en la base de datos.
     *
     * @param insertLocationAvailability - Datos de la disponibilidad a insertar.
     * @returns Promesa que resuelve el objeto LocationAvailability recién creado.
     */
    async createLocationAvailability(insertLocationAvailability: InsertLocationAvailability): Promise<LocationAvailability> {
        const result = await db.insert(locationAvailability).values(insertLocationAvailability).returning();
        return result[0];
    }

    /**
     * Obtiene el horario de disponibilidad de una sede para un día específico.
     *
     * @param locationId - ID de la sede a consultar.
     * @param dayOfWeek - Día de la semana (1 = lunes, 7 = domingo).
     * @returns Promesa que resuelve un objeto LocationAvailability
     *          que coincide con la sede y el día indicado.
     *
     * @description
     * Este método consulta la base de datos para obtener los horarios de una
     * sede en un día específico. Se usa la combinación de condiciones AND
     * para asegurar que se filtre correctamente por sede y día de la semana.
     */
    async getAvailabilityByLocationAndDay(locationId: number, dayOfWeek: number): Promise<LocationAvailability> {
        const result = await db.select().from(locationAvailability).where(and(eq(locationAvailability.locationId, locationId), eq(locationAvailability.dayOfWeek, dayOfWeek)));
        return result[0];
    }
}

export const locationAvailabilityStorage = new DBLocationAvailabilityStorage();