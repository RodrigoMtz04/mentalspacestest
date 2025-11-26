import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User } from "@shared/schema";
import {
  Shield,
  AlertTriangle,
  BadgeCheck,
  Users,
  UserX,
  History,
  Award,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  CheckCircle2,
} from "lucide-react";

// Tipo de nivel de confianza
// type UserTrustLevel = "novato" | "confiable" | "vip" | "problemático";

// Esquema para reglas de nivel de confianza
const trustRulesSchema = z.object({
  // Reglas de promoción
  promotionEnabled: z.boolean().default(true),
  bookingsForTrusted: z.coerce.number().min(0).default(5),
  minimumAttendanceRateForTrusted: z.coerce.number().min(0).max(100).default(80),
  paymentOnTimeRateForTrusted: z.coerce.number().min(0).max(100).default(90),

  bookingsForVip: z.coerce.number().min(0).default(20),
  minimumAttendanceRateForVip: z.coerce.number().min(0).max(100).default(90),
  paymentOnTimeRateForVip: z.coerce.number().min(0).max(100).default(95),
  consecutiveBookingsForVip: z.coerce.number().min(0).default(3),

  // Reglas de degradación
  degradationEnabled: z.boolean().default(true),
  noShowsForDegradation: z.coerce.number().min(1).default(3),
  latePaymentsForDegradation: z.coerce.number().min(1).default(3),
  cancellationsForDegradation: z.coerce.number().min(1).default(5),
  degradationPeriodDays: z.coerce.number().min(1).default(30),

  // Período de consideración
  historyPeriodMonths: z.coerce.number().min(1).default(3),

  // Penalizaciones y bonificaciones automáticas
  penaltiesEnabled: z.boolean().default(true),
  bonusesEnabled: z.boolean().default(true),

  // Tiempo mínimo como nivel confiable antes de promocionar a VIP
  minimumTimeAsTrustedDays: z.coerce.number().min(0).default(30),

  // Rehabilitación
  rehabilitationEnabled: z.boolean().default(true),
  rehabilitationPeriodDays: z.coerce.number().min(1).default(60),
  rehabilitationRequirements: z.string().default(
    "5 reservas exitosas consecutivas con pago a tiempo"
  ),
});

// Esquema para registrar incidentes
const incidentSchema = z.object({
  userId: z.coerce.number(),
  incidentType: z.enum([
    "noshow",
    "latepayment",
    "cancellation",
    "goodbehavior",
    "vip_override",
  ]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
  affectsTrustLevel: z.boolean().default(true),
});

export default function TrustLevelRulesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("promotion");
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);

  // Formulario para reglas de nivel de confianza
  const form = useForm<z.infer<typeof trustRulesSchema>>({
    resolver: zodResolver(trustRulesSchema),
    defaultValues: {
      promotionEnabled: true,
      bookingsForTrusted: 5,
      minimumAttendanceRateForTrusted: 80,
      paymentOnTimeRateForTrusted: 90,

      bookingsForVip: 20,
      minimumAttendanceRateForVip: 90,
      paymentOnTimeRateForVip: 95,
      consecutiveBookingsForVip: 3,

      degradationEnabled: true,
      noShowsForDegradation: 3,
      latePaymentsForDegradation: 3,
      cancellationsForDegradation: 5,
      degradationPeriodDays: 30,

      historyPeriodMonths: 3,

      penaltiesEnabled: true,
      bonusesEnabled: true,

      minimumTimeAsTrustedDays: 30,

      rehabilitationEnabled: true,
      rehabilitationPeriodDays: 60,
      rehabilitationRequirements:
        "5 reservas exitosas consecutivas con pago a tiempo",
    },
  });

  // Formulario para registrar incidentes
  const incidentForm = useForm<z.infer<typeof incidentSchema>>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      incidentType: "noshow",
      affectsTrustLevel: true,
    },
  });

  // Consulta para obtener usuarios
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Mutación para guardar reglas (simulada)
  const updateRulesMutation = useMutation({
    mutationFn: async (data: z.infer<typeof trustRulesSchema>) => {
      // Simulación de llamada a la API
      console.log("Enviando reglas:", data);
      return { success: true };
    },
    onError: (error: Error) => {
      toast({
        title: "Error al guardar las reglas",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Datos simulados
  const userTrustLevels = [
    {
      id: 2,
      username: "maria.garcia",
      fullName: "María García",
      trustLevel: "vip",
      lastChange: "2025-02-15",
      bookings: 32,
      attendanceRate: 97,
      paymentOnTimeRate: 100,
    },
    {
      id: 3,
      username: "carlos.lopez",
      fullName: "Carlos López",
      trustLevel: "problemático",
      lastChange: "2025-03-01",
      bookings: 15,
      attendanceRate: 60,
      paymentOnTimeRate: 80,
    },
    {
      id: 4,
      username: "ana.martinez",
      fullName: "Ana Martínez",
      trustLevel: "confiable",
      lastChange: "2025-02-10",
      bookings: 12,
      attendanceRate: 92,
      paymentOnTimeRate: 100,
    },
    {
      id: 5,
      username: "juan.rodriguez",
      fullName: "Juan Rodríguez",
      trustLevel: "novato",
      lastChange: "2025-03-08",
      bookings: 2,
      attendanceRate: 100,
      paymentOnTimeRate: 100,
    },
  ];

  const recentIncidents = [
    {
      id: 1,
      userId: 3,
      username: "carlos.lopez",
      date: "2025-03-01",
      incidentType: "noshow",
      notes: "No se presentó sin aviso previo",
      affectedTrustLevel: true,
    },
    {
      id: 2,
      userId: 3,
      username: "carlos.lopez",
      date: "2025-02-20",
      incidentType: "latepayment",
      notes: "Pago con 5 días de retraso",
      affectedTrustLevel: true,
    },
    {
      id: 3,
      userId: 2,
      username: "maria.garcia",
      date: "2025-02-15",
      incidentType: "vip_override",
      notes: "Promoción manual a VIP por historial excelente",
      affectedTrustLevel: true,
    },
    {
      id: 4,
      userId: 4,
      username: "ana.martinez",
      date: "2025-02-10",
      incidentType: "goodbehavior",
      notes: "10 reservas consecutivas sin problemas",
      affectedTrustLevel: true,
    },
    {
      id: 5,
      userId: 3,
      username: "carlos.lopez",
      date: "2025-02-05",
      incidentType: "cancellation",
      notes: "Cancelación con menos de 24 horas de anticipación",
      affectedTrustLevel: true,
    },
  ];

  // Manejo del envío del formulario principal
  const onSubmit = async (values: z.infer<typeof trustRulesSchema>) => {
    updateRulesMutation.mutate(values);

    toast({
      title: "Reglas actualizadas",
      description: "Las reglas de nivel de confianza han sido actualizadas correctamente.",
    });
  };

  // Manejo del registro de incidentes
  const handleSaveIncident = (values: z.infer<typeof incidentSchema>) => {
    // Simulación de registro de incidente
    const user = users.find((u) => u.id === values.userId);

    console.log("Registrando incidente:", {
      ...values,
      username: user?.username,
    });

    toast({
      title: "Incidente registrado",
      description: `Se ha registrado un incidente para ${user?.username || "el usuario"}.`,
    });

    setShowIncidentDialog(false);
    incidentForm.reset({
      date: new Date().toISOString().split("T")[0],
      incidentType: "noshow",
      affectsTrustLevel: true,
    });
  };

  // Renderizado del formulario de promoción
  const renderPromotionForm = () => {
    return (
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="promotionEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Habilitar Promoción Automática
                </FormLabel>
                <FormDescription>
                  Los usuarios avanzarán automáticamente basado en su comportamiento.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant="secondary" className="text-blue-500 bg-blue-100">
                  Confiable
                </Badge>
                Requisitos de promoción a Confiable
              </CardTitle>
              <CardDescription>
                Requisitos para que un usuario novato sea promovido a usuario
                confiable
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="bookingsForTrusted"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reservas Mínimas</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min={0} />
                    </FormControl>
                    <FormDescription>
                      Número de reservas completadas requeridas.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimumAttendanceRateForTrusted"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tasa de Asistencia Mínima</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input type="number" {...field} min={0} max={100} />
                        <span className="ml-2">%</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Porcentaje mínimo de asistencia a reservas.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentOnTimeRateForTrusted"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tasa de Pago Puntual</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input type="number" {...field} min={0} max={100} />
                        <span className="ml-2">%</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Porcentaje mínimo de pagos realizados a tiempo.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge className="bg-primary/20 text-primary">VIP</Badge>
                Requisitos de promoción a VIP
              </CardTitle>
              <CardDescription>
                Requisitos para que un usuario confiable sea promovido a VIP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="bookingsForVip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reservas Totales</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min={0} />
                    </FormControl>
                    <FormDescription>
                      Número total de reservas completadas requeridas.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimumAttendanceRateForVip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tasa de Asistencia Mínima</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input type="number" {...field} min={0} max={100} />
                        <span className="ml-2">%</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Porcentaje mínimo de asistencia a reservas.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentOnTimeRateForVip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tasa de Pago Puntual</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input type="number" {...field} min={0} max={100} />
                        <span className="ml-2">%</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Porcentaje mínimo de pagos realizados a tiempo.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consecutiveBookingsForVip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reservas Consecutivas Sin Problemas</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min={0} />
                    </FormControl>
                    <FormDescription>
                      Número de reservas consecutivas exitosas requeridas.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimumTimeAsTrustedDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiempo Mínimo como Confiable</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input type="number" {...field} min={0} />
                        <span className="ml-2">días</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Tiempo mínimo que debe permanecer como usuario confiable.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Renderizado del formulario de degradación
  const renderDegradationForm = () => {
    return (
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="degradationEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Habilitar Degradación Automática
                </FormLabel>
                <FormDescription>
                  Los usuarios serán degradados automáticamente ante comportamientos
                  problemáticos.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge variant="destructive">Problemático</Badge>
              Condiciones para degradación a Problemático
            </CardTitle>
            <CardDescription>
              Situaciones que causan la degradación automática de un usuario a
              problemático
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="noShowsForDegradation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inasistencias</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min={1} />
                    </FormControl>
                    <FormDescription>
                      Número de inasistencias sin previo aviso.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="latePaymentsForDegradation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pagos Tardíos</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min={1} />
                    </FormControl>
                    <FormDescription>
                      Número de pagos realizados con retraso.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cancellationsForDegradation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cancelaciones de Último Momento</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min={1} />
                    </FormControl>
                    <FormDescription>
                      Número de cancelaciones con menos de 24 horas de anticipación.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="degradationPeriodDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Periodo de Evaluación</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input type="number" {...field} min={1} />
                        <span className="ml-2">días</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Periodo durante el cual se contabilizan los incidentes.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rehabilitación</CardTitle>
            <CardDescription>
              Configuración para la rehabilitación de usuarios problemáticos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="rehabilitationEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Habilitar Rehabilitación Automática</FormLabel>
                    <FormDescription>
                      Permitir que los usuarios problemáticos recuperen su nivel
                      previo.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rehabilitationPeriodDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Periodo de Rehabilitación</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <Input type="number" {...field} min={1} />
                      <span className="ml-2">días</span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Días mínimos como usuario problemático antes de poder
                    rehabilitarse.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rehabilitationRequirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requisitos de Rehabilitación</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describa los requisitos para rehabilitar a un usuario..."
                    />
                  </FormControl>
                  <FormDescription>
                    Condiciones que debe cumplir un usuario para rehabilitarse.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </div>
    );
  };

  // Renderizado de la configuración general
  const renderGeneralConfig = () => {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Parámetros Generales</CardTitle>
            <CardDescription>
              Configuración general del sistema de niveles de confianza
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="historyPeriodMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Período de Historial</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <Input type="number" {...field} min={1} />
                      <span className="ml-2">meses</span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Periodo del historial que se considera para evaluar a los
                    usuarios.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="penaltiesEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Habilitar Penalizaciones</FormLabel>
                      <FormDescription>
                        Aplicar penalizaciones por comportamiento negativo.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bonusesEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Habilitar Bonificaciones</FormLabel>
                      <FormDescription>
                        Aplicar bonificaciones por comportamiento positivo.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Diálogo para registrar incidentes
  const renderIncidentDialog = () => {
    return (
      <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Registrar Incidente</DialogTitle>
            <DialogDescription>
              Registre un incidente que afecta al nivel de confianza de un usuario.
            </DialogDescription>
          </DialogHeader>
          <Form {...incidentForm}>
            <form
              onSubmit={incidentForm.handleSubmit(handleSaveIncident)}
              className="space-y-4"
            >
              <FormField
                control={incidentForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(parseInt(value))
                      }
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar usuario" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users
                          .filter((u) => typeof u.id === "number")
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.username} ({user.fullName})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Usuario afectado por el incidente.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={incidentForm.control}
                name="incidentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Incidente</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="noshow">No se presentó</SelectItem>
                        <SelectItem value="latepayment">Pago tardío</SelectItem>
                        <SelectItem value="cancellation">Cancelación tardía</SelectItem>
                        <SelectItem value="goodbehavior">Buen comportamiento</SelectItem>
                        <SelectItem value="vip_override">Promoción manual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Tipo de comportamiento o situación.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={incidentForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      Fecha en que ocurrió el incidente.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={incidentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detalles adicionales sobre el incidente..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Información adicional sobre el incidente.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={incidentForm.control}
                name="affectsTrustLevel"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Afecta Nivel de Confianza</FormLabel>
                      <FormDescription>
                        Este incidente afectará el nivel de confianza del usuario.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit">Guardar Incidente</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Sistema de Nivel de Confianza</h1>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => setShowIncidentDialog(true)}
        >
          <History className="h-4 w-4" />
          Registrar Incidente
        </Button>
      </div>

      <div className="space-y-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Niveles de Confianza</CardTitle>
            <CardDescription>
              Progresión automática basada en el comportamiento del usuario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 max-w-2xl">
              {/* Progresión vertical de niveles */}
              <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted border-dashed relative">
                <div className="flex-shrink-0 rounded-full bg-muted p-2 mt-1">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold mb-1">Novato</h2>
                  <p className="text-sm text-muted-foreground mb-2">
                    Usuario nuevo con historial limitado
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Sin privilegios especiales</li>
                      <li>Horarios limitados de reserva</li>
                      <li>Solo puede reservar con hasta 7 días de antelación</li>
                    </ul>
                  </div>
                </div>
                <div className="absolute -bottom-4 left-7 z-10">
                  <ArrowDownCircle className="h-5 w-5 text-blue-400 bg-card rounded-full" />
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 relative ml-6">
                <div className="flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/50 p-2 mt-1">
                  <BadgeCheck className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold mb-1 text-blue-700 dark:text-blue-200">
                    Confiable
                  </h2>
                  <p className="text-sm text-blue-600 dark:text-blue-300 mb-2">
                    Usuario con buen historial de comportamiento
                  </p>
                  <div className="text-xs text-blue-600 dark:text-blue-300">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Acceso a reservas de hasta 14 días de antelación</li>
                      <li>Descuento en horas de baja demanda</li>
                      <li>Posibilidad de reservas consecutivas</li>
                    </ul>
                  </div>
                </div>
                <div className="absolute -bottom-4 left-7 z-10">
                  <ArrowDownCircle className="h-5 w-5 text-purple-400 bg-card rounded-full" />
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/50 relative ml-12">
                <div className="flex-shrink-0 rounded-full bg-purple-100 dark:bg-purple-900/50 p-2 mt-1">
                  <Award className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold mb-1 text-purple-700 dark:text-purple-200">
                    VIP
                  </h2>
                  <p className="text-sm text-purple-600 dark:text-purple-300 mb-2">
                    Usuario premium con privilegios especiales
                  </p>
                  <div className="text-xs text-purple-600 dark:text-purple-300">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Acceso a horas premium y exclusivas</li>
                      <li>Reservas con hasta 30 días de antelación</li>
                      <li>Descuentos especiales</li>
                      <li>Cancelación sin coste con 24h de antelación</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 border rounded-lg bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 ml-6 mt-6">
                <div className="flex-shrink-0 rounded-full bg-red-100 dark:bg-red-900/50 p-2 mt-1">
                  <UserX className="h-5 w-5 text-red-600 dark:text-red-300" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold mb-1 text-red-700 dark:text-red-200">
                    Problemático
                  </h2>
                  <p className="text-sm text-red-600 dark:text-red-300 mb-2">
                    Usuario con historial de incidentes negativos
                  </p>
                  <div className="text-xs text-red-600 dark:text-red-300">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Restricción de número de reservas activas</li>
                      <li>Pago por adelantado requerido</li>
                      <li>Limitado a reservas con 3 días de antelación</li>
                      <li>Sin acceso a horas de alta demanda</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="promotion" className="flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4" />
                  Promoción
                </TabsTrigger>
                <TabsTrigger value="degradation" className="flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4" />
                  Degradación
                </TabsTrigger>
                <TabsTrigger value="general" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  General
                </TabsTrigger>
              </TabsList>

              <TabsContent value="promotion" className="pt-4 pb-2">
                {renderPromotionForm()}
              </TabsContent>

              <TabsContent value="degradation" className="pt-4 pb-2">
                {renderDegradationForm()}
              </TabsContent>

              <TabsContent value="general" className="pt-4 pb-2">
                {renderGeneralConfig()}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end">
              <Button
                type="submit"
                className="flex items-center gap-2"
                disabled={updateRulesMutation.isPending}
              >
                {updateRulesMutation.isPending ? (
                  <>Guardando...</>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Guardar Configuración
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>

        <Separator className="my-6" />

        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Niveles Actuales</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Nivel de Confianza</TableHead>
                    <TableHead>Última Actualización</TableHead>
                    <TableHead>Reservas</TableHead>
                    <TableHead>Asistencia</TableHead>
                    <TableHead>Pagos a Tiempo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userTrustLevels.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        {user.trustLevel === "vip" && (
                          <Badge className="bg-purple-100 hover:bg-purple-100 text-purple-700 border-purple-200">
                            VIP
                          </Badge>
                        )}
                        {user.trustLevel === "confiable" && (
                          <Badge variant="secondary" className="bg-blue-100 hover:bg-blue-100 text-blue-700">
                            Confiable
                          </Badge>
                        )}
                        {user.trustLevel === "novato" && (
                          <Badge variant="outline">
                            Novato
                          </Badge>
                        )}
                        {user.trustLevel === "problemático" && (
                          <Badge variant="destructive">
                            Problemático
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{user.lastChange}</TableCell>
                      <TableCell>{user.bookings}</TableCell>
                      <TableCell>{user.attendanceRate}%</TableCell>
                      <TableCell>{user.paymentOnTimeRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <h2 className="text-2xl font-bold">Incidentes Recientes</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead>Afectó Nivel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentIncidents.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell>{incident.date}</TableCell>
                      <TableCell className="font-medium">{incident.username}</TableCell>
                      <TableCell>
                        {incident.incidentType === "noshow" && (
                          <Badge variant="destructive" className="flex gap-1 items-center">
                            <AlertTriangle className="h-3 w-3" />
                            No se presentó
                          </Badge>
                        )}
                        {incident.incidentType === "latepayment" && (
                          <Badge variant="destructive" className="bg-amber-500">
                            Pago tardío
                          </Badge>
                        )}
                        {incident.incidentType === "cancellation" && (
                          <Badge variant="destructive" className="bg-orange-500">
                            Cancelación tardía
                          </Badge>
                        )}
                        {incident.incidentType === "goodbehavior" && (
                          <Badge variant="default" className="bg-green-500">
                            Buen comportamiento
                          </Badge>
                        )}
                        {incident.incidentType === "vip_override" && (
                          <Badge variant="default" className="bg-purple-500">
                            Promoción manual
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{incident.notes}</TableCell>
                      <TableCell>
                        {incident.affectedTrustLevel ? "Sí" : "No"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {renderIncidentDialog()}
      </div>
    </div>
  );
}
