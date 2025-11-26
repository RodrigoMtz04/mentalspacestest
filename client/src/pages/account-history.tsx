import { useState } from 'react';
import { useAccountHistory, AccountHistoryResponse, AccountHistoryPayment } from '@/hooks/use-account-history';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCcw } from 'lucide-react';

const STATUS_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'Exitosos', value: 'exitoso' },
  { label: 'Fallidos', value: 'fallido' },
  { label: 'Reembolsados', value: 'reembolsado' },
  { label: 'Pendientes', value: 'pending' },
];

export default function AccountHistoryPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const historyQuery = useAccountHistory({ page, status, dateFrom, dateTo });
  const isRefetching = historyQuery.isRefetching;

  const handleFilter = () => {
    setPage(1);
    historyQuery.refetch();
  };
  const handleClear = () => {
    setStatus(''); setDateFrom(''); setDateTo(''); setPage(1); historyQuery.refetch();
  };
  const handleExportCsv = () => {
    const data = historyQuery.data as AccountHistoryResponse | undefined;
    if (!data || !data.data.length) return;
    const header = ['id','fecha','concepto','monto','estado','metodo'];
    const rows = data.data.map((p: AccountHistoryPayment) => [p.id, p.createdAt || '', p.concept, p.amount, p.status || '', p.method || '']);
    const csv = [header.join(','), ...rows.map((r: any[]) => r.map((v: unknown) => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'historial_pagos.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const loading = historyQuery.isLoading;
  const data = historyQuery.data as AccountHistoryResponse | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Historial de pagos</h1>
        <div className="flex gap-2 flex-wrap">
          <Select value={status} onValueChange={(v) => setStatus(v)}>
            <SelectTrigger className="w-[160px]" aria-label="Filtrar por estado"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[150px]" aria-label="Fecha desde" />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[150px]" aria-label="Fecha hasta" />
          <Button variant="outline" onClick={handleFilter} disabled={historyQuery.isLoading || isRefetching}>{isRefetching ? <RefreshCcw className="h-4 w-4 animate-spin" /> : 'Filtrar'}</Button>
          <Button variant="ghost" onClick={handleClear} disabled={historyQuery.isLoading || isRefetching}>Limpiar</Button>
          <Button variant="outline" onClick={handleExportCsv} disabled={!data || data.total===0}><Download className="h-4 w-4 mr-1" />CSV</Button>
        </div>
      </div>
      <Card className="p-4">
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        )}
        {!loading && data && data.total === 0 && (
          <p className="text-muted-foreground">{data.message || 'No hay pagos registrados.'}</p>
        )}
        {!loading && data && data.total > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Concepto</th>
                  <th className="py-2">Monto</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2">Método</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((p: AccountHistoryPayment) => {
                  const fecha = p.createdAt ? new Date(p.createdAt) : null;
                  const fechaFmt = fecha ? fecha.toLocaleString() : '—';
                  const montoFmt = new Intl.NumberFormat('es-MX',{ style:'currency', currency:'MXN'}).format(Number(p.amount || 0));
                  const statusKey = (p.status||'').toLowerCase();
                  const statusVariant = statusKey === 'succeeded' || statusKey === 'paid' ? 'success' : statusKey === 'pending' ? 'warning' : statusKey === 'refunded' ? 'secondary' : statusKey === 'canceled' || statusKey === 'failed' ? 'destructive' : 'outline';
                  const statusLabelMap: Record<string,string> = { succeeded:'Exitoso', paid:'Pagado', pending:'Pendiente', refunded:'Reembolsado', canceled:'Cancelado', failed:'Fallido' };
                  const statusLabel = statusLabelMap[statusKey] || (p.status || '');
                  return (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 whitespace-nowrap">{fechaFmt}</td>
                      <td className="py-2 max-w-[320px] truncate" title={p.concept}>{p.concept}</td>
                      <td className="py-2 whitespace-nowrap">{montoFmt}</td>
                      <td className="py-2">
                        <Badge variant={statusVariant as any}>{statusLabel || '—'}</Badge>
                      </td>
                      <td className="py-2 whitespace-nowrap">{p.method || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="flex justify-between items-center mt-4">
              <span className="text-xs text-muted-foreground">Página {data.page} de {Math.ceil(data.total / data.pageSize)}</span>
              <div className="flex gap-2 items-center">
                <Button variant="outline" disabled={page <= 1 || historyQuery.isLoading} onClick={() => setPage(p => Math.max(1, p-1))}>Anterior</Button>
                <Button variant="outline" disabled={data.page * data.pageSize >= data.total || historyQuery.isLoading} onClick={() => setPage(p => p+1)}>Siguiente</Button>
                {isRefetching && <span className="text-xs text-muted-foreground flex items-center"><RefreshCcw className="h-3 w-3 animate-spin mr-1" />Actualizando…</span>}
              </div>
            </div>
          </div>
        )}
        {historyQuery.isError && (
          <p className="text-red-600 text-sm mt-2">{(historyQuery.error as any)?.message || 'Error cargando historial. Intenta nuevamente.'}</p>
        )}
      </Card>
    </div>
  );
}
