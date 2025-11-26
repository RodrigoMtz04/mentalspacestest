import { db } from "../../persistencia/db.ts";
import { systemLogs } from "@shared/schema.ts";
import type { SystemLog, InsertSystemLog } from "@shared/schema.ts";
import { and, desc, eq, gte, ilike, inArray, lte, sql, asc } from "drizzle-orm";

export interface InterSystemLogsStorage {
  createLog(entry: InsertSystemLog): Promise<SystemLog>;
  listLogs(params: {
    fromDate?: Date;
    toDate?: Date;
    severities?: string[];
    moduleLike?: string; // filtra por endpoint contiene
    userId?: number;
    page?: number;
    pageSize?: number;
    sort?: 'createdAt' | 'severity';
    dir?: 'asc' | 'desc';
  }): Promise<{ rows: SystemLog[]; total: number }>;
}

export class DBSystemLogsStorage implements InterSystemLogsStorage {
  async createLog(entry: InsertSystemLog): Promise<SystemLog> {
    const result = await db.insert(systemLogs).values(entry).returning();
    return result[0];
  }

  async listLogs(params: {
    fromDate?: Date;
    toDate?: Date;
    severities?: string[];
    moduleLike?: string;
    userId?: number;
    page?: number;
    pageSize?: number;
    sort?: 'createdAt' | 'severity';
    dir?: 'asc' | 'desc';
  }): Promise<{ rows: SystemLog[]; total: number }> {
    const {
      fromDate,
      toDate,
      severities,
      moduleLike,
      userId,
      page = 1,
      pageSize = 20,
      sort = 'createdAt',
      dir = 'desc',
    } = params;

    const whereClauses = [] as any[];
    if (fromDate) whereClauses.push(gte(systemLogs.createdAt, fromDate));
    if (toDate) whereClauses.push(lte(systemLogs.createdAt, toDate));
    if (severities && severities.length > 0) whereClauses.push(inArray(systemLogs.severity, severities));
    if (moduleLike && moduleLike.trim().length > 0) whereClauses.push(ilike(systemLogs.endpoint, `%${moduleLike}%`));
    if (userId) whereClauses.push(eq(systemLogs.userId, userId));

    const whereExpr = whereClauses.length > 0 ? and(...whereClauses) : undefined;

    const offset = Math.max(0, (page - 1) * pageSize);

    const orderExpr = (() => {
      if (sort === 'severity') {
        return dir === 'asc' ? asc(systemLogs.severity) : desc(systemLogs.severity);
      }
      // default createdAt
      return dir === 'asc' ? asc(systemLogs.createdAt) : desc(systemLogs.createdAt);
    })();

    const rows = await db
      .select()
      .from(systemLogs)
      .where(whereExpr as any)
      .orderBy(orderExpr as any)
      .limit(pageSize)
      .offset(offset);

    const totalRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(systemLogs)
      .where(whereExpr as any);

    const total = Number(totalRes[0]?.count ?? 0);

    return { rows, total };
  }
}

export const systemLogsStorage = new DBSystemLogsStorage();
