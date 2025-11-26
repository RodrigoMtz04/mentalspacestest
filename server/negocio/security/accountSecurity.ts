import type { Request } from 'express';
import { systemLogsStorage } from '../storage/systemLogsStorage';

// Sanitiza un registro de pago para exponerlo al cliente evitando campos sensibles.
export function sanitizePaymentRecord(row: any) {
  return {
    id: row.id,
    createdAt: row.createdAt ?? null,
    payment_date: row.payment_date ?? null,
    amount: row.amount,
    status: row.status,
    method: row.method ?? null,
    concept: String(row.concept || '').slice(0, 200),
  };
}

export async function auditSecure(req: Request, severity: 'INFO'|'WARN'|'ERROR'|'CRITICAL', message: string) {
  try {
    await systemLogsStorage.createLog({
      severity,
      message: `${message} ip=${req.ip} ua=${req.headers['user-agent'] || ''}`.slice(0, 400),
      endpoint: req.path,
      userId: (req.user as any)?.id,
      url: req.originalUrl,
    } as any);
  } catch {/* swallow */}
}

