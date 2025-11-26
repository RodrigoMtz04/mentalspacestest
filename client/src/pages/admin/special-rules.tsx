import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { User } from "@shared/schema";
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
} from "lucide-react";

// Esquemas para formularios
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

// Componente principal
export default function SpecialRulesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("advance-payment");
  const [editingException, setEditingException] = useState<UserException | null>(null);
  const [isExceptionDialogOpen, setIsExceptionDialogOpen] = useState(false);
  
  // Formularios
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
  
  // Consulta para obtener usuarios
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
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
  
  // Mutaciones simuladas
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
  
  // Manejadores de envío de formularios
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
      createdBy: 1, // admin ID
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
      <h1 className="text-3xl font-bold mb-6">Reglas Especiales</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="advance-payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pago Anticipado
          </TabsTrigger>
          <TabsTrigger value="premium-hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Horarios Premium
          </TabsTrigger>
          <TabsTrigger value="user-block" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Bloqueo de Usuarios
          </TabsTrigger>
          <TabsTrigger value="auto-discount" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Descuentos Automáticos
          </TabsTrigger>
          <TabsTrigger value="vip-privileges" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privilegios VIP
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
      
      {renderExceptionDialog()}
    </div>
  );
}