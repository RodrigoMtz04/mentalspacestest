import type { Router } from "express";
import { systemLogsStorage } from "../../negocio/storage/systemLogsStorage";
import { asyncRoute, isAdmin } from "./middleware";

// Rutas relacionadas con logs/auditora del sistema
export function registerLogsRoutes(router: Router) {
  router.get('/logs', isAdmin, asyncRoute(async (req, res) => {
    const { fromDate, toDate, severity, module, user, page = '1', pageSize = '20', sort, dir } = req.query as Record<string,string|undefined>;
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;
    const severities = severity ? [severity] : undefined;
    const userId = user ? parseInt(user,10) : undefined;
    const pageNum = Math.max(1, parseInt(page,10));
    const sizeNum = Math.min(100, Math.max(1, parseInt(pageSize,10)));
    const { rows, total } = await systemLogsStorage.listLogs({ fromDate: from, toDate: to, severities, moduleLike: module, userId, page: pageNum, pageSize: sizeNum, sort: sort as any, dir: dir as any });

    const mask = (text?: string | null) => !text ? text : text
      .replace(/Bearer\s+[A-Za-z0-9\-_.~+/=]+/gi, 'Bearer ***')
      .replace(/(password|token|authorization|apiKey)=([^&\s]+)/gi, '$1=***')
      .slice(0,20000);

    const data = rows.map(r => ({ ...r, message: mask(r.message) as string, stack: mask(r.stack ?? undefined) ?? null }));
    res.json({ data, total, page: pageNum, pageSize: sizeNum });
  }));
}
