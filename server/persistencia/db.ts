import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema.ts";
import "dotenv/config";

/**
 * Verifica que la variable de entorno DATABASE_URL esté definida.
 *
 * Si no está configurada, lanza un error para evitar inicializar la conexión
 * sin credenciales válidas hacia la base de datos PostgreSQL.
 */
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * Pool de conexiones hacia PostgreSQL.
 *
 * @description
 * Crea y administra múltiples conexiones a la base de datos
 */
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Instancia principal de Drizzle ORM configurada con PostgreSQL.
 *
 * @description
 * Permite realizar operaciones SQL tipadas (select, insert, update, delete)
 * usando el esquema definido en `@shared/schema.ts`.
 *
 * @property client el pool de conexiones de PostgreSQL.
 * @property schema el conjunto de tablas y tipos compartidos.
 */
export const db = drizzle({ client: pool, schema });
