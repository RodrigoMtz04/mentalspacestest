import {db} from "../../persistencia/db.ts";
import { InsertPayment, Payment, payments, users } from "@shared/schema.ts";
import { and, eq, sql, gte, lte, desc } from "drizzle-orm";
import { invalidateAccountSummaryCache } from './accountStorage.ts';

export interface interPaymentStorage {
    getPayment(paymentID: number): Promise<Payment>
    getAllPayments(): Promise<Payment[]>
    getPaymentByUser(userID: number): Promise<Payment[]>
    getPaymentByUserAndStatus(userID: number, status: string): Promise<Payment[]>
    createPayment(payment: InsertPayment): Promise<Payment>
    updatePaymentStatus(paymentID: number, status: string, method: string): Promise<Payment>
    //paymentAmountDiscount(paymentID: number, amount: number): Promise<Payment>                 //Marco R. - Se me ocurrio ponerlo, pero no se nos solicito
    paymentPercentageDiscount(paymentID: number, percentage: number): Promise<Payment>         //           asi que mejor lo quite. UPDATE: Al final si necesite el descuento, para hacer la penalizacion
    // Nuevos métodos para Stripe
    getByPaymentIntentId(paymentIntentId: string): Promise<Payment | null>
    getByIdempotencyKey(idempotencyKey: string): Promise<Payment | null>
    createStripePaymentRecord(data: {
        userId: number;
        amount: string;
        concept: string;
        bookingId?: number | null;
        currency: string;
        paymentIntentId: string;
        idempotencyKey: string;
        method?: string;
        status?: string;
    }): Promise<Payment>
    updateByPaymentIntentId(paymentIntentId: string, patch: Partial<Payment>): Promise<Payment | null>
    // Eventos de webhooks
    recordPaymentEvent(event: { eventId: string; paymentIntentId?: string | null; type: string; payload?: string | null }): Promise<void>
    hasPaymentEvent(eventId: string): Promise<boolean>
    listPayments(params: { userId?: number; status?: string; dateFrom?: Date; dateTo?: Date; page?: number; pageSize?: number }): Promise<{ rows: any[]; total: number }>
    getPaymentByIntentId(paymentIntentId: string): Promise<Payment | null>
    getLastSucceededPaymentForUser(userId: number): Promise<Payment | null>
}

export class DBPaymentStorage implements interPaymentStorage {
    async paymentPercentageDiscount(paymentID: number, percentage: number): Promise<Payment>
    {
        const payment = await db.select().from(payments).where(eq(payments.id, paymentID)).limit(1);

        if (!payment) throw new Error("Pago no encontrado");
        if (percentage < 0 || percentage > 100) throw new Error("Porcentaje inválido");
        const amount = parseFloat(payment[0].amount)
        const discountAmount = (amount * percentage) / 100;
        const newAmount = amount - discountAmount;

        const [updatedPayment] = await db
            .update(payments)
            .set({ amount: newAmount.toString() })
            .where(eq(payments.id, paymentID))
            .returning();
        invalidateAccountSummaryCache(updatedPayment.userId);
        return updatedPayment;
    }
    async getPaymentByBooking(bookingId: number): Promise<Payment | null> {
        const result = await db.select().from(payments).where(eq(payments.bookingId, bookingId)).limit(1);
        return result[0] ?? null;
    }
    async getPayment(paymentID: number): Promise<Payment> {
        const result = await db.select().from(payments).where(eq(payments.id, paymentID));
        return result[0];
    }
    async getAllPayments(): Promise<Payment[]> {
        return db.select().from(payments);
    }
    async getPaymentByUser(userID: number): Promise<Payment[]> {
        return db.select().from(payments).where(eq(payments.userId, userID));
    }
    async getPaymentByUserAndStatus(userID: number, status: string): Promise<Payment[]> {
        return db.select().from(payments).where(and(eq(payments.userId, userID), eq(payments.status, status)));
    }
    async createPayment(payment: InsertPayment): Promise<Payment> {
        const result = await db.insert(payments).values(payment as any).returning();
        const created = result[0];
        invalidateAccountSummaryCache(created.userId);
        return created;
    }
    async updatePaymentStatus(paymentID: number, status: string, method: string): Promise<Payment> {
        const result = await db.update(payments).set({status: status, method: method}).where(eq(payments.id, paymentID)).returning();
        const updated = result[0];
        invalidateAccountSummaryCache(updated.userId);
        return updated;
    }
    async getByPaymentIntentId(paymentIntentId: string): Promise<Payment | null> {
        const rows = await db.select().from(payments).where(eq(payments.paymentIntentId, paymentIntentId)).limit(1);
        return rows[0] ?? null;
    }
    async getByIdempotencyKey(idempotencyKey: string): Promise<Payment | null> {
        const rows = await db.select().from(payments).where(eq(payments.idempotencyKey, idempotencyKey)).limit(1);
        return rows[0] ?? null;
    }
    async createStripePaymentRecord(data: {
        userId: number;
        amount: string;
        concept: string;
        bookingId?: number | null;
        currency: string;
        paymentIntentId: string;
        idempotencyKey: string;
        method?: string;
        status?: string;
    }): Promise<Payment> {
        const payload: any = {
            userId: data.userId,
            amount: data.amount,
            concept: data.concept,
            bookingId: data.bookingId ?? null,
            currency: data.currency,
            paymentIntentId: data.paymentIntentId,
            idempotencyKey: data.idempotencyKey,
            method: data.method ?? 'stripe',
            status: data.status ?? 'pending',
        };
        const res = await db.insert(payments).values(payload).returning();
        const created = res[0];
        invalidateAccountSummaryCache(created.userId);
        return created;
    }
    async updateByPaymentIntentId(paymentIntentId: string, patch: Partial<Payment>): Promise<Payment | null> {
        const res = await db.update(payments)
            .set(patch as any)
            .where(eq(payments.paymentIntentId, paymentIntentId))
            .returning();
        const updated = res[0] ?? null;
        if (updated) invalidateAccountSummaryCache(updated.userId);
        return updated;
    }
    async hasPaymentEvent(eventId: string): Promise<boolean> {
        const res: any = await db.execute(sql`SELECT 1 FROM payment_events WHERE event_id = ${eventId} LIMIT 1`);
        // node-postgres devuelve rows
        const rows = (res as any)?.rows ?? [];
        return rows.length > 0;
    }
    async recordPaymentEvent(event: { eventId: string; paymentIntentId?: string | null; type: string; payload?: string | null }): Promise<void> {
        await db.execute(sql`
          INSERT INTO payment_events (event_id, payment_intent_id, type, payload)
          VALUES (${event.eventId}, ${event.paymentIntentId ?? null}, ${event.type}, ${event.payload ?? null})
          ON CONFLICT (event_id) DO NOTHING
        `);
    }
    async listPayments(params: { userId?: number; status?: string; dateFrom?: Date; dateTo?: Date; page?: number; pageSize?: number }): Promise<{ rows: any[]; total: number }> {
        const { userId, status, dateFrom, dateTo, page = 1, pageSize = 20 } = params;
        const offset = Math.max(0, (page - 1) * pageSize);

        // Construir condiciones dinámicas con el builder de Drizzle
        const conds: any[] = [];
        if (userId) conds.push(eq(payments.userId, userId));
        if (status) conds.push(eq(payments.status, status));
        if (dateFrom) conds.push(gte(payments.createdAt, dateFrom));
        if (dateTo) conds.push(lte(payments.createdAt, dateTo));
        const whereExpr = conds.length === 0 ? undefined : (conds.length === 1 ? conds[0] : and(...conds));

        const rows = await db
          .select({
            id: payments.id,
            userId: payments.userId,
            bookingId: payments.bookingId,
            amount: payments.amount,
            status: payments.status,
            method: payments.method,
            payment_date: payments.payment_date,
            concept: payments.concept,
            currency: payments.currency,
            paymentIntentId: payments.paymentIntentId,
            idempotencyKey: payments.idempotencyKey,
            createdAt: payments.createdAt,
            user_full_name: users.fullName,
            user_email: users.email,
          })
          .from(payments)
          .leftJoin(users, eq(users.id, payments.userId))
          .where(whereExpr as any)
          .orderBy(desc(payments.createdAt))
          .limit(pageSize)
          .offset(offset);

        const totalRes = await db
          .select({ c: sql<number>`count(*)::int` })
          .from(payments)
          .where(whereExpr as any);
        const total = totalRes?.[0]?.c ?? 0;

        return { rows: rows as any[], total };
    }
    async getPaymentByIntentId(paymentIntentId: string): Promise<Payment | null> {
        return this.getByPaymentIntentId(paymentIntentId);
    }
    async getLastSucceededPaymentForUser(userId: number): Promise<Payment | null> {
        const rows = await db
            .select()
            .from(payments)
            .where(and(eq(payments.userId, userId), eq(payments.status, 'succeeded')))
            .orderBy(desc(payments.createdAt))
            .limit(1);
        return rows?.[0] ?? null;
    }
}

export const paymentStorage = new DBPaymentStorage();