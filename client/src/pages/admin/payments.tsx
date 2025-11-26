import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, Search, PlusCircle, CheckCircle2, AlertCircle, Receipt,
  CreditCard, Edit, Trash2, Lock,
  CreditCardIcon, Download
} from "lucide-react";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PaymentForm from "@/components/payments/PaymentForm";
import { queryClient } from "@/lib/queryClient";
import { useAccountHistory } from '@/hooks/use-account-history';
import type { AccountHistoryResponse, AccountHistoryPayment } from '@/hooks/use-account-history';

// Esquema para la edición de planes
const planFormSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  price: z.coerce.number().min(1, "El precio debe ser mayor a 0"),
  description: z.string().optional(),
  features: z.array(z.string()).default([]),
  newFeature: z.string().optional(),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

// Esquema para el procesamiento de pagos
const paymentFormSchema = z.object({
  userId: z.number(),
  amount: z.coerce.number().min(1, "El monto debe ser mayor a 0"),
  cardNumber: z.string().regex(/^\d{16}$/, "Debe ingresar un número de tarjeta válido"),
  cardholderName: z.string().min(3, "Ingrese el nombre como aparece en la tarjeta"),
  expiryDate: z.string().regex(/^\d{2}\/\d{2}$/, "Formato MM/YY requerido"),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV inválido"),
  concept: z.string().min(3, "Ingrese un concepto para el pago"),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

// Datos de planes de suscripción (ejemplo)
export type SubscriptionPlan = { id: number; name: string; price: number; features: string[]; description: string };
// Datos de ejemplo de planes (restaurado)
const subscriptionPlansData: SubscriptionPlan[] = [
  { id: 1, name: "Plan Básico", price: 199, features: ["1 consultorio", "10 horas/mes", "Soporte básico"], description: "Ideal para terapeutas que inician" },
  { id: 2, name: "Plan Estándar", price: 349, features: ["2 consultorios", "20 horas/mes", "Soporte prioritario"], description: "Nuestra recomendación para profesionales establecidos" },
  { id: 3, name: "Plan Premium", price: 499, features: ["3 consultorios", "Horas ilimitadas", "Soporte 24/7"], description: "Para clínicas y consultorios de alto volumen" },
];
// Nuevos tipos para historial de pagos
 type PaymentDTO = {
  id: number;
  createdAt: string | null;
  payment_date: string | null;
  userId: number;
  userFullName: string | null;
  email: string | null;
  amount: string;
  currency: string | null;
  status: string | null;
  method: string | null;
  concept: string;
  paymentIntentId?: string | null;
};
 type PaymentsListResponse = { data: PaymentDTO[]; total: number; page: number; pageSize: number };
 type PaymentDetailDTO = PaymentDTO & { clientSecret: string | null; charges: { id: string; amount: number; status: string }[] };

// Props del componente (restaurado)
interface PaymentsPageProps {
  userOnly?: boolean;
}

export default function PaymentsPage({ userOnly = false }: PaymentsPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(subscriptionPlansData);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  // Nuevo estado para flujo de cambio de plan
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  // Estado de suscripción y fecha de término (si aplica)
  const [subscriptionStatus, setSubscriptionStatus] = useState<'Activo' | 'Terminado'>('Terminado');
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
  const [nextPaymentDate, setNextPaymentDate] = useState<string>('');
  const [loadingSubscription, setLoadingSubscription] = useState<boolean>(true);
  // Estados para Historial de Pagos (admin)
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsStatus, setPaymentsStatus] = useState<string>('');
  const [paymentsUserId, setPaymentsUserId] = useState<number | ''>('');
  const [paymentsDateFrom, setPaymentsDateFrom] = useState<string>('');
  const [paymentsDateTo, setPaymentsDateTo] = useState<string>('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPaymentId, setDetailPaymentId] = useState<number | null>(null);

  // Formulario para planes
  const planForm = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: "",
      price: 0,
      description: "",
      features: [],
      newFeature: "",
    }
  });
  
  // Formulario para pagos con tarjeta
  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: 0,
      cardNumber: "",
      cardholderName: "",
      expiryDate: "",
      cvv: "",
      concept: "Suscripción mensual",
    }
  });

  // Query global para el resumen de suscripción del usuario (evita spinners infinitos)
  const subscriptionSummaryQuery = useQuery<any>({
    queryKey: ['subscription-summary', user?.id],
    enabled: userOnly && !!user,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    queryFn: async () => {
      const res = await fetch('/api/subscription/summary', { credentials: 'include', cache: 'no-cache' });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error('No se pudo obtener el resumen de suscripción');
      return res.json();
    }
  });

  // Derivar estado de la query (siempre ejecuta y apaga loading)
  useEffect(() => {
    if (!userOnly) return;
    if (subscriptionSummaryQuery.isFetching) {
      setLoadingSubscription(true);
      return;
    }
    setLoadingSubscription(false);
    const summary = subscriptionSummaryQuery.data;
    if (!summary) {
      setSubscriptionStatus('Terminado');
      setSubscriptionEndDate(null);
      setNextPaymentDate('');
      setCurrentPlan(null);
      return;
    }
    const statusEs: 'Activo' | 'Terminado' = summary.paymentStatus === 'active' ? 'Activo' : 'Terminado';
    setSubscriptionStatus(statusEs);
    setSubscriptionEndDate(summary.subscriptionEndDate || null);
    setNextPaymentDate(summary.nextPaymentDate || '');
    const planName: string | undefined = summary?.plan?.name;
    const planPrice: number | undefined = summary?.plan?.price ? Number(summary.plan.price) : undefined;
    if (planName) {
      const match = subscriptionPlans.find(p => p.name.toLowerCase() === planName.toLowerCase());
      if (match) setCurrentPlan(match);
      else setCurrentPlan({ id: -1, name: planName, price: planPrice ?? 0, features: [], description: 'Plan activo' });
    } else {
      setCurrentPlan(null);
    }
  }, [userOnly, subscriptionSummaryQuery.isFetching, subscriptionSummaryQuery.data]);

  // Consulta para obtener todos los usuarios
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: user?.role === 'admin',
  });
  // Query de historial de pagos (admin)
  const { data: paymentsList, isLoading: loadingPayments, refetch: refetchPayments } = useQuery<PaymentsListResponse>({
    queryKey: ['payments', paymentsPage, paymentsStatus, paymentsUserId, paymentsDateFrom, paymentsDateTo],
    enabled: !userOnly && user?.role === 'admin',
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(paymentsPage));
      params.set('pageSize', '20');
      if (paymentsStatus) params.set('status', paymentsStatus);
      if (paymentsUserId) params.set('user', String(paymentsUserId));
      if (paymentsDateFrom) params.set('dateFrom', paymentsDateFrom);
      if (paymentsDateTo) params.set('dateTo', paymentsDateTo);
      const res = await fetch(`/api/payments?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('No se pudo cargar el historial de pagos');
      return res.json();
    },
  });
  // Query de detalle de pago (admin)
  const { data: paymentDetail } = useQuery<PaymentDetailDTO>({
    queryKey: ['payment', detailPaymentId],
    enabled: !userOnly && user?.role === 'admin' && !!detailPaymentId && detailOpen,
    queryFn: async () => {
      const res = await fetch(`/api/payments/${detailPaymentId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('No se pudo cargar el detalle del pago');
      return res.json();
    }
  });

  // Filtrar los usuarios basados en los criterios
  const filteredUsers = users?.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === "all") return matchesSearch;
    if (filterStatus === "paid") return matchesSearch && Math.random() > 0.3; // Simulación
    if (filterStatus === "pending") return matchesSearch && Math.random() <= 0.3; // Simulación
    
    return matchesSearch;
  });

  // Estados para historial propio (mover fuera de condicional para reglas de hooks)
  const [historyPage, setHistoryPage] = useState(1);
  const [historyStatus, setHistoryStatus] = useState('');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const historyQuery = useAccountHistory({ page: historyPage, status: historyStatus, dateFrom: historyDateFrom, dateTo: historyDateTo, enabled: userOnly });
  const historyData: AccountHistoryResponse | undefined = historyQuery.data as AccountHistoryResponse | undefined;

  if (isLoadingUsers) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si es modo usuario, mostrar una vista diferente
  if (userOnly) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

    const handleCancelSubscription = async () => {
      try {
        const res = await fetch('/api/subscription/cancel', { method: 'POST', credentials: 'include' });
        const data = await res.json();
        if (!res.ok) { toast({ title: 'Error', description: data?.message || 'No se pudo cancelar', variant: 'destructive' }); return; }
        setSubscriptionStatus('Terminado');
        setSubscriptionEndDate(data.subscriptionEndDate);
        setNextPaymentDate('');
        setLoadingSubscription(false);
        // refrescar usuario global
        try {
          const meRes = await fetch('/api/user', { credentials: 'include', cache: 'no-cache' });
          if (meRes.ok) {
            const me = await meRes.json();
            queryClient.setQueryData(['/api/user'], me);
          }
        } catch {}
        queryClient.invalidateQueries({ queryKey: ['subscription-summary', user?.id] });
        toast({ title: 'Suscripción cancelada', description: `Se terminará el ${new Date(data.subscriptionEndDate).toLocaleDateString('es-MX')}` });
      } catch (e: any) {
        toast({ title: 'Error al cancelar', description: e.message || 'Intenta más tarde', variant: 'destructive' });
      }
    };

    const handleRenewClick = () => {
      // Usar plan recomendado por defecto si no hay selección
      const defaultPlan = subscriptionPlans.find(p => p.id === 2) || subscriptionPlans[0];
      setCheckoutPlan(checkoutPlan ?? defaultPlan);
      setShowChangePlanDialog(true);
    };


    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Mis Pagos</h1>
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogTrigger asChild>
              <Button className="ml-auto" disabled={!publishableKey} onClick={() => {
                // Si no hay plan seleccionado para checkout, usar el plan recomendado (id 2) o el primero
                if (!checkoutPlan) {
                  const defaultPlan = subscriptionPlans.find(p => p.id === 2) || subscriptionPlans[0];
                  setCheckoutPlan(defaultPlan);
                }
              }}>
                <CreditCard className="mr-2 h-4 w-4" />
                Realizar un Pago
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Completar pago</DialogTitle>
                <DialogDescription>Usa tu tarjeta de manera segura.</DialogDescription>
              </DialogHeader>
              {!publishableKey ? (
                <p className="text-red-600">Falta configurar VITE_STRIPE_PUBLISHABLE_KEY</p>
              ) : (
                <PaymentForm
                  amount={checkoutPlan?.price ?? 349}
                  currency="mxn"
                  concept={checkoutPlan ? `Suscripción - ${checkoutPlan.name}` : "Suscripción mensual"}
                  publishableKey={publishableKey}
                  onSucceeded={() => {
                    if (checkoutPlan) setCurrentPlan(checkoutPlan);
                    setShowPaymentDialog(false);
                    setLoadingSubscription(false);
                    // Optimista: mostrar activo de inmediato
                    setSubscriptionStatus('Activo');
                    setSubscriptionEndDate(null);
                    const next = new Date(); next.setDate(next.getDate() + 30); setNextPaymentDate(next.toISOString());
                     queryClient.invalidateQueries({ queryKey: ['subscription-summary', user?.id] });
                     // refrescar estatus desde backend
                     (async () => {
                      try {
                        const sumRes = await fetch('/api/subscription/summary', { credentials: 'include', cache: 'no-cache' });
                        if (sumRes.ok) {
                          const summary = await sumRes.json();
                          setSubscriptionStatus(summary.paymentStatus === 'active' ? 'Activo' : 'Terminado');
                          setSubscriptionEndDate(summary.subscriptionEndDate || null);
                          setNextPaymentDate(summary.nextPaymentDate || '');
                          const planName: string | undefined = summary?.plan?.name;
                          const planPrice: number | undefined = summary?.plan?.price ? Number(summary.plan.price) : undefined;
                          if (planName) {
                            const match = subscriptionPlans.find(p => p.name.toLowerCase() === planName.toLowerCase());
                            if (match) setCurrentPlan(match);
                            else setCurrentPlan({ id: -1, name: planName, price: planPrice ?? (checkoutPlan?.price ?? 0), features: [], description: 'Plan activo' });
                          } else {
                            setCurrentPlan(checkoutPlan ?? null);
                          }
                        } else {
                          // fallback local
                          setSubscriptionStatus('Activo');
                          setSubscriptionEndDate(null);
                          setNextPaymentDate(new Date(Date.now() + 30*24*60*60*1000).toISOString());
                        }
                      } catch {
                        setSubscriptionStatus('Activo');
                        setSubscriptionEndDate(null);
                        setNextPaymentDate(new Date(Date.now() + 30*24*60*60*1000).toISOString());
                      }
                    })();
                    toast({ title: 'Suscripción actualizada', description: `Tu plan ahora es ${checkoutPlan?.name}` });
                  }}
                  onFinished={(info) => {
                    if (info.status !== 'succeeded') return;
                    // Cierre defensivo si onSucceeded no se disparó
                    setShowPaymentDialog(false);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
        
        <Tabs defaultValue="history" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="history">Historial</TabsTrigger>
            <TabsTrigger value="subscription">Mi Suscripción</TabsTrigger>
            <TabsTrigger value="payment-methods">Métodos de Pago</TabsTrigger>
          </TabsList>
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Pagos</CardTitle>
                <CardDescription>Transacciones realizadas por tu cuenta</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Select value={historyStatus || 'ALL'} onValueChange={v => { setHistoryStatus(v === 'ALL' ? '' : v); setHistoryPage(1); }}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos</SelectItem>
                      <SelectItem value="exitoso">Exitosos</SelectItem>
                      <SelectItem value="fallido">Fallidos</SelectItem>
                      <SelectItem value="reembolsado">Reembolsados</SelectItem>
                      <SelectItem value="pending">Pendientes</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" value={historyDateFrom} onChange={e => { setHistoryDateFrom(e.target.value); setHistoryPage(1); }} className="w-[150px]" />
                  <Input type="date" value={historyDateTo} onChange={e => { setHistoryDateTo(e.target.value); setHistoryPage(1); }} className="w-[150px]" />
                  <Button variant="outline" onClick={() => historyQuery.refetch()}>Aplicar</Button>
                </div>
                {historyQuery.isLoading && (
                  <div className="space-y-2">
                    <div className="h-6 w-full bg-muted animate-pulse rounded" />
                    <div className="h-6 w-full bg-muted animate-pulse rounded" />
                    <div className="h-6 w-full bg-muted animate-pulse rounded" />
                  </div>
                )}
                {!historyQuery.isLoading && historyQuery.isError && <p className="text-red-600 text-sm">Error cargando historial.</p>}
                {!historyQuery.isLoading && historyData && historyData.total === 0 && (
                  <p className="text-muted-foreground text-sm">{historyData.message || 'No hay pagos registrados.'}</p>
                )}
                {!historyQuery.isLoading && historyData && historyData.total > 0 && (
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
                        {historyData.data.map((p: AccountHistoryPayment) => (
                          <tr key={p.id} className="border-b last:border-0">
                            <td className="py-2">{p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}</td>
                            <td className="py-2">{p.concept}</td>
                            <td className="py-2">$ {p.amount}</td>
                            <td className="py-2">{p.status}</td>
                            <td className="py-2">{p.method || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-xs text-muted-foreground">Página {historyData.page} de {Math.ceil(historyData.total / historyData.pageSize)}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" disabled={historyPage <= 1} onClick={() => setHistoryPage(p => Math.max(1, p - 1))}>Anterior</Button>
                        <Button variant="outline" disabled={historyData.page * historyData.pageSize >= historyData.total} onClick={() => setHistoryPage(p => p + 1)}>Siguiente</Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="subscription">
            <Card>
              <CardHeader>
                <CardTitle>Mi Plan Actual</CardTitle>
                <CardDescription>
                  Detalles de tu suscripción y próximos pagos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSubscription ? (
                  <div className="p-6 text-sm text-muted-foreground">Cargando tu suscripción…</div>
                ) : subscriptionStatus === 'Activo' ? (
                  <div className="bg-muted/40 p-6 rounded-lg mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{currentPlan?.name || (subscriptionSummaryQuery.data?.plan?.name ?? 'Suscripción activa')}</h3>
                        <p className="text-muted-foreground">Renovación automática mensual</p>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Activo
                      </Badge>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Facturación</p>
                        <p className="font-medium">Mensual</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Próximo pago</p>
                        <p className="font-medium">{nextPaymentDate ? new Date(nextPaymentDate).toLocaleDateString('es-MX') : '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Monto</p>
                        <p className="font-medium">${currentPlan?.price ?? (subscriptionSummaryQuery.data?.plan?.price ?? 0)} MXN</p>
                      </div>
                    </div>

                    {subscriptionEndDate && (
                      <div className="rounded-md bg-amber-50 text-amber-800 p-3 text-sm">
                        Tu suscripción terminará el {new Date(subscriptionEndDate).toLocaleDateString('es-MX')}.
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Características incluidas:</h4>
                      <ul className="space-y-1">
                        {(currentPlan?.features ?? []).map((f, i) => (
                          <li key={i} className="flex items-center text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                            {f}
                          </li>
                        ))}
                        {(!currentPlan || currentPlan.features.length === 0) && (
                          <li className="text-sm text-muted-foreground">Sin características registradas</li>
                        )}
                      </ul>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-4">
                      <Button variant="outline" onClick={() => setShowChangePlanDialog(true)}>
                        Cambiar Plan
                      </Button>
                      <Button variant="outline" onClick={handleCancelSubscription}>
                        Cancelar Suscripción
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/40 p-6 rounded-lg mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">No tienes un plan activo</h3>
                        <p className="text-muted-foreground">Elige un plan para activar tu suscripción.</p>
                      </div>
                      <Button onClick={handleRenewClick}>Seleccionar plan</Button>
                    </div>
                  </div>
                )}
               </CardContent>
             </Card>
           </TabsContent>

          <TabsContent value="payment-methods">
            <Card>
              <CardHeader>
                <CardTitle>Métodos de Pago</CardTitle>
                <CardDescription>
                  Administra tus tarjetas y formas de pago
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 space-y-4">
                  <div className="border rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <CreditCard className="h-6 w-6 text-primary mr-3" />
                      <div>
                        <p className="font-medium">•••• •••• •••• 1234</p>
                        <p className="text-sm text-muted-foreground">Visa - Expira: 12/25</p>
                      </div>
                    </div>
                    <Badge>Predeterminada</Badge>
                  </div>
                </div>
                
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Agregar Método de Pago
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Diálogo: Seleccionar nuevo plan */}
        <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
          <DialogContent className="sm:max-w-[720px]">
            <DialogHeader>
              <DialogTitle>{subscriptionStatus === 'Terminado' ? 'Renovar con un plan' : 'Selecciona un nuevo plan'}</DialogTitle>
              <DialogDescription>Elige el plan que mejor se adapte a ti y continúa con el pago.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {subscriptionPlans.map((plan) => {
                const isSelected = checkoutPlan?.id === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setCheckoutPlan(plan)}
                    className={`text-left border rounded-lg p-4 hover:border-primary transition bg-card ${isSelected ? 'border-primary ring-1 ring-primary' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{plan.name}</h4>
                      {isSelected && <Badge>Seleccionado</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                    <p className="text-xl font-bold mt-2">${plan.price} MXN</p>
                    <ul className="text-sm mt-3 space-y-1 list-disc pl-4">
                      {plan.features.map((f, idx) => (
                        <li key={idx}>{f}</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowChangePlanDialog(false)}>Cancelar</Button>
              <Button
                onClick={() => {
                  if (!checkoutPlan) return;
                  setShowChangePlanDialog(false);
                  setShowPaymentDialog(true);
                }}
                disabled={!checkoutPlan}
              >
                Continuar con el pago
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Vista de administrador
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Pagos</h1>
        <Button className="ml-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Registrar Pago
        </Button>
      </div>

      <Tabs defaultValue="subscriptions" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="subscriptions">Planes de Suscripción</TabsTrigger>
          <TabsTrigger value="users">Estado de Pagos</TabsTrigger>
          <TabsTrigger value="history">Historial de Pagos</TabsTrigger>
          <TabsTrigger value="invoices">Facturas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="subscriptions">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {subscriptionPlans.map((plan) => (
              <Card key={plan.id} className={plan.id === 2 ? "border-primary" : ""}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-2xl font-bold">${plan.price} MXN</span> /mes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={plan.id === 2 ? "default" : "outline"}>
                    {plan.id === 2 ? "Plan Recomendado" : "Seleccionar Plan"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Planes Personalizados</CardTitle>
                <CardDescription>
                  Configura planes especiales para terapeutas con necesidades específicas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Si necesitas crear un plan personalizado para un terapeuta específico, 
                  puedes configurar horas, consultorios y precio según sus necesidades.
                </p>
                <Button variant="outline" onClick={() => {
                  setSelectedPlan(null);
                  planForm.reset({
                    name: "",
                    price: 0,
                    description: "",
                    features: [],
                    newFeature: "",
                  });
                  setShowPlanDialog(true);
                }}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Crear Plan Personalizado
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Editar Planes Existentes</CardTitle>
                <CardDescription>
                  Modifica los planes predefinidos del sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subscriptionPlans.map(plan => (
                    <div key={plan.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-sm text-muted-foreground">${plan.price} MXN/mes</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setSelectedPlan(plan);
                        planForm.reset({
                          id: plan.id,
                          name: plan.name,
                          price: plan.price,
                          description: plan.description || "",
                          features: plan.features || [],
                          newFeature: "",
                        });
                        setShowPlanDialog(true);
                      }}>
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="users">
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle>Filtrar Pagos</CardTitle>
              <CardDescription>
                Busca y filtra terapeutas por estado de pago
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar terapeuta..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="w-full md:w-48">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Estado de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="paid">Al día</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado de Pagos de Terapeutas</CardTitle>
              <CardDescription>
                Control de pagos y suscripciones de los terapeutas registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Terapeuta</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Próximo Pago</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers && filteredUsers.length > 0 ? (
                      filteredUsers.filter(u => u.role !== 'admin').map((user) => {
                        // Simulamos datos de pago aleatorios
                        const isPaid = Math.random() > 0.3;
                        const planIndex = Math.floor(Math.random() * 3);
                        const planName = subscriptionPlans[planIndex].name;
                        const planPrice = subscriptionPlans[planIndex].price;
                        const nextPaymentDate = new Date();
                        nextPaymentDate.setDate(nextPaymentDate.getDate() + Math.floor(Math.random() * 30));
                        
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.fullName}</TableCell>
                            <TableCell>{planName}</TableCell>
                            <TableCell>
                              {isPaid ? (
                                <Badge variant="outline" className="bg-green-100 text-green-800">
                                  <CheckCircle2 className="mr-1 h-3 w-3" /> Al día
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-100 text-amber-800">
                                  <AlertCircle className="mr-1 h-3 w-3" /> Pendiente
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {nextPaymentDate.toLocaleDateString('es-MX')}
                            </TableCell>
                            <TableCell>${planPrice} MXN</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm">
                                  <Receipt className="h-4 w-4 mr-1" />
                                  Generar Factura
                                </Button>
                                {!isPaid && (
                                  <Button size="sm" onClick={() => {
                                    setSelectedUser(user);
                                    paymentForm.reset({
                                      userId: user.id,
                                      amount: planPrice,
                                      cardNumber: "",
                                      cardholderName: user.fullName,
                                      expiryDate: "",
                                      cvv: "",
                                      concept: `Suscripción - ${planName}`,
                                    });
                                    setShowPaymentDialog(true);
                                  }}>
                                    <CreditCard className="h-4 w-4 mr-1" />
                                    Procesar Pago
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          {searchTerm ? "No se encontraron terapeutas con ese criterio de búsqueda" : "No hay terapeutas registrados"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Nueva pestaña: Historial de Pagos */}
        <TabsContent value="history">
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Filtra por usuario, rango de fechas y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="md:col-span-2">
                  <Select value={paymentsUserId ? String(paymentsUserId) : 'ALL'} onValueChange={(v) => { if (v === 'ALL') { setPaymentsUserId(''); } else { setPaymentsUserId(Number(v)); } setPaymentsPage(1); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos</SelectItem>
                      {users?.map(u => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={paymentsStatus || 'all'} onValueChange={(v) => { setPaymentsStatus(v === 'all' ? '' : v); setPaymentsPage(1); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="succeeded">Pagado</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="processing">Procesando</SelectItem>
                      <SelectItem value="canceled">Cancelado</SelectItem>
                      <SelectItem value="failed">Fallido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Input type="date" value={paymentsDateFrom} onChange={(e) => { setPaymentsDateFrom(e.target.value); setPaymentsPage(1); }} />
                </div>
                <div>
                  <Input type="date" value={paymentsDateTo} onChange={(e) => { setPaymentsDateTo(e.target.value); setPaymentsPage(1); }} />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={() => { setPaymentsUserId(''); setPaymentsStatus(''); setPaymentsDateFrom(''); setPaymentsDateTo(''); setPaymentsPage(1); refetchPayments(); }}>Limpiar</Button>
                <Button onClick={() => refetchPayments()}>Buscar</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set('format', 'csv');
                    params.set('page', String(paymentsPage));
                    params.set('pageSize', '20');
                    if (paymentsStatus) params.set('status', paymentsStatus);
                    if (paymentsUserId) params.set('user', String(paymentsUserId));
                    if (paymentsDateFrom) params.set('dateFrom', paymentsDateFrom);
                    if (paymentsDateTo) params.set('dateTo', paymentsDateTo);
                    window.open(`/api/payments?${params.toString()}`, '_blank');
                  }}
                >
                  <Download className="h-4 w-4 mr-1" /> Exportar CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos</CardTitle>
              <CardDescription>Mostrando {paymentsList?.data.length ?? 0} de {paymentsList?.total ?? 0}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto">
                {loadingPayments ? (
                  <div className="py-10 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(paymentsList?.data ?? []).map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.createdAt ? new Date(p.createdAt).toLocaleString('es-MX') : '—'}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{p.userFullName || `#${p.userId}`}</span>
                              <span className="text-xs text-muted-foreground">{p.email || ''}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[280px] truncate" title={p.concept}>{p.concept}</TableCell>
                          <TableCell>${Number(p.amount).toFixed(2)} {p.currency?.toUpperCase() || 'MXN'}</TableCell>
                          <TableCell>
                            {p.status === 'succeeded' ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800">Pagado</Badge>
                            ) : p.status === 'processing' ? (
                              <Badge variant="outline" className="bg-blue-100 text-blue-800">Procesando</Badge>
                            ) : p.status === 'canceled' ? (
                              <Badge variant="outline" className="bg-muted text-foreground">Cancelado</Badge>
                            ) : p.status === 'pending' ? (
                              <Badge variant="outline" className="bg-amber-100 text-amber-800">Pendiente</Badge>
                            ) : (
                              <Badge variant="outline">{p.status || '—'}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => { setDetailPaymentId(p.id); setDetailOpen(true); }}>
                                Detalles
                              </Button>
                              <Button size="sm" variant="outline" onClick={async () => {
                                try {
                                  const res = await fetch(`/api/payments/${p.id}/receipt`);
                                  const data = await res.json();
                                  if (!res.ok || !data?.url) { toast({ title: 'Recibo no disponible', description: data?.message || 'No hay recibo', variant: 'destructive' }); return; }
                                  window.open(data.url, '_blank');
                                } catch (e: any) {
                                  toast({ title: 'Recibo no disponible', description: e.message || 'Intenta más tarde', variant: 'destructive' });
                                }
                              }}>
                                <Receipt className="h-4 w-4 mr-1" /> Recibo
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(paymentsList?.data?.length ?? 0) === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin resultados</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Paginación simple */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-muted-foreground">
                  Página {paymentsList?.page ?? paymentsPage} de {Math.max(1, Math.ceil((paymentsList?.total ?? 0) / (paymentsList?.pageSize ?? 20)))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={(paymentsList?.page ?? 1) <= 1} onClick={() => setPaymentsPage((p) => Math.max(1, p - 1))}>Anterior</Button>
                  <Button variant="outline" disabled={((paymentsList?.page ?? 1) * (paymentsList?.pageSize ?? 20)) >= (paymentsList?.total ?? 0)} onClick={() => setPaymentsPage((p) => p + 1)}>Siguiente</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modal de detalles */}
          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className="sm:max-w-[620px]">
              <DialogHeader>
                <DialogTitle>Detalle del Pago</DialogTitle>
                <DialogDescription>Información completa y cargos asociados</DialogDescription>
              </DialogHeader>
              {paymentDetail ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground">ID</div>
                      <div>#{paymentDetail.id}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Fecha</div>
                      <div>{paymentDetail.createdAt ? new Date(paymentDetail.createdAt).toLocaleString('es-MX') : '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Usuario</div>
                      <div>{paymentDetail.userFullName || `#${paymentDetail.userId}`}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Monto</div>
                      <div>${Number(paymentDetail.amount).toFixed(2)} {paymentDetail.currency?.toUpperCase() || 'MXN'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Estado</div>
                      <div>{paymentDetail.status}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Método</div>
                      <div>{paymentDetail.method || '—'}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Concepto</div>
                    <div className="text-sm">{paymentDetail.concept}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Cargos</div>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Charge ID</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paymentDetail.charges?.length ? paymentDetail.charges.map(c => (
                            <TableRow key={c.id}>
                              <TableCell className="font-mono text-xs">{c.id}</TableCell>
                              <TableCell>${(c.amount / 100).toFixed(2)} {paymentDetail.currency?.toUpperCase() || 'MXN'}</TableCell>
                              <TableCell>{c.status}</TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground">Sin cargos</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={async () => {
                      if (!detailPaymentId) return;
                      try {
                        const res = await fetch(`/api/payments/${detailPaymentId}/receipt`);
                        const data = await res.json();
                        if (!res.ok || !data?.url) { toast({ title: 'Recibo no disponible', description: data?.message || 'No hay recibo', variant: 'destructive' }); return; }
                        window.open(data.url, '_blank');
                      } catch (e: any) {
                        toast({ title: 'Recibo no disponible', description: e.message || 'Intenta más tarde', variant: 'destructive' });
                      }
                    }}>
                      <Receipt className="h-4 w-4 mr-1" /> Recibo
                    </Button>
                    <Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
                  </div>
                </div>
              ) : (
                <div className="py-10 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

        {/* Diálogo para editar planes */}
        <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedPlan ? `Editar ${selectedPlan.name}` : 'Crear Nuevo Plan'}</DialogTitle>
              <DialogDescription>
                {selectedPlan
                  ? 'Modifica las características y precio del plan seleccionado.'
                  : 'Crea un nuevo plan de suscripción para tus terapeutas.'}
              </DialogDescription>
            </DialogHeader>

            <Form {...planForm}>
            <form onSubmit={planForm.handleSubmit((values) => {
              // Proceso de crear/actualizar plan
              if (selectedPlan) {
                // Actualizar plan existente
                const updatedPlans = subscriptionPlans.reduce<SubscriptionPlan[]>((acc, plan) => {
                  if (plan.id === values.id) {
                    acc.push({
                      id: values.id!,
                      name: values.name,
                      price: values.price,
                      description: values.description || "",
                      features: values.features.filter(f => f.trim() !== ''),
                    });
                  } else {
                    acc.push(plan);
                  }
                  return acc;
                }, []);
                setSubscriptionPlans(updatedPlans as SubscriptionPlan[]);
                toast({
                  title: "Plan actualizado",
                  description: `El plan ${values.name} ha sido actualizado correctamente`,
                });
              } else {
                // Crear nuevo plan
                const newPlan: SubscriptionPlan = {
                  id: (subscriptionPlans.length ? Math.max(...subscriptionPlans.map(p => p.id)) : 0) + 1,
                  name: values.name as string,
                  price: Number(values.price),
                  description: (values as any).description || "",
                  features: (values.features || []).filter((f: string) => f.trim() !== ''),
                } as SubscriptionPlan;
                setSubscriptionPlans((prev) => ([...prev, newPlan] as SubscriptionPlan[]));
                toast({
                  title: "Plan creado",
                  description: `El plan ${values.name} ha sido creado correctamente`,
                });
              }
              setShowPlanDialog(false);
            })} className="space-y-4">
              <FormField
                control={planForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Plan</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={planForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio Mensual (MXN)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={planForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <Label>Características del Plan</Label>
                <div className="border rounded-md p-4 mt-2 space-y-2">
                  {planForm.watch('features')?.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input 
                        value={feature} 
                        onChange={(e) => {
                          const newFeatures = [...planForm.getValues('features')];
                          newFeatures[index] = e.target.value;
                          planForm.setValue('features', newFeatures);
                        }}
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          const newFeatures = planForm.getValues('features').filter((_, i) => i !== index);
                          planForm.setValue('features', newFeatures);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="flex items-center space-x-2">
                    <FormField
                      control={planForm.control}
                      name="newFeature"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input {...field} placeholder="Nueva característica" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        const current = planForm.getValues('features');
                        const nf = planForm.getValues('newFeature') || '';
                        const newFeature = nf.trim();
                        if (newFeature) {
                          planForm.setValue('features', [...current, newFeature]);
                          planForm.setValue('newFeature', '');
                        }
                      }}
                    >
                      <PlusCircle className="h-4 w-4 mr-1" />
                      Añadir
                    </Button>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="submit">
                  {selectedPlan ? 'Guardar Cambios' : 'Crear Plan'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para procesar pago con tarjeta */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Procesar Pago con Tarjeta</DialogTitle>
            <DialogDescription>
              {selectedUser ? `Registrar pago para ${selectedUser.fullName}` : 'Ingrese los datos de la tarjeta para procesar el pago'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit((values) => {
              // Simulamos el procesamiento del pago
              toast({
                title: "Pago procesado",
                description: `Se ha procesado el pago por $${values.amount} MXN correctamente.`,
              });
              setShowPaymentDialog(false);
            })} className="space-y-4">
              <div className="bg-muted/40 p-4 rounded-md mb-4">
                <div className="flex items-center space-x-2 text-sm">
                  <CreditCardIcon className="h-4 w-4 text-primary" />
                  <span>Procesando pago para:</span>
                  <span className="font-medium">{selectedUser?.fullName}</span>
                </div>
                
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Concepto:</span>
                  <span className="font-medium">{paymentForm.watch('concept')}</span>
                </div>
                
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Monto a pagar:</span>
                  <span className="font-medium">${paymentForm.watch('amount')} MXN</span>
                </div>
              </div>
              
              <FormField
                control={paymentForm.control}
                name="cardholderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Titular</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      Tal como aparece en la tarjeta
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={paymentForm.control}
                name="cardNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Tarjeta</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="1234 5678 9012 3456" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={paymentForm.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Expiración</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="MM/YY" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={paymentForm.control}
                  name="cvv"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CVV</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>Su información de pago es procesada de forma segura</span>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Procesar Pago
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
