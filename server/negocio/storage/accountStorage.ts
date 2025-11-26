import { db } from "../../persistencia/db.ts";
import { payments, users } from "@shared/schema.ts";
import { and, eq, desc, sql } from "drizzle-orm";
import { systemLogsStorage } from "./systemLogsStorage.ts";

// Cache en memoria para summaries por usuario
interface CachedSummary { data: AccountSummary; ts: number; }
const ACCOUNT_SUMMARY_TTL_MS = 60_000; // 60 segundos
const accountSummaryCache = new Map<number, CachedSummary>();

export interface AccountMovement {
  id: number; amount: string; status: string | null; concept: string; createdAt: string | null;
}
export interface AccountSummary {
  balance: string; // saldo actual (por ahora = cargos pendientes)
  totalPaid: string; // total pagado (succeeded/paid)
  pendingCharges: string; // total pendiente (pending / requires_payment_method / processing)
  upcomingPayments: { nextPaymentDate: string | null } | null; // proximo vencimiento estimado
  recentMovements: AccountMovement[]; // ultimos movimientos
  hasMovements: boolean; // indica si hay movimientos
}

export function invalidateAccountSummaryCache(userId: number) {
  accountSummaryCache.delete(userId);
}

export class DBAccountStorage {
  async getAccountSummary(userId: number): Promise<AccountSummary> {
    const now = Date.now();
    const cached = accountSummaryCache.get(userId);
    if (cached && (now - cached.ts) < ACCOUNT_SUMMARY_TTL_MS) {
      return cached.data;
    }

    // Total pagado
    const totalPaidRows = await db.execute(sql`SELECT COALESCE(SUM(amount),0) AS total_paid FROM payments WHERE user_id = ${userId} AND (payment_status = 'succeeded' OR payment_status = 'paid')`);
    const totalPaid = (totalPaidRows as any).rows?.[0]?.total_paid ?? '0';

    // Pendiente
    const pendingRows = await db.execute(sql`SELECT COALESCE(SUM(amount),0) AS total_pending FROM payments WHERE user_id = ${userId} AND (payment_status IN ('pending','requires_payment_method','processing'))`);
    const pendingCharges = (pendingRows as any).rows?.[0]?.total_pending ?? '0';

    // Últimos movimientos (limit 10)
    const movements = await db
      .select({ id: payments.id, amount: payments.amount, status: payments.status, concept: payments.concept, createdAt: payments.createdAt })
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt))
      .limit(10);

    // Calcular próxima fecha de pago usando último pago succeeded
    const lastSucceeded = await db
      .select({ createdAt: payments.createdAt })
      .from(payments)
      .where(and(eq(payments.userId, userId), eq(payments.status, 'succeeded')))
      .orderBy(desc(payments.createdAt))
      .limit(1);

    let nextPaymentDate: string | null = null;
    if (lastSucceeded[0]?.createdAt) {
      const next = new Date(lastSucceeded[0].createdAt as any); next.setDate(next.getDate() + 30); nextPaymentDate = next.toISOString();
    }

    const summary: AccountSummary = {
      balance: pendingCharges, // definición actual
      totalPaid: totalPaid,
      pendingCharges: pendingCharges,
      upcomingPayments: { nextPaymentDate },
      recentMovements: movements.map(m => ({
        id: m.id,
        amount: m.amount as any,
        status: m.status as any,
        concept: String(m.concept || '').slice(0,200),
        createdAt: m.createdAt ? new Date(m.createdAt as any).toISOString() : null,
      })),
      hasMovements: movements.length > 0,
    };

    accountSummaryCache.set(userId, { data: summary, ts: now });
    try { await systemLogsStorage.createLog({ severity: 'INFO', message: `Resumen cuenta generado user=${userId}`, endpoint: '/api/account/summary', userId }); } catch {}
    return summary;
  }
}

export const accountStorage = new DBAccountStorage();

