import { useQuery } from '@tanstack/react-query';

export interface AccountHistoryPayment {
  id: number;
  createdAt: string | null;
  payment_date: string | null;
  amount: string;
  status: string | null;
  method: string | null;
  concept: string;
}

export interface AccountHistoryResponse {
  data: AccountHistoryPayment[];
  total: number;
  page: number;
  pageSize: number;
  message?: string;
}

export function useAccountHistory(params: { page: number; pageSize?: number; status?: string; dateFrom?: string; dateTo?: string; enabled?: boolean }) {
  const { page, pageSize = 20, status = '', dateFrom = '', dateTo = '', enabled = true } = params;
  return useQuery<AccountHistoryResponse>({
    queryKey: ['account','history', page, pageSize, status, dateFrom, dateTo],
    queryFn: async () => {
      const q = new URLSearchParams();
      q.set('page', String(page));
      q.set('limit', String(pageSize));
      const trimmedStatus = status.trim();
      if (trimmedStatus) q.set('status', trimmedStatus.toLowerCase());
      if (dateFrom) q.set('dateFrom', dateFrom);
      if (dateTo) q.set('dateTo', dateTo);
      const res = await fetch(`/api/account/history?${q.toString()}`, { credentials: 'include' });
      if (!res.ok) {
        let message = 'Error al cargar historial';
        try {
          const j = await res.json();
          if (j?.message) message = j.message;
        } catch {
          try { const t = await res.text(); if (t) message = t; } catch {}
        }
        throw new Error(message);
      }
      return res.json();
    },
    placeholderData: () => ({ data: [], total: 0, page, pageSize, message: 'Cargando...' }),
    staleTime: 30_000,
    enabled,
    retry: 1,
  });
}
