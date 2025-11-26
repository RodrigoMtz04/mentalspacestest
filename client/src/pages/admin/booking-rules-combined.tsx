import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SystemConfig, User } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  CreditCard,
  Clock,
  Calendar,
  Percent,
  Shield,
  User as UserIcon,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCcw,
  Settings,
  CheckCircle2
} from "lucide-react";

// Define el tipo UserRole
type UserRole = "admin" | "standard" | "trusted" | "vip" | "monthly";

// Esquema para la reglas de reserva
const bookingRulesSchema = z.object({
  system_name: z.string().min(3, "El nombre del sistema debe tener al menos 3 caracteres"),
  max_rooms_per_user: z.coerce.number().min(1, "Debe permitir al menos 1 cuarto por usuario").max(10, "Máximo 10 cuartos por usuario"),
  max_booking_days_in_advance: z.coerce.number().min(1, "Mínimo 1 día de anticipación").max(365, "Máximo 365 días de anticipación"),
  cancellation_policy_hours: z.coerce.number().min(1, "Mínimo 1 hora").max(168, "Máximo 168 horas (7 días)"),
  auto_approve_bookings: z.boolean().default(true),
  reminder_hours_before: z.coerce.number().min(1, "Mínimo 1 hora").max(72, "Máximo 72 horas (3 días)"),
  max_booking_duration_hours: z.coerce.number().min(1, "Mínimo 1 hora").max(24, "Máximo 24 horas"),
  enable_waitlist: z.boolean().default(false),
  no_show_penalty_days: z.coerce.number().min(0, "Mínimo 0 días").max(30, "Máximo 30 días"),
});

// Esquema para las reglas por tipo de usuario
const userRoleRulesSchema = z.object({
  role: z.enum(["standard", "trusted", "vip", "monthly"]),
  max_active_bookings: z.coerce.number().min(1, "Mínimo 1 reserva").max(50, "Máximo 50 reservas"),
  advance_booking_days: z.coerce.number().min(1, "Mínimo 1 día").max(365, "Máximo 365 días"),
  cancellation_hours_notice: z.coerce.number().min(0, "Mínimo 0 horas").max(168, "Máximo 168 horas (7 días)"),
  max_booking_duration_hours: z.coerce.number().min(1, "Mínimo 1 hora").max(24, "Máximo 24 horas"),
  reservation_fee_percentage: z.coerce.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
  cancellation_fee_percentage: z.coerce.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
  allow_monthly_payment: z.boolean().default(false),
  allow_consecutive_bookings: z.boolean().default(false),
});

// Esquemas para reglas especiales
const advancePaymentRulesSchema = z.object({
  requireAdvancePayment: z.boolean().default(false),
  paymentPercentage: z.coerce.number().min(0).max(100).default(30),
  daysBeforeBooking: z.coerce.number().min(0).max(30).default(3),
  userLevelExemption: z.array(z.string()).default(["vip"]),
  applyToFirstTimeBookings: z.boolean().default(true),
  applyToWeekendBookings: z.boolean().default(true),
  refundableWindow: z.coerce.number().min(0).max(72).default(24),
});

const premiumHoursSchema = z.object({
  enablePremiumHours: z.boolean().default(false),
  premiumStartTime: z.string().default("17:00"),
  premiumEndTime: z.string().default("20:00"),
  premiumDays: z.array(z.string()).default(["lunes", "martes", "miércoles", "jueves", "viernes"]),
  premiumPercentage: z.coerce.number().min(0).max(100).default(25),
  vipDiscountPercentage: z.coerce.number().min(0).max(100).default(50),
});

const userBlockSchema = z.object({
  userId: z.coerce.number().optional(),
  username: z.string().optional(),
  reason: z.string().min(5, "La razón debe tener al menos 5 caracteres"),
  blockType: z.enum(["temporary", "permanent"]).default("temporary"),
  endDate: z.string().optional(),
  notifyUser: z.boolean().default(true),
});

const autoDiscountSchema = z.object({
  enableAutoDiscounts: z.boolean().default(false),
  lowDemandDiscount: z.coerce.number().min(0).max(100).default(15),
  consecutiveBookingsDiscount: z.coerce.number().min(0).max(100).default(10),
  minimumConsecutiveBookings: z.coerce.number().min(2).max(20).default(3),
  earlyBookingDiscount: z.coerce.number().min(0).max(100).default(5),
  earlyBookingDays: z.coerce.number().min(1).max(60).default(7),
  monthlySubscription: z.boolean().default(false),
  monthlySubscriptionDiscount: z.coerce.number().min(0).max(100).default(20),
});

const vipPrivilegesSchema = z.object({
  priorityBooking: z.boolean().default(true),
  advanceBookingDays: z.coerce.number().min(0).max(90).default(60),
  cancellationFeeExemption: z.boolean().default(true),
  noShowFeeReduction: z.coerce.number().min(0).max(100).default(50),
  premiumHoursDiscount: z.coerce.number().min(0).max(100).default(50),
  consecutiveBookingBonus: z.coerce.number().min(0).max(100).default(5),
  exclusiveTimeSlots: z.boolean().default(false),
  customRateApproval: z.boolean().default(true),
});

// Tipo para excepciones de usuario
type UserException = {
  id: number;
  userId: number;
  username: string;
  exceptionType: "block" | "unblock" | "vip_access" | "custom_discount" | "payment_exemption";
  exceptionReason: string;
  expirationDate?: string;
  discountPercentage?: number;
  createdBy: number;
  createdAt: string;
  isActive: boolean;
};

export default function BookingRulesCombinedPage() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Estados para las diferentes pestañas
  const [activeTab, setActiveTab] = useState("general");
  const [activeSpecialTab, setActiveSpecialTab] = useState("advance-payment");
  const [editingRule, setEditingRule] = useState<z.infer<typeof userRoleRulesSchema> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingException, setEditingException] = useState<UserException | null>(null);
  const [isExceptionDialogOpen, setIsExceptionDialogOpen] = useState(false);
  
  // Formulario para reglas de reserva generales
  const form = useForm<z.infer<typeof bookingRulesSchema>>({
    resolver: zodResolver(bookingRulesSchema),
    defaultValues: {
      system_name: "SATI Centro de Consulta",
      max_rooms_per_user: 3,
      max_booking_days_in_advance: 60,
      cancellation_policy_hours: 24,
      auto_approve_bookings: true,
      reminder_hours_before: 24,
      max_booking_duration_hours: 4,
      enable_waitlist: false,
      no_show_penalty_days: 7,
    }
  });
  
  // Formulario para editar reglas por tipo de usuario
  const roleRuleForm = useForm<z.infer<typeof userRoleRulesSchema>>({
    resolver: zodResolver(userRoleRulesSchema),
    defaultValues: {
      role: "standard",
      max_active_bookings: 3,
      advance_booking_days: 30,
      cancellation_hours_notice: 24,
      max_booking_duration_hours: 2,
      reservation_fee_percentage: 20,
      cancellation_fee_percentage: 50,
      allow_monthly_payment: false,
      allow_consecutive_bookings: false
    }
  });
  
  // Formularios para reglas especiales
  const advancePaymentForm = useForm<z.infer<typeof advancePaymentRulesSchema>>({
    resolver: zodResolver(advancePaymentRulesSchema),
    defaultValues: {
      requireAdvancePayment: true,
      paymentPercentage: 30,
      daysBeforeBooking: 3,
      userLevelExemption: ["vip"],
      applyToFirstTimeBookings: true,
      applyToWeekendBookings: true,
      refundableWindow: 24,
    },
  });
  
  const premiumHoursForm = useForm<z.infer<typeof premiumHoursSchema>>({
    resolver: zodResolver(premiumHoursSchema),
    defaultValues: {
      enablePremiumHours: true,
      premiumStartTime: "17:00",
      premiumEndTime: "20:00",
      premiumDays: ["lunes", "martes", "miércoles", "jueves", "viernes"],
      premiumPercentage: 25,
      vipDiscountPercentage: 50,
    },
  });
  
  const userBlockForm = useForm<z.infer<typeof userBlockSchema>>({
    resolver: zodResolver(userBlockSchema),
    defaultValues: {
      reason: "",
      blockType: "temporary",
      endDate: "",
      notifyUser: true,
    },
  });
  
  const autoDiscountForm = useForm<z.infer<typeof autoDiscountSchema>>({
    resolver: zodResolver(autoDiscountSchema),
    defaultValues: {
      enableAutoDiscounts: true,
      lowDemandDiscount: 15,
      consecutiveBookingsDiscount: 10,
      minimumConsecutiveBookings: 3,
      earlyBookingDiscount: 5,
      earlyBookingDays: 7,
      monthlySubscription: false,
      monthlySubscriptionDiscount: 20,
    },
  });
  
  const vipPrivilegesForm = useForm<z.infer<typeof vipPrivilegesSchema>>({
    resolver: zodResolver(vipPrivilegesSchema),
    defaultValues: {
      priorityBooking: true,
      advanceBookingDays: 60,
      cancellationFeeExemption: true,
      noShowFeeReduction: 50,
      premiumHoursDiscount: 50,
      consecutiveBookingBonus: 5,
      exclusiveTimeSlots: false,
      customRateApproval: true,
    },
  });
  
  // Consulta para obtener configuración del sistema
  const { data: configData = [], isLoading } = useQuery<SystemConfig[]>({
    queryKey: ['/api/config'],
  });
  
  // Consulta para obtener usuarios
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  // Estado para las reglas por tipo de usuario
  const [roleRules, setRoleRules] = useState<z.infer<typeof userRoleRulesSchema>[]>([
    {
      role: "standard",
      max_active_bookings: 3,
      advance_booking_days: 30,
      cancellation_hours_notice: 24,
      max_booking_duration_hours: 2,
      reservation_fee_percentage: 20,
      cancellation_fee_percentage: 50,
      allow_monthly_payment: false,
      allow_consecutive_bookings: false
    },
    {
      role: "trusted",
      max_active_bookings: 6,
      advance_booking_days: 60,
      cancellation_hours_notice: 12,
      max_booking_duration_hours: 3,
      reservation_fee_percentage: 10,
      cancellation_fee_percentage: 25,
      allow_monthly_payment: true,
      allow_consecutive_bookings: true
    },
    {
      role: "vip",
      max_active_bookings: 12,
      advance_booking_days: 90,
      cancellation_hours_notice: 6,
      max_booking_duration_hours: 4,
      reservation_fee_percentage: 0,
      cancellation_fee_percentage: 10,
      allow_monthly_payment: true,
      allow_consecutive_bookings: true
    },
    {
      role: "monthly",
      max_active_bookings: 15,
      advance_booking_days: 90,
      cancellation_hours_notice: 4,
      max_booking_duration_hours: 6,
      reservation_fee_percentage: 0,
      cancellation_fee_percentage: 0,
      allow_monthly_payment: true,
      allow_consecutive_bookings: true
    }
  ]);
  
  // Estado para la clasificación de usuarios
  const [userTypes] = useState<{ id: number; name: string; description: string; }[]>([
    { id: 1, name: "standard", description: "Usuario estándar" },
    { id: 2, name: "trusted", description: "Usuario verificado con historial confiable" },
    { id: 3, name: "vip", description: "Usuario con beneficios premium" },
    { id: 4, name: "monthly", description: "Usuario con pago mensual" },
  ]);
  
  // Excepciones de usuario simuladas
  const [userExceptions, setUserExceptions] = useState<UserException[]>([
    {
      id: 1,
      userId: 3,
      username: "carlos.lopez",
      exceptionType: "block",
      exceptionReason: "Múltiples cancelaciones sin previo aviso",
      expirationDate: "2025-04-10",
      createdBy: 1,
      createdAt: "2025-03-10",
      isActive: true,
    },
    {
      id: 2,
      userId: 4,
      username: "ana.martinez",
      exceptionType: "vip_access",
      exceptionReason: "Cliente frecuente con buen historial",
      createdBy: 1,
      createdAt: "2025-03-05",
      isActive: true,
    },
    {
      id: 3,
      userId: 2,
      username: "maria.garcia",
      exceptionType: "custom_discount",
      exceptionReason: "Promoción especial por referidos",
      discountPercentage: 15,
      expirationDate: "2025-06-01",
      createdBy: 1,
      createdAt: "2025-03-01",
      isActive: true,
    },
  ]);
  
  // Mutación para guardar la configuración general
  const mutation = useMutation({
    mutationFn: async (config: z.infer<typeof bookingRulesSchema>) => {
      // Simulando la actualización de la configuración general
      console.log("Guardando configuración general:", config);
      
      // En una implementación real, aquí se enviarían los datos al servidor
      // const response = await apiRequest("POST", "/api/config/update", config);
      // return response.json();
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/config'] });
      toast({
        title: "Configuración guardada",
        description: "La configuración se ha actualizado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutación para guardar reglas por tipo de usuario
  const roleRuleMutation = useMutation({
    mutationFn: async (rules: z.infer<typeof userRoleRulesSchema>[]) => {
      // Simulando la actualización de las reglas por tipo de usuario
      console.log("Guardando reglas por tipo de usuario:", rules);
      
      // En una implementación real, aquí se enviarían los datos al servidor
      // const response = await apiRequest("POST", "/api/config/role-rules", rules);
      // return response.json();
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Reglas guardadas",
        description: "Las reglas por tipo de usuario se han actualizado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutación para reglas especiales
  const updateConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      // Simulación de llamada a la API
      console.log("Enviando configuración:", data);
      return { success: true };
    },
    onError: (error: Error) => {
      toast({
        title: "Error al guardar la configuración",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Manejadores para los formularios
  const onSubmit = async (values: z.infer<typeof bookingRulesSchema>) => {
    mutation.mutate(values);
  };
  
  const handleEditRoleRule = (rule: z.infer<typeof userRoleRulesSchema>) => {
    setEditingRule(rule);
    roleRuleForm.reset(rule);
    setIsDialogOpen(true);
  };
  
  const handleSaveRoleRule = () => {
    if (editingRule) {
      // Actualizar la regla existente
      const updatedRules = roleRules.map(rule => 
        rule.role === editingRule.role ? roleRuleForm.getValues() : rule
      );
      setRoleRules(updatedRules);
      roleRuleMutation.mutate(updatedRules);
    }
    setIsDialogOpen(false);
  };
  
  // Manejadores para formularios especiales
  const onAdvancePaymentSubmit = (values: z.infer<typeof advancePaymentRulesSchema>) => {
    updateConfigMutation.mutate({
      type: "advance_payment",
      ...values,
    });
    
    toast({
      title: "Configuración actualizada",
      description: "La configuración de pago anticipado ha sido actualizada correctamente.",
    });
  };
  
  const onPremiumHoursSubmit = (values: z.infer<typeof premiumHoursSchema>) => {
    updateConfigMutation.mutate({
      type: "premium_hours",
      ...values,
    });
    
    toast({
      title: "Configuración actualizada",
      description: "La configuración de horarios premium ha sido actualizada correctamente.",
    });
  };
  
  const onUserBlockSubmit = (values: z.infer<typeof userBlockSchema>) => {
    if (!values.userId && !values.username) {
      toast({
        title: "Error",
        description: "Debe seleccionar un usuario",
        variant: "destructive",
      });
      return;
    }
    
    // Simulación de creación de una excepción
    const user = users.find(u => u.id === values.userId);
    
    const newException: UserException = {
      id: userExceptions.length + 1,
      userId: values.userId || 0,
      username: user?.username || values.username || "",
      exceptionType: "block",
      exceptionReason: values.reason,
      expirationDate: values.blockType === "temporary" ? values.endDate : undefined,
      createdBy: user?.id || 1, // admin ID
      createdAt: new Date().toISOString().split('T')[0],
      isActive: true,
    };
    
    setUserExceptions([...userExceptions, newException]);
    
    toast({
      title: "Usuario bloqueado",
      description: "El usuario ha sido bloqueado correctamente.",
    });
    
    userBlockForm.reset();
  };
  
  const onAutoDiscountSubmit = (values: z.infer<typeof autoDiscountSchema>) => {
    updateConfigMutation.mutate({
      type: "auto_discount",
      ...values,
    });
    
    toast({
      title: "Configuración actualizada",
      description: "La configuración de descuentos automáticos ha sido actualizada correctamente.",
    });
  };
  
  const onVipPrivilegesSubmit = (values: z.infer<typeof vipPrivilegesSchema>) => {
    updateConfigMutation.mutate({
      type: "vip_privileges",
      ...values,
    });
    
    toast({
      title: "Configuración actualizada",
      description: "La configuración de privilegios VIP ha sido actualizada correctamente.",
    });
  };
  
  // Manejo de excepciones de usuario
  const handleEditException = (exception: UserException) => {
    setEditingException(exception);
    setIsExceptionDialogOpen(true);
  };
  
  const handleUpdateException = (updated: UserException) => {
    setUserExceptions(userExceptions.map(e => e.id === updated.id ? updated : e));
    setIsExceptionDialogOpen(false);
    setEditingException(null);
    
    toast({
      title: "Excepción actualizada",
      description: "La excepción de usuario ha sido actualizada correctamente.",
    });
  };
  
  const handleRemoveException = (id: number) => {
    setUserExceptions(userExceptions.filter(e => e.id !== id));
    
    toast({
      title: "Excepción eliminada",
      description: "La excepción de usuario ha sido eliminada correctamente.",
    });
  };
  
  // Renderizado del formulario de reglas generales
  const renderGeneralForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Configuración General del Sistema</CardTitle>
            <CardDescription>
              Configure las reglas globales para todas las reservas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="system_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Sistema</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    Nombre que aparecerá en los correos y notificaciones.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="max_rooms_per_user"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Máximo de Cuartos por Usuario</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={10} {...field} />
                    </FormControl>
                    <FormDescription>
                      Cantidad máxima de cuartos que un usuario puede reservar simultáneamente.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="max_booking_days_in_advance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días Máximos de Anticipación</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={365} {...field} />
                    </FormControl>
                    <FormDescription>
                      Cuántos días antes se puede hacer una reserva.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="cancellation_policy_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Política de Cancelación (Horas)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={168} {...field} />
                    </FormControl>
                    <FormDescription>
                      Horas antes de la reserva para cancelar sin penalización.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="reminder_hours_before"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recordatorio (Horas Antes)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={72} {...field} />
                    </FormControl>
                    <FormDescription>
                      Horas antes para enviar recordatorio de reserva.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="max_booking_duration_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración Máxima (Horas)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={24} {...field} />
                    </FormControl>
                    <FormDescription>
                      Duración máxima de una reserva en horas.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="no_show_penalty_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Penalización por Inasistencia (Días)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={30} {...field} />
                    </FormControl>
                    <FormDescription>
                      Días de restricción por inasistencia sin aviso.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="auto_approve_bookings"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Aprobación Automática</FormLabel>
                      <FormDescription>
                        Las reservas se aprobarán automáticamente sin revisión manual.
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
                name="enable_waitlist"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Habilitar Lista de Espera</FormLabel>
                      <FormDescription>
                        Permitir que los usuarios se agreguen a una lista de espera para horarios ocupados.
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
          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" onClick={() => form.reset()}>
              Restablecer
            </Button>
            <Button type="submit">
              Guardar Configuración
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
  
  // Renderizado de las reglas por tipo de usuario
  const renderRoleRules = () => (
    <Card>
      <CardHeader>
        <CardTitle>Reglas por Tipo de Usuario</CardTitle>
        <CardDescription>
          Configure reglas específicas para cada tipo de usuario.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo de Usuario</TableHead>
              <TableHead>Reservas Activas</TableHead>
              <TableHead>Días de Anticipación</TableHead>
              <TableHead>Aviso Cancelación</TableHead>
              <TableHead>Duración Máx.</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roleRules.map((rule) => (
              <TableRow key={rule.role}>
                <TableCell className="font-medium">
                  {userTypes.find(t => t.name === rule.role)?.description || rule.role}
                </TableCell>
                <TableCell>{rule.max_active_bookings}</TableCell>
                <TableCell>{rule.advance_booking_days} días</TableCell>
                <TableCell>{rule.cancellation_hours_notice} horas</TableCell>
                <TableCell>{rule.max_booking_duration_hours} horas</TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEditRoleRule(rule)}
                  >
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Reglas de Usuario</DialogTitle>
              <DialogDescription>
                Configure las reglas específicas para este tipo de usuario.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...roleRuleForm}>
              <div className="space-y-4 py-2">
                <FormField
                  control={roleRuleForm.control}
                  name="max_active_bookings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reservas Activas Máximas</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={50} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={roleRuleForm.control}
                  name="advance_booking_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Días de Anticipación</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={365} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={roleRuleForm.control}
                  name="cancellation_hours_notice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horas de Aviso para Cancelación</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={168} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={roleRuleForm.control}
                  name="max_booking_duration_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duración Máxima (Horas)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={24} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={roleRuleForm.control}
                  name="reservation_fee_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tarifa de Reserva (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={roleRuleForm.control}
                  name="cancellation_fee_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tarifa de Cancelación (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={roleRuleForm.control}
                    name="allow_monthly_payment"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Permitir Pago Mensual</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={roleRuleForm.control}
                    name="allow_consecutive_bookings"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Permitir Reservas Consecutivas</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={handleSaveRoleRule}>
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => roleRuleMutation.mutate(roleRules)}
          disabled={roleRuleMutation.isPending}
        >
          {roleRuleMutation.isPending ? "Guardando..." : "Guardar Todos los Cambios"}
        </Button>
      </CardFooter>
    </Card>
  );
  
  // Renderizado del formulario de pago anticipado
  const renderAdvancePaymentForm = () => (
    <Form {...advancePaymentForm}>
      <form onSubmit={advancePaymentForm.handleSubmit(onAdvancePaymentSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Reglas de Pago Anticipado</CardTitle>
            <CardDescription>
              Configure las reglas para pagos anticipados requeridos para reservas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={advancePaymentForm.control}
              name="requireAdvancePayment"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Requerir Pago Anticipado</FormLabel>
                    <FormDescription>
                      Habilite esta opción para exigir un pago previo para confirmar las reservas.
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
              <FormField
                control={advancePaymentForm.control}
                name="paymentPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Porcentaje de Pago Anticipado</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input
                          type="number"
                          {...field}
                          min={0}
                          max={100}
                        />
                        <span className="ml-2">%</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Porcentaje del valor total de la reserva que se debe pagar por adelantado.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={advancePaymentForm.control}
                name="daysBeforeBooking"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días de Antelación</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        min={0}
                        max={30}
                      />
                    </FormControl>
                    <FormDescription>
                      Cuántos días antes de la reserva se debe realizar el pago anticipado.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={advancePaymentForm.control}
              name="userLevelExemption"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Niveles de Usuario Exentos</FormLabel>
                    <FormDescription>
                      Seleccione qué niveles de usuario están exentos del pago anticipado.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {["vip", "trusted", "monthly"].map((level) => (
                      <FormField
                        key={level}
                        control={advancePaymentForm.control}
                        name="userLevelExemption"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={level}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(level)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, level])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== level
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {level === "vip" && "VIP"}
                                {level === "trusted" && "Confiable"}
                                {level === "monthly" && "Mensual"}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={advancePaymentForm.control}
                name="applyToFirstTimeBookings"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Aplicar a Primeras Reservas</FormLabel>
                      <FormDescription>
                        Aplicar a usuarios en su primera reserva.
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
                control={advancePaymentForm.control}
                name="applyToWeekendBookings"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Aplicar a Fines de Semana</FormLabel>
                      <FormDescription>
                        Aplicar a reservas en fines de semana.
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
            
            <FormField
              control={advancePaymentForm.control}
              name="refundableWindow"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ventana de Reembolso (horas)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      min={0}
                      max={72}
                    />
                  </FormControl>
                  <FormDescription>
                    Horas antes de la reserva en las que el pago anticipado aún es reembolsable.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => advancePaymentForm.reset()}>
              Restablecer
            </Button>
            <Button type="submit">
              Guardar Configuración
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
  
  // Renderizado del formulario de horarios premium
  const renderPremiumHoursForm = () => (
    <Form {...premiumHoursForm}>
      <form onSubmit={premiumHoursForm.handleSubmit(onPremiumHoursSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Horarios Premium</CardTitle>
            <CardDescription>
              Configure los horarios de alta demanda con tarifas especiales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={premiumHoursForm.control}
              name="enablePremiumHours"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Habilitar Horarios Premium</FormLabel>
                    <FormDescription>
                      Active esta opción para aplicar tarifas especiales en horarios de alta demanda.
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
              <FormField
                control={premiumHoursForm.control}
                name="premiumStartTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de Inicio</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Hora de inicio para la tarifa premium.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={premiumHoursForm.control}
                name="premiumEndTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de Fin</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Hora de finalización para la tarifa premium.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={premiumHoursForm.control}
              name="premiumDays"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Días Premium</FormLabel>
                    <FormDescription>
                      Seleccione los días de la semana que tendrán horarios premium.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"].map((day) => (
                      <FormField
                        key={day}
                        control={premiumHoursForm.control}
                        name="premiumDays"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={day}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(day)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, day])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== day
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal capitalize">
                                {day}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={premiumHoursForm.control}
                name="premiumPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incremento de Tarifa Premium</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input
                          type="number"
                          {...field}
                          min={0}
                          max={100}
                        />
                        <span className="ml-2">%</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Porcentaje de incremento en la tarifa para horarios premium.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={premiumHoursForm.control}
                name="vipDiscountPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descuento VIP</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input
                          type="number"
                          {...field}
                          min={0}
                          max={100}
                        />
                        <span className="ml-2">%</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Porcentaje de descuento para usuarios VIP en horarios premium.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => premiumHoursForm.reset()}>
              Restablecer
            </Button>
            <Button type="submit">
              Guardar Configuración
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
  
  // Renderizado del formulario de bloqueo de usuarios
  const renderUserBlockForm = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bloqueo de Usuarios</CardTitle>
          <CardDescription>
            Bloquee temporalmente o permanentemente a usuarios problemáticos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...userBlockForm}>
            <form onSubmit={userBlockForm.handleSubmit(onUserBlockSubmit)} className="space-y-4">
              <FormField
                control={userBlockForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un usuario" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id!.toString()}>
                            {user.username} ({user.fullName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Seleccione el usuario que desea bloquear.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userBlockForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razón del Bloqueo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      Detalle la razón por la que se está bloqueando al usuario.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userBlockForm.control}
                name="blockType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Bloqueo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione tipo de bloqueo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="temporary">Temporal</SelectItem>
                        <SelectItem value="permanent">Permanente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Determine si el bloqueo es temporal o permanente.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {userBlockForm.watch("blockType") === "temporary" && (
                <FormField
                  control={userBlockForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Finalización</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>
                        Fecha en la que finalizará el bloqueo.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={userBlockForm.control}
                name="notifyUser"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 rounded-lg border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-0.5">
                      <FormLabel>Notificar al Usuario</FormLabel>
                      <FormDescription>
                        Enviar una notificación al usuario informándole del bloqueo.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button type="submit">
                  Bloquear Usuario
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Excepciones Activas</CardTitle>
          <CardDescription>
            Lista de excepciones y bloqueos activos para usuarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Razón</TableHead>
                <TableHead>Fecha de Creación</TableHead>
                <TableHead>Expiración</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userExceptions.map((exception) => (
                <TableRow key={exception.id}>
                  <TableCell>{exception.username}</TableCell>
                  <TableCell>
                    {exception.exceptionType === "block" && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Bloqueado
                      </Badge>
                    )}
                    {exception.exceptionType === "unblock" && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Unlock className="h-3 w-3" />
                        Desbloqueado
                      </Badge>
                    )}
                    {exception.exceptionType === "vip_access" && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Acceso VIP
                      </Badge>
                    )}
                    {exception.exceptionType === "custom_discount" && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        {exception.discountPercentage}% Descuento
                      </Badge>
                    )}
                    {exception.exceptionType === "payment_exemption" && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        Exento de Pago
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{exception.exceptionReason}</TableCell>
                  <TableCell>{exception.createdAt}</TableCell>
                  <TableCell>{exception.expirationDate || "No expira"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditException(exception)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                        onClick={() => handleRemoveException(exception.id)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              
              {userExceptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    No hay excepciones activas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
  
  // Renderizado del formulario de descuentos automáticos
  const renderAutoDiscountForm = () => (
    <Form {...autoDiscountForm}>
      <form onSubmit={autoDiscountForm.handleSubmit(onAutoDiscountSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Descuentos Automáticos</CardTitle>
            <CardDescription>
              Configure descuentos automáticos basados en diferentes criterios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={autoDiscountForm.control}
              name="enableAutoDiscounts"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Habilitar Descuentos Automáticos</FormLabel>
                    <FormDescription>
                      Active esta opción para aplicar descuentos automáticos según reglas predefinidas.
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
              <FormField
                control={autoDiscountForm.control}
                name="lowDemandDiscount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descuento por Baja Demanda</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input
                          type="number"
                          {...field}
                          min={0}
                          max={100}
                        />
                        <span className="ml-2">%</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Porcentaje de descuento para horarios con baja demanda.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={autoDiscountForm.control}
                name="consecutiveBookingsDiscount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descuento por Reservas Consecutivas</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input
                          type="number"
                          {...field}
                          min={0}
                          max={100}
                        />
                        <span className="ml-2">%</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Porcentaje de descuento para clientes con reservas consecutivas.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={autoDiscountForm.control}
              name="minimumConsecutiveBookings"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mínimo de Reservas Consecutivas</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      min={2}
                      max={20}
                    />
                  </FormControl>
                  <FormDescription>
                    Número mínimo de reservas consecutivas para aplicar el descuento.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={autoDiscountForm.control}
                name="earlyBookingDiscount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descuento por Reserva Anticipada</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input
                          type="number"
                          {...field}
                          min={0}
                          max={100}
                        />
                        <span className="ml-2">%</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Porcentaje de descuento para reservas anticipadas.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={autoDiscountForm.control}
                name="earlyBookingDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días de Anticipación</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        min={1}
                        max={60}
                      />
                    </FormControl>
                    <FormDescription>
                      Días mínimos de anticipación para aplicar el descuento.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Separator />
            
            <FormField
              control={autoDiscountForm.control}
              name="monthlySubscription"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Suscripción Mensual</FormLabel>
                    <FormDescription>
                      Habilite la opción de suscripción mensual con descuento.
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
            
            {autoDiscountForm.watch("monthlySubscription") && (
              <FormField
                control={autoDiscountForm.control}
                name="monthlySubscriptionDiscount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descuento por Suscripción Mensual</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input
                          type="number"
                          {...field}
                          min={0}
                          max={100}
                        />
                        <span className="ml-2">%</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Porcentaje de descuento para clientes con suscripción mensual.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => autoDiscountForm.reset()}>
              Restablecer
            </Button>
            <Button type="submit">
              Guardar Configuración
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
  
  // Renderizado del formulario de privilegios VIP
  const renderVipPrivilegesForm = () => (
    <Form {...vipPrivilegesForm}>
      <form onSubmit={vipPrivilegesForm.handleSubmit(onVipPrivilegesSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Privilegios VIP</CardTitle>
            <CardDescription>
              Configure los beneficios especiales para usuarios VIP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="mb-6">
              <Shield className="h-4 w-4" />
              <AlertTitle>Usuarios VIP</AlertTitle>
              <AlertDescription>
                Estos privilegios se aplicarán automáticamente a los usuarios con nivel de confianza VIP
                o a aquellos a los que se les haya otorgado acceso VIP manualmente.
              </AlertDescription>
            </Alert>
            
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={vipPrivilegesForm.control}
                name="priorityBooking"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Reserva Prioritaria</FormLabel>
                      <FormDescription>
                        Prioridad al reservar en horarios de alta demanda.
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
                control={vipPrivilegesForm.control}
                name="cancellationFeeExemption"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Exención de Tarifa de Cancelación</FormLabel>
                      <FormDescription>
                        No se cobra tarifa por cancelaciones con aviso.
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
            
            <FormField
              control={vipPrivilegesForm.control}
              name="advanceBookingDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Días de Reserva Anticipada</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      min={0}
                      max={90}
                    />
                  </FormControl>
                  <FormDescription>
                    Máximo de días con anticipación que pueden reservar los usuarios VIP.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={vipPrivilegesForm.control}
                name="noShowFeeReduction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reducción de Tarifa por Inasistencia</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input
                          type="number"
                          {...field}
                          min={0}
                          max={100}
                        />
                        <span className="ml-2">%</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Porcentaje de reducción en la tarifa por inasistencia.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={vipPrivilegesForm.control}
                name="premiumHoursDiscount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descuento en Horarios Premium</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input
                          type="number"
                          {...field}
                          min={0}
                          max={100}
                        />
                        <span className="ml-2">%</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Porcentaje de descuento en horarios premium.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={vipPrivilegesForm.control}
              name="consecutiveBookingBonus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bonificación por Reservas Consecutivas</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <Input
                        type="number"
                        {...field}
                        min={0}
                        max={100}
                      />
                      <span className="ml-2">%</span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Porcentaje adicional de descuento por reservas consecutivas.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={vipPrivilegesForm.control}
                name="exclusiveTimeSlots"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Horarios Exclusivos</FormLabel>
                      <FormDescription>
                        Acceso a horarios reservados para usuarios VIP.
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
                control={vipPrivilegesForm.control}
                name="customRateApproval"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Posibilidad de Tarifas Personalizadas</FormLabel>
                      <FormDescription>
                        Posibilidad de negociar tarifas personalizadas.
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
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => vipPrivilegesForm.reset()}>
              Restablecer
            </Button>
            <Button type="submit">
              Guardar Configuración
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
  
  // Diálogo para editar excepciones
  const renderExceptionDialog = () => (
    <Dialog open={isExceptionDialogOpen} onOpenChange={setIsExceptionDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Excepción</DialogTitle>
          <DialogDescription>
            Actualice los detalles de la excepción del usuario.
          </DialogDescription>
        </DialogHeader>
        {editingException && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-sm font-medium">Usuario:</p>
              <p className="col-span-3">{editingException.username}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-sm font-medium">Tipo:</p>
              <div className="col-span-3">
                <Select
                  value={editingException.exceptionType}
                  onValueChange={(value: any) => setEditingException({
                    ...editingException,
                    exceptionType: value,
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="block">Bloqueado</SelectItem>
                    <SelectItem value="unblock">Desbloqueado</SelectItem>
                    <SelectItem value="vip_access">Acceso VIP</SelectItem>
                    <SelectItem value="custom_discount">Descuento Personalizado</SelectItem>
                    <SelectItem value="payment_exemption">Exento de Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <p className="text-sm font-medium">Razón:</p>
              <Input
                className="col-span-3"
                value={editingException.exceptionReason}
                onChange={(e) => setEditingException({
                  ...editingException,
                  exceptionReason: e.target.value,
                })}
              />
            </div>
            {(editingException.exceptionType === "block" || editingException.expirationDate) && (
              <div className="grid grid-cols-4 items-center gap-4">
                <p className="text-sm font-medium">Expiración:</p>
                <Input
                  className="col-span-3"
                  type="date"
                  value={editingException.expirationDate}
                  onChange={(e) => setEditingException({
                    ...editingException,
                    expirationDate: e.target.value,
                  })}
                />
              </div>
            )}
            {editingException.exceptionType === "custom_discount" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <p className="text-sm font-medium">Descuento:</p>
                <div className="col-span-3 flex items-center">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editingException.discountPercentage || 0}
                    onChange={(e) => setEditingException({
                      ...editingException,
                      discountPercentage: parseInt(e.target.value),
                    })}
                  />
                  <span className="ml-2">%</span>
                </div>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsExceptionDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={() => editingException && handleUpdateException(editingException)}>
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Reglas de Reserva y Servicios Especiales</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuración General
          </TabsTrigger>
          <TabsTrigger value="role-rules" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Reglas por Tipo de Usuario
          </TabsTrigger>
          <TabsTrigger value="special-rules" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Reglas Especiales
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="mt-6">
          {renderGeneralForm()}
        </TabsContent>
        
        <TabsContent value="role-rules" className="mt-6">
          {renderRoleRules()}
        </TabsContent>
        
        <TabsContent value="special-rules" className="mt-6">
          <Tabs value={activeSpecialTab} onValueChange={setActiveSpecialTab} className="mb-6">
            <TabsList className={`${isMobile ? "flex flex-wrap gap-1" : "grid w-full grid-cols-5"}`}>
              <TabsTrigger value="advance-payment" className="flex items-center gap-1 text-xs md:text-sm">
                <CreditCard className="h-4 w-4" />
                Pago Anticipado
              </TabsTrigger>
              <TabsTrigger value="premium-hours" className="flex items-center gap-1 text-xs md:text-sm">
                <Clock className="h-4 w-4" />
                Horarios Premium
              </TabsTrigger>
              <TabsTrigger value="user-block" className="flex items-center gap-1 text-xs md:text-sm">
                <AlertTriangle className="h-4 w-4" />
                Bloqueo Usuarios
              </TabsTrigger>
              <TabsTrigger value="auto-discount" className="flex items-center gap-1 text-xs md:text-sm">
                <Percent className="h-4 w-4" />
                Descuentos Auto
              </TabsTrigger>
              <TabsTrigger value="vip-privileges" className="flex items-center gap-1 text-xs md:text-sm">
                <Shield className="h-4 w-4" />
                VIP
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="advance-payment">
              {renderAdvancePaymentForm()}
            </TabsContent>
            
            <TabsContent value="premium-hours">
              {renderPremiumHoursForm()}
            </TabsContent>
            
            <TabsContent value="user-block">
              {renderUserBlockForm()}
            </TabsContent>
            
            <TabsContent value="auto-discount">
              {renderAutoDiscountForm()}
            </TabsContent>
            
            <TabsContent value="vip-privileges">
              {renderVipPrivilegesForm()}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
      
      {renderExceptionDialog()}
    </div>
  );
}