import type { Router } from 'express';
import { asyncRoute, isAuthenticated } from './middleware';
import type { User as AppUser } from '@shared/schema';
import { accountStorage } from '../../negocio/storage/accountStorage';
import { paymentStorage } from '../../negocio/storage/paymentStorage';
import { systemLogsStorage } from '../../negocio/storage/systemLogsStorage';
import { auditSecure, sanitizePaymentRecord } from '../../negocio/security/accountSecurity.ts';

export function registerAccountRoutes(router: Router) {
  // GET /api/account/summary
  router.get('/account/summary', isAuthenticated, asyncRoute(async (req, res) => {
    // Rechazar intento de forzar otro userId vía query
    const requestedUserIdRaw = (req.query as any)?.userId;
    const authUser = req.user as AppUser;
    if (requestedUserIdRaw && parseInt(String(requestedUserIdRaw),10) !== authUser.id) {
      await auditSecure(req, 'WARN', `Intento de acceso a summary de otro usuario requested=${requestedUserIdRaw}`);
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    const summary = await accountStorage.getAccountSummary(authUser.id);
    await auditSecure(req, 'INFO', 'Consulta summary exitosa');
    if (!summary.hasMovements) {
      return res.json({ balance: summary.balance, totalPaid: summary.totalPaid, pendingCharges: summary.pendingCharges, upcomingPayments: summary.upcomingPayments, recentMovements: summary.recentMovements, hasMovements: false, message: 'No existen movimientos en tu cuenta.' });
    }
    res.json(summary);
  }));

  // GET /api/account/history
  router.get('/account/history', isAuthenticated, asyncRoute(async (req, res) => {
    const authUser = req.user as AppUser;
    const { page = '1', limit = '20', status = '', dateFrom = '', dateTo = '', userId } = req.query as Record<string,string>;
    if (userId && parseInt(userId,10) !== authUser.id) {
      await auditSecure(req, 'WARN', `Intento de acceso a history de otro usuario requested=${userId}`);
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    const pageNum = Math.max(1, parseInt(page,10) || 1);
    let pageSize = Math.max(1, parseInt(limit,10) || 20);
    if (pageSize > 100) pageSize = 100;
    const parseDate = (v: string) => { if (!v) return undefined; const d = new Date(v); return isNaN(d.getTime()) ? undefined : d; };
    const fromDate = parseDate(dateFrom);
    const toDate = parseDate(dateTo);
    if (fromDate && toDate && fromDate > toDate) {
      await auditSecure(req, 'WARN', 'Rango de fechas inválido');
      return res.status(400).json({ message: 'dateFrom no puede ser mayor que dateTo' });
    }
    const statusMap: Record<string,string[]> = { '': [], 'exitoso': ['succeeded','paid'], 'fallido': ['canceled','failed'], 'reembolsado': ['refunded'], 'succeeded': ['succeeded'], 'paid': ['paid'], 'pending': ['pending'], 'canceled': ['canceled'], 'refunded': ['refunded'] };
    const statusKey = status.toLowerCase();
    const statusValues = statusMap[statusKey] || [];
    let rows: any[] = []; let total = 0;
    if (statusValues.length <= 1) {
      const singleStatus = statusValues[0];
      const { rows: listRows, total: listTotal } = await paymentStorage.listPayments({ userId: authUser.id, status: singleStatus, dateFrom: fromDate, dateTo: toDate, page: pageNum, pageSize });
      rows = listRows; total = listTotal;
    } else {
      for (const st of statusValues) {
        const { rows: partRows } = await paymentStorage.listPayments({ userId: authUser.id, status: st, dateFrom: fromDate, dateTo: toDate, page: 1, pageSize: 1000 });
        rows.push(...partRows);
      }
      rows.sort((a,b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime());
      total = rows.length;
      const start = (pageNum-1)*pageSize; rows = rows.slice(start, start+pageSize);
    }
    const sanitize = rows.map(sanitizePaymentRecord);
    await auditSecure(req, 'INFO', `Consulta history exitosa total=${total}`);
    if (total === 0) {
      return res.json({ data: [], total: 0, page: pageNum, pageSize, message: 'No hay pagos registrados.' });
    }
    res.json({ data: sanitize, total, page: pageNum, pageSize });
  }));
}
