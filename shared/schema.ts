import {pgTable, text, serial, integer, boolean, timestamp, decimal} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (therapists or admins)
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    fullName: text("full_name").notNull(),
    // Roles más específicos para el sistema
    role: text("role").notNull().default("standard"),  // admin, standard, trusted, vip, monthly
    // Tipo de profesional
    professionalType: text("professional_type"), // psychologist, nutritionist, doctor, other
    professionalTypeDetails: text("professional_type_details"), // detalles si es 'other'
    // Documentos de identificación
    professionalLicense: text("professional_license"), // cédula profesional
    identificationUrl: text("identification_url"), // URL a imagen de identificación
    diplomaUrl: text("diploma_url"), // URL a imagen del título
    // Nuevo estado de validación documental (none: sin docs, pending: en revisión, approved, rejected)
    documentationStatus: text("documentation_status").notNull().default("none"),
    // Campos básicos de contacto
    email: text("email").notNull().unique(),
    phone: text("phone"),
    // Campos profesionales
    specialty: text("specialty"),
    bio: text("bio"),
    profileImageUrl: text("profile_image_url"),
    // Estado y métricas
    isActive: boolean("is_active").notNull().default(true),
    paymentStatus: text("payment_status").default("inactive"),
    lastPaymentDate: timestamp("last_payment_date"),
    bookingCount: integer("booking_count").default(0), // contador de reservas cumplidas
    // Nueva fecha de término de suscripción
    subscriptionEndDate: timestamp("subscription_end_date"),
    // Campos de auditoría
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
});

/**
 * Representa los cubículos o salas de terapia (Rooms) disponibles para renta dentro de una sede (Location).
 *
 * @description
 * Cada registro corresponde a una sala específica dentro de una sede, con información detallada sobre
 * su ubicación, descripción, características y tarifa por hora.
 * Está relacionada con la tabla locations mediante una clave foránea (locationId).
 *
 * Reglas y consideraciones:
 *  - Cada sala pertenece a una única sede (locationId).
 *  - El precio se almacena en centavos para evitar errores de punto flotante.
 *  - Una sala puede tener múltiples características (features) almacenadas como arreglo de texto.
 *  - El campo isActive determina si la sala está disponible para ser reservada.
 *  - Solo administradores pueden crear, modificar o desactivar salas.
 *
 * Campos:
 *  - id: Identificador único del cubículo o sala.
 *  - locationId: FK hacia la sede a la que pertenece.
 *  - name: Nombre identificativo de la sala (ej. “Sala 1”, “Cubículo Azul”).
 *  - description: Descripción breve del espacio.
 *  - price: Tarifa por hora en centavos.
 *  - imageUrl: URL de la imagen representativa de la sala.
 *  - features: Arreglo de características (ej. “Aire acondicionado”, “Sillón reclinable”).
 *  - isActive: Indica si la sala está activa y visible en el sistema.
 */
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => locations.id), // <-- FK
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // Price per hour in cents
  imageUrl: text("image_url").notNull(),
  features: text("features").array(), // JC: En realidad, esto debería ser una tabla aparte, pero psssss...
  isActive: boolean("is_active").notNull().default(true),
});


/**
 * Representa los pagos realizados por los usuarios en el sistema.
 *
 * @description
 * Cada registro de esta tabla corresponde a un pago individual efectuado por un usuario,
 * ya sea automáticamente (tarjeta, transferencia) o manualmente por la administradora.
 * Permite llevar un control del estado de los pagos y sus métodos.
 *
 * Reglas y consideraciones:
 *  - Cada pago está asociado a un único usuario (userId).
 *  - El campo `status` debe ser uno de los siguientes: "pending", "paid", "cancelled".
 *  - `method` describe la forma de pago utilizada y no está limitada a valores predeterminados.
 *  - `amount` se almacena en formato decimal para permitir valores monetarios precisos.
 *  - `payment_date` registra la fecha y hora del pago; puede estar vacío si el pago aún no se ha completado.
 *
 * Campos:
 *  - id: Identificador único del pago.
 *  - userId: FK hacia el usuario que realizó el pago.
 *  - amount: Monto del pago.
 *  - status: Estado actual del pago ("pending", "paid", "cancelled").
 *  - method: Tipo de pago (tarjeta, transferencia, manual, etc.).
 *  - payment_date: Fecha y hora del pago.
 */
export const payments = pgTable("payments", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    bookingId: integer("booking_id").references(() => bookings.id),
    amount: decimal("amount").notNull(),
    // Estado puede reflejar estados de Stripe: requires_payment_method, requires_confirmation, processing, succeeded, canceled, etc.
    status: text("payment_status").default("pending"),
    method: text("method"),
    payment_date: timestamp("payment_date"),
    concept: text("concept").notNull(),
    // Nuevos campos para Stripe
    currency: text("currency").default("mxn"),
    paymentIntentId: text("payment_intent_id").unique(),
    idempotencyKey: text("idempotency_key"),
    // Nueva columna para filtros por fecha
    createdAt: timestamp("created_at").defaultNow(),
});

// Room bookings
export const bookings = pgTable("bookings", {
    id: serial("id").primaryKey(),
    roomId: integer("room_id").notNull(),
    userId: integer("user_id").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD format
    startTime: text("start_time").notNull(), // HH:MM format (24h)
    endTime: text("end_time").notNull(), // HH:MM format (24h)
    notes: text("notes"),
    status: text("status").notNull().default("confirmed"), // confirmed, cancelled, completed
});

// Room availability (business hours and exceptions)
export const availability = pgTable("availability", {
    id: serial("id").primaryKey(),
    roomId: integer("room_id").notNull(),
    dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday-Saturday)
    openTime: text("open_time").notNull(), // HH:MM format (24h)
    closeTime: text("close_time").notNull(), // HH:MM format (24h)
    isClosed: boolean("is_closed").notNull().default(false),
});

/**
 * Representa los horarios de disponibilidad de una sede (Location) en la base de datos.
 *
 * @description
 * Cada registro indica el horario de apertura y cierre de una sede para un día específico de la semana.
 * Solo un rango por día está permitido. La entidad está relacionada con Location mediante una
 * clave foránea (locationId).
 *
 * Reglas y consideraciones:
 *  - dayOfWeek indica el día de la semana (1 = Lunes, 7 = Domingo).
 *  - openTime debe ser menor que closeTime.
 *  - Los cambios afectan únicamente reservas futuras.
 *  - Solo administradores pueden modificar estos registros.
 *
 * Campos:
 *  - id: Identificador único del horario.
 *  - locationId: FK hacia la sede correspondiente.
 *  - dayOfWeek: Día de la semana.
 *  - openTime: Hora de apertura de la sede.
 *  - closeTime: Hora de cierre de la sede.
 */
export const locationAvailability = pgTable("location_availability", {
    id: serial("id").primaryKey(),
    locationId: integer("location_id").notNull().references(() => locations.id), // <-- FK
    dayOfWeek: integer("day_of_week").notNull(),
    openTime: text("open_time").notNull(),
    closeTime: text("close_time").notNull(),
})

/**
 * Representa la configuración del sistema en la base de datos.
 *
 * @description
 * Esta tabla almacena pares clave-valor para configuraciones globales del sistema.
 * Cada registro contiene una configuración específica con su valor actual y descripción.
 * Las configuraciones son editables solo por la administradora y los cambios
 * afectan el comportamiento global de la aplicación.
 *
 * Reglas y consideraciones:
 *  - Cada clave debe ser única en todo el sistema.
 *  - Los valores se almacenan como texto pero pueden representar diferentes tipos de datos.
 *
 * Campos:
 *  - id: Identificador único de la configuración.
 *  - key: Clave única que identifica la configuración.
 *  - value: Valor actual de la configuración.
 *  - description: Descripción del propósito y uso de la configuración.
 *  - updatedAt: Fecha y hora de la última actualización.
 *  - updatedBy: ID del usuario que realizó la última actualización.
 */
export const systemConfig = pgTable("system_config", {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(),
    value: text("value").notNull(),
    description: text("description").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    updatedBy: integer("updated_by"), // User ID who last updated this setting
});

export const locations = pgTable("locations", {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    description: text("description").notNull(),
    address: text("address").notNull(),
    imageUrl: text("image_url").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
});

/**
 * Logs del sistema
 *
 * @description
 * Esta tabla almacena registros de eventos del sistema, incluyendo errores, advertencias e información
 * general. Los logs son útiles para monitoreo, auditoría y diagnóstico de problemas.
 *
 * Campos:
 *  - id: Identificador único del log.
 *  - createdAt: Timestamp del evento (creación del log).
 *  - severity: Nivel de severidad: INFO, WARN, ERROR, CRITICAL (controlado por app).
 *  - message: Mensaje del log.
 *  - stack: Stack trace opcional (para errores).
 *  - endpoint: Endpoint de la API relacionado con el evento.
 *  - userId: ID del usuario relacionado con el evento (si aplica).
 *  - userAgent: Información del agente de usuario (navegador, OS, etc.).
 *  - url: URL solicitada.
 */
export const systemLogs = pgTable("system_logs", {
    id: serial("id").primaryKey(),
    // Timestamp del evento (creación del log)
    createdAt: timestamp("created_at").notNull().defaultNow(),
    // Nivel de severidad: INFO, WARN, ERROR, CRITICAL (controlado por app)
    severity: text("severity").notNull(),
    // Mensaje y stack opcional
    message: text("message").notNull(),
    stack: text("stack"),
    // Metadatos de trazabilidad
    endpoint: text("endpoint"),
    userId: integer("user_id"),
    userAgent: text("user_agent"),
    url: text("url"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users)
    .pick({
        username: true,
        password: true,
        fullName: true,
        role: true,
        email: true,
        phone: true,
        specialty: true,
        bio: true,
        profileImageUrl: true,
        isActive: true,
        paymentStatus: true,
        professionalType: true,
        professionalTypeDetails: true,
        professionalLicense: true,
        identificationUrl: true,
        diplomaUrl: true,
        bookingCount: true,
        documentationStatus: true,
    })
    .extend({
        username: z.string().min(4, 'El nombre de usuario debe tener al menos 4 caracteres').max(50),
        password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
        fullName: z.string().min(3, 'El nombre completo debe tener al menos 3 caracteres'),
        email: z.string().email('Debe ser un correo electrónico válido'),
        phone: z.string().optional(),
        specialty: z.string().optional(),
        bio: z.string().optional(),
        profileImageUrl: z.string().optional(),
        role: z.enum(['admin', 'standard', 'trusted', 'vip', 'monthly'], {
            errorMap: () => ({ message: 'Rol inválido' })
        }),
        professionalType: z.enum(['psychologist', 'nutritionist', 'doctor', 'other']).optional(),
        professionalTypeDetails: z.string().optional(),
        professionalLicense: z.string().optional(),
        identificationUrl: z.string().optional(),
        diplomaUrl: z.string().optional(),
        documentationStatus: z.enum(['none','pending','approved','rejected']).optional().default('none'),
        isActive: z.boolean().optional().default(true),
        paymentStatus: z.enum(['active', 'pending', 'inactive']).optional().default('inactive'),
        bookingCount: z.number().optional().default(0),
    });

export const insertRoomSchema = createInsertSchema(rooms).pick({
    name: true,
    description: true,
    locationId: true,
    price: true,
    imageUrl: true,
    features: true,
    isActive: true,
});

export const insertBookingSchema = createInsertSchema(bookings).pick({
    roomId: true,
    userId: true,
    date: true,
    startTime: true,
    endTime: true,
    notes: true,
    status: true,
});

export const insertAvailabilitySchema = createInsertSchema(availability).pick({
    roomId: true,
    dayOfWeek: true,
    openTime: true,
    closeTime: true,
    isClosed: true,
});


/**
 * Valida los datos de entrada al crear o actualizar un horario de disponibilidad
 * para una sede (Location).
 *
 * @description
 * Este schema asegura que solo se reciban los campos necesarios para crear un horario,
 * y que cumplan con reglas mínimas de consistencia:
 *
 *  - locationId debe existir y corresponder a una sede válida.
 *  - dayOfWeek debe estar entre 1 (Lunes) y 7 (Domingo).
 *  - openTime y closeTime son cadenas de tiempo (`HH:MM`) y openTime debe ser menor que closeTime.
 *  - No se permite más de un horario por día por sede.

 * @response 201 {LocationAvailability} Registro creado correctamente.
 * @response 500 {object} Error interno del servidor.
 */
export const insertLocationAvailabilitySchema = createInsertSchema(locationAvailability).pick({
    locationId: true,
    dayOfWeek:  true,
    openTime: true,
    closeTime: true,
})

export const insertLocationAvailabilityClientSchema = createInsertSchema(locationAvailability).pick({
    dayOfWeek:  true,
    openTime: true,
    closeTime: true,
})

export const insertSystemConfigSchema = createInsertSchema(systemConfig).pick({
    key: true,
    value: true,
    description: true,
    updatedBy: true,
});

export const insertLocationSchema = createInsertSchema(locations).pick({
    name: true,
    description: true,
    address: true,
    imageUrl: true,
    isActive: true,
});

export const insertPaymentBookingSchema = createInsertSchema(payments).pick({
    userId: true,
    bookingId: true,
    amount: true,
    concept: true,
})

export const insertPaymentSuscriptionSchema = createInsertSchema(payments).pick({
    userId: true,
    amount: true,
    concept: true,
})

export const insertSystemLogSchema = z.object({
    severity: z.enum(["INFO", "WARN", "ERROR", "CRITICAL"]).default("ERROR"),
    message: z.string().min(1),
    stack: z.string().optional(),
    endpoint: z.string().optional(),
    userId: z.number().int().optional(),
    userAgent: z.string().optional(),
    url: z.string().optional(),
});

// Tabla de eventos de pagos (webhooks Stripe) para idempotencia y auditoría
export const paymentEvents = pgTable("payment_events", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  paymentIntentId: text("payment_intent_id"),
  type: text("type").notNull(),
  payload: text("payload"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;

export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type LocationAvailability = typeof locationAvailability.$inferSelect;
export type InsertLocationAvailability = z.infer<typeof insertLocationAvailabilitySchema>;

export type InsertLocationAvailabilityClient = z.infer<typeof insertLocationAvailabilityClientSchema>;

export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;


export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentBookingSchema>;
export type InsertPaymentSuscription = z.infer<typeof insertPaymentSuscriptionSchema>;

export type PaymentEvent = typeof paymentEvents.$inferSelect;
