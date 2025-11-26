import { useAccountSummary } from '@/hooks/use-account-summary';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function Stat({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex flex-col p-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold">{value ?? '—'}</span>
    </div>
  );
}

export default function AccountSummaryPage() {
  const { data, isLoading, isError, refetch } = useAccountSummary();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">Error cargando resumen de cuenta.</p>
        <button className="btn" onClick={() => refetch()}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Resumen de cuenta</h1>
        <button onClick={() => refetch()} className="border px-3 py-1 rounded text-sm">Refrescar</button>
      </div>
      <Card className="p-4 grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="Saldo actual" value={data.balance} />
        <Stat label="Total pagado" value={data.totalPaid} />
        <Stat label="Cargos pendientes" value={data.pendingCharges} />
        <Stat label="Próximo pago" value={data.upcomingPayments?.nextPaymentDate ? new Date(data.upcomingPayments.nextPaymentDate).toLocaleDateString() : '—'} />
      </Card>
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-2">Movimientos recientes</h2>
        {!data.hasMovements && <p className="text-muted-foreground text-sm">{data.message || 'No existen movimientos en tu cuenta.'}</p>}
        {data.hasMovements && (
          <div className="divide-y">
            {data.recentMovements.map(m => (
              <div key={m.id} className="py-2 flex items-center justify-between text-sm">
                <div className="flex flex-col">
                  <span className="font-medium">{m.concept}</span>
                  <span className="text-xs text-muted-foreground">{m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}</span>
                </div>
                <div className="text-right">
                  <span className="block font-semibold">$ {m.amount}</span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{m.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

