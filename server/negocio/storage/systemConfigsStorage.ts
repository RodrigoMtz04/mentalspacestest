import {db} from "../../persistencia/db.ts";
import {eq} from "drizzle-orm";
import {InsertSystemConfig, systemConfig, SystemConfig, User} from "@shared/schema.ts";


/*
Hola, Juan Carlo aqui. Lean los comentarios en roomStorage.ts, ya que la logica es la misma.
 */

export interface InterSystemConfigsStorage {
    // System Configuration operations
    getSystemConfig(key: string): Promise<SystemConfig | undefined>;
    getAllSystemConfig(): Promise<SystemConfig[]>;
    updateSystemConfig(key: string, value: string, userId?: number): Promise<SystemConfig | undefined>;
    createSystemConfig(config: InsertSystemConfig): Promise<SystemConfig>;
}

export class DBSystemConfigsStorage implements InterSystemConfigsStorage {
    /**
     * Recupera una configuración del sistema por su clave.
     * @param key clave de la configuración.
     * @return la configuración correspondiente, o undefined si no existe.
     */
    async getSystemConfig(key: string): Promise<SystemConfig | undefined> {
        const result = await db.select().from(systemConfig).where(eq(systemConfig.key, key));
        return result[0];
    }

    /**
     * Obtiene todas las configuraciones del sistema.
     * @return un arreglo con todas las configuraciones existentes.
     */
    async getAllSystemConfig(): Promise<SystemConfig[]> {
        return await db.select().from(systemConfig);
    }

    /**
     * Actualiza el valor de una configuración existente.
     * @param key clave de la configuración.
     * @param value nuevo valor.
     * @param userId (opcional) identificador del usuario que realiza la actualización.
     * @return la configuración actualizada, o undefined si no existe.
     */
    async updateSystemConfig(key: string, value: string, userId?: number): Promise<SystemConfig | undefined> {
        const result = await db.update(systemConfig)
            .set({ value, updatedAt: new Date(), updatedBy: userId || null })
            .where(eq(systemConfig.key, key))
            .returning();
        return result[0];
    }

    /**
     * Crea una nueva configuración en la base de datos.
     * @param config objeto con los datos de la configuración.
     * @return la configuración creada, incluyendo su identificador asignado.
     */
    async createSystemConfig(config: InsertSystemConfig): Promise<SystemConfig> {
        const result = await db.insert(systemConfig).values(config).returning();
        return result[0];
    }
}

export const systemConfigsStorage = new DBSystemConfigsStorage();