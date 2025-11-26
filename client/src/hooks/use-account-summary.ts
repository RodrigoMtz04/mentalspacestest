import { useQuery } from '@tanstack/react-query';

export interface AccountSummary {
  balance: string;
  totalPaid: string;
  pendingCharges: string;
  upcomingPayments: { nextPaymentDate: string | null } | null;
  recentMovements: { id: number; amount: string; status: string | null; concept: string; createdAt: string | null }[];
  hasMovements: boolean;
  message?: string;
}

async function fetchAccountSummary(): Promise<AccountSummary> {
  const res = await fetch('/api/account/summary', { credentials: 'include' });
  if (!res.ok) throw new Error('Error al cargar resumen de cuenta');
  return res.json();
}

export function useAccountSummary() {
  return useQuery<AccountSummary>({
    queryKey: ['account','summary'],
    queryFn: fetchAccountSummary,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

