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
 * Normaliza la URL de la base de datos para producción.
 *
 * En entornos de producción, se asegura de que la conexión use SSL añadiendo
 * `?sslmode=require` si no está presente. Esto es especialmente importante
 * para bases de datos en Neon.
 *
 * @param url La URL de la base de datos a normalizar.
 * @returns La URL normalizada, lista para usarse en producción.
 */
function normalizeDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    // Si no tiene query, añade sslmode=require en producción
    if (process.env.NODE_ENV === "production") {
      if (!u.searchParams.has("sslmode")) {
        u.searchParams.set("sslmode", "require");
      }
    }
    return u.toString();
  } catch {
    // Si no es URL válida, devuelve original (pg soporta constring)
    return url;
  }
}

const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);

/**
 * Pool de conexiones hacia PostgreSQL.
 *
 * @description
 * Crea y administra múltiples conexiones a la base de datos
 */
export const pool = new Pool({
  connectionString,
  // En producción (Neon), fuerza SSL
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
});

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

// Nota: Alternativa serverless
// Para reducir consumo de conexiones en Vercel, se puede migrar a @neondatabase/serverless y drizzle-orm/neon-http:
// import { neon } from "@neondatabase/serverless";
// import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
// const sql = neon(connectionString);
// export const db = drizzleNeon(sql, { schema });

