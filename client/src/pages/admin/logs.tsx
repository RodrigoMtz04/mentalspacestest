import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// Tipos mínimos para la respuesta del backend
type LogRow = {
  id: number;
  createdAt: string; // ISO string
  severity: string;
  message: string;
  stack?: string | null;
  endpoint?: string | null;
  userId?: number | null;
  userAgent?: string | null;
  url?: string | null;
};

type LogsResponse = {
  data: LogRow[];
  total: number;
  page: number;
  pageSize: number;
};

const severityColors: Record<string, string> = {
  INFO: "bg-blue-100 text-blue-800",
  WARN: "bg-yellow-100 text-yellow-800",
  ERROR: "bg-red-100 text-red-800",
  CRITICAL: "bg-fuchsia-100 text-fuchsia-800",
};

export default function AdminLogsPage() {
  // filtros
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [severity, setSeverity] = useState<string>("ALL");
  const [moduleLike, setModuleLike] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  // ordenamiento
  const [sort, setSort] = useState<'createdAt' | 'severity'>("createdAt");
  const [dir, setDir] = useState<'asc' | 'desc'>("desc");

  // detalle modal
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<LogRow | null>(null);

  const queryParams = useMemo(() => {
    const q = new URLSearchParams();
    if (fromDate) q.set("fromDate", fromDate);
    if (toDate) q.set("toDate", toDate);
    if (severity && severity !== "ALL") q.set("severity", severity);
    if (moduleLike) q.set("module", moduleLike);
    if (userId) q.set("user", userId);
    q.set("page", String(page));
    q.set("pageSize", String(pageSize));
    if (sort) q.set("sort", sort);
    if (dir) q.set("dir", dir);
    return q.toString();
  }, [fromDate, toDate, severity, moduleLike, userId, page, sort, dir]);

  const query = useQuery<LogsResponse>({
    queryKey: ["/api/logs", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/logs?${queryParams}`, { credentials: "include", cache: "no-cache" });
      if (res.status === 401 || res.status === 403) {
        throw new Error("No autorizado");
      }
      if (!res.ok) throw new Error("Error al cargar logs");
      return res.json();
    },
    refetchInterval: 15000,
    placeholderData: (prev) => prev as LogsResponse | undefined,
    staleTime: 10_000,
  });

  const logs = query.data as LogsResponse | undefined;
  const total = logs?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    // si cambian filtros, regresar a la página 1
    setPage(1);
  }, [fromDate, toDate, severity, moduleLike, userId, sort, dir]);

  const toggleSort = (field: 'createdAt' | 'severity') => {
    if (sort === field) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field);
      setDir('asc');
    }
  };

  const sortIndicator = (field: 'createdAt' | 'severity') => {
    if (sort !== field) return null;
    return <span className="ml-1 text-xs">{dir === 'asc' ? '▲' : '▼'}</span>;
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Logs de auditoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="flex flex-col">
              <label className="text-xs text-neutral-500 mb-1">Desde</label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-neutral-500 mb-1">Hasta</label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-neutral-500 mb-1">Severidad</label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue placeholder="Nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="INFO">INFO</SelectItem>
                  <SelectItem value="WARN">WARN</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                  <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-neutral-500 mb-1">Módulo/endpoint</label>
              <Input placeholder="/api/..." value={moduleLike} onChange={e => setModuleLike(e.target.value)} />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-neutral-500 mb-1">Usuario (ID)</label>
              <Input placeholder="ID" value={userId} onChange={e => setUserId(e.target.value)} />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-neutral-500 mb-1">Orden</label>
              <div className="flex gap-2">
                <Select value={sort} onValueChange={(v: any) => setSort(v)}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Fecha</SelectItem>
                    <SelectItem value="severity">Severidad</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dir} onValueChange={(v: any) => setDir(v)}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Asc</SelectItem>
                    <SelectItem value="desc">Desc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="outline" onClick={() => { setFromDate(""); setToDate(""); setSeverity("ALL"); setModuleLike(""); setUserId(""); setSort("createdAt"); setDir("desc"); }}>Limpiar</Button>
            <Button onClick={() => query.refetch()} disabled={query.isFetching}>
              {query.isFetching ? "Actualizando..." : "Aplicar filtros"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px] cursor-pointer select-none" onClick={() => toggleSort('createdAt')}>Fecha {sortIndicator('createdAt')}</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('severity')}>Nivel {sortIndicator('severity')}</TableHead>
                  <TableHead>Descripción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.data?.map((row: LogRow) => (
                  <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelected(row); setOpen(true); }}>
                    <TableCell className="text-sm">{new Date(row.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{row.userId ?? "—"}</TableCell>
                    <TableCell className="text-sm">{row.endpoint ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={severityColors[row.severity] || "bg-muted text-foreground"}>{row.severity}</Badge>
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-[420px]">{row.message}</TableCell>
                  </TableRow>
                ))}
                {(!logs || logs.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">Sin resultados</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between p-3">
            <div className="text-xs text-muted-foreground">{total} registros · página {page} de {totalPages}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Anterior</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Siguiente</Button>
              <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>Refrescar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle del log</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-2">
              <div className="text-sm"><span className="font-medium">Fecha:</span> {new Date(selected.createdAt).toLocaleString()}</div>
              <div className="text-sm"><span className="font-medium">Usuario:</span> {selected.userId ?? "—"}</div>
              <div className="text-sm"><span className="font-medium">Nivel:</span> {selected.severity}</div>
              <div className="text-sm"><span className="font-medium">Módulo:</span> {selected.endpoint ?? "—"}</div>
              <div className="text-sm"><span className="font-medium">URL:</span> {selected.url ?? "—"}</div>
              <div className="text-sm"><span className="font-medium">Agente:</span> {selected.userAgent ?? "—"}</div>
              <div className="text-sm"><span className="font-medium">Mensaje:</span></div>
              <pre className="bg-muted p-2 rounded text-xs overflow-auto whitespace-pre-wrap">{selected.message}</pre>
              {selected.stack && (
                <>
                  <div className="text-sm"><span className="font-medium">Stack trace:</span></div>
                  <pre className="bg-muted p-2 rounded text-xs overflow-auto whitespace-pre-wrap max-h-80">{selected.stack}</pre>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
