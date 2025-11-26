import { useState, useEffect } from "react";
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

// Definir tipo UserRole para los tipos de usuarios que hay en el sistema
type UserRole = "admin" | "standard" | "trusted" | "vip" | "monthly";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { 
  PlusCircle, 
  Trash, 
  Edit, 
  Check, 
  X, 
  Clock, 
  Calendar, 
  Users, 
  AlertCircle 
} from "lucide-react";

// Esquema para validación del formulario general
const bookingRulesSchema = z.object({
  max_active_bookings: z.coerce.number().int().positive("Debe ser mayor a 0"),
  advance_booking_days: z.coerce.number().int().min(0, "No puede ser negativo"),
  cancellation_hours_notice: z.coerce.number().int().min(0, "No puede ser negativo"),
  max_booking_duration_hours: z.coerce.number().int().positive("Debe ser mayor a 0"),
});

// Esquema para edición de tipo de usuario
const userTypeSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  description: z.string().min(5, "Mínimo 5 caracteres"),
});

// Esquema para reglas de reserva por rol
const userRoleRulesSchema = z.object({
  role: z.string(),
  max_active_bookings: z.coerce.number().int().positive(),
  advance_booking_days: z.coerce.number().int().min(0),
  cancellation_hours_notice: z.coerce.number().int().min(0),
  max_booking_duration_hours: z.coerce.number().int().positive(),
  reservation_fee_percentage: z.coerce.number().min(0).max(100),
  cancellation_fee_percentage: z.coerce.number().min(0).max(100),
  allow_monthly_payment: z.boolean().default(false),
  allow_consecutive_bookings: z.boolean().default(true),
});

type BookingRulesValues = z.infer<typeof bookingRulesSchema>;

type RoleRule = {
  role: UserRole;
  max_active_bookings: number;
  advance_booking_days: number;
  cancellation_hours_notice: number;
  max_booking_duration_hours: number;
  reservation_fee_percentage: number;
  cancellation_fee_percentage: number;
  allow_monthly_payment: boolean;
  allow_consecutive_bookings: boolean;
};

export default function BookingRulesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("general-rules");
  
  // Estado para edición de reglas por rol
  const [isRoleRuleModalOpen, setIsRoleRuleModalOpen] = useState(false);
  const [editingRoleRule, setEditingRoleRule] = useState<RoleRule | null>(null);
  
  // Estado para las reglas por rol de usuario
  const [roleRules, setRoleRules] = useState<RoleRule[]>([
    {
      role: "standard",
      max_active_bookings: 5,
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
      max_active_bookings: 8,
      advance_booking_days: 60,
      cancellation_hours_notice: 12,
      max_booking_duration_hours: 3,
      reservation_fee_percentage: 10,
      cancellation_fee_percentage: 25,
      allow_monthly_payment: false,
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
  const [userTypes, setUserTypes] = useState<{ id: number; name: string; description: string; }[]>([
    { id: 1, name: "standard", description: "Usuario estándar" },
    { id: 2, name: "trusted", description: "Usuario verificado con historial confiable" },
    { id: 3, name: "vip", description: "Usuario con beneficios premium" },
    { id: 4, name: "monthly", description: "Usuario con pago mensual" },
    { id: 5, name: "admin", description: "Administrador del sistema" }
  ]);
  
  // Estado para edición de tipo de usuario
  const [isUserTypeModalOpen, setIsUserTypeModalOpen] = useState(false);
  const [editingUserType, setEditingUserType] = useState<{ id: number; name: string; description: string; } | null>(null);

  // Consulta para obtener las reglas de reserva actuales
  const { data: configs, isLoading } = useQuery<SystemConfig[]>({
    queryKey: ['/api/config']
  });

  // Configuración del formulario
  const form = useForm<BookingRulesValues>({
    resolver: zodResolver(bookingRulesSchema),
    defaultValues: {
      max_active_bookings: 8,
      advance_booking_days: 30,
      cancellation_hours_notice: 24,
      max_booking_duration_hours: 4,
    }
  });

  // Actualizar el formulario cuando lleguen los datos
  useEffect(() => {
    if (configs) {
      const values = {
        max_active_bookings: Number(configs.find(c => c.key === 'max_active_bookings')?.value || '8'),
        advance_booking_days: Number(configs.find(c => c.key === 'advance_booking_days')?.value || '30'),
        cancellation_hours_notice: Number(configs.find(c => c.key === 'cancellation_hours_notice')?.value || '24'),
        max_booking_duration_hours: Number(configs.find(c => c.key === 'max_booking_duration_hours')?.value || '4'),
      };
      form.reset(values);
    }
  }, [configs, form]);

  // Mutación para actualizar las reglas
  const updateConfigMutation = useMutation({
    mutationFn: async (data: { key: string, value: string }) => {
      const res = await apiRequest('PATCH', `/api/config/${data.key}`, { value: data.value });
      return res.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar configuración",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Función para enviar el formulario
  const onSubmit = async (values: BookingRulesValues) => {
    try {
      // Actualizar cada configuración una por una
      await updateConfigMutation.mutateAsync({ 
        key: 'max_active_bookings', 
        value: values.max_active_bookings.toString() 
      });
      
      await updateConfigMutation.mutateAsync({ 
        key: 'advance_booking_days', 
        value: values.advance_booking_days.toString() 
      });
      
      await updateConfigMutation.mutateAsync({ 
        key: 'cancellation_hours_notice', 
        value: values.cancellation_hours_notice.toString() 
      });
      
      await updateConfigMutation.mutateAsync({ 
        key: 'max_booking_duration_hours', 
        value: values.max_booking_duration_hours.toString() 
      });
      
      // Actualizar cache y UI
      queryClient.invalidateQueries({ queryKey: ['/api/config'] });
      
      toast({
        title: "Reglas actualizadas",
        description: "Las reglas de reserva se han actualizado correctamente.",
      });
      
      setIsEditMode(false);
    } catch (error) {
      console.error("Error updating booking rules:", error);
    }
  };

  // Función para restaurar valores por defecto
  const handleResetToDefaults = async () => {
    try {
      await updateConfigMutation.mutateAsync({ key: 'max_active_bookings', value: '8' });
      await updateConfigMutation.mutateAsync({ key: 'advance_booking_days', value: '0' });
      await updateConfigMutation.mutateAsync({ key: 'cancellation_hours_notice', value: '24' });
      await updateConfigMutation.mutateAsync({ key: 'max_booking_duration_hours', value: '4' });
      
      queryClient.invalidateQueries({ queryKey: ['/api/config'] });
      
      // Actualizar formulario
      form.reset({
        max_active_bookings: 8,
        advance_booking_days: 0,
        cancellation_hours_notice: 24,
        max_booking_duration_hours: 4,
      });
      
      toast({
        title: "Valores restaurados",
        description: "Se han restaurado los valores por defecto.",
      });
      
      setShowResetDialog(false);
      setIsEditMode(false);
    } catch (error) {
      console.error("Error resetting booking rules:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Obtener descripciones de las configuraciones
  const getConfigDescription = (key: string): string => {
    const config = configs?.find(c => c.key === key);
    return config?.description || "";
  };



  // Función para editar tipo de usuario
  const handleEditUserType = (userType: { id: number; name: string; description: string; }) => {
    setEditingUserType(userType);
    setIsUserTypeModalOpen(true);
  };
  
  // Función para guardar cambios en tipo de usuario
  const handleSaveUserType = (updatedUserType: { id: number; name: string; description: string; }) => {
    if (editingUserType) {
      const updatedTypes = userTypes.map(type => 
        type.id === updatedUserType.id ? updatedUserType : type
      );
      setUserTypes(updatedTypes);
      setEditingUserType(null);
      setIsUserTypeModalOpen(false);
      
      toast({
        title: "Tipo de usuario actualizado",
        description: `El tipo ${updatedUserType.name} ha sido actualizado correctamente.`,
      });
    }
  };
  
  // Función para agregar nuevo tipo de usuario
  const handleAddUserType = () => {
    setEditingUserType({
      id: userTypes.length > 0 ? Math.max(...userTypes.map(t => t.id)) + 1 : 1,
      name: "",
      description: ""
    });
    setIsUserTypeModalOpen(true);
  };
  
  // Función para editar reglas por rol
  const handleEditRoleRule = (rule: RoleRule) => {
    setEditingRoleRule({...rule});
    setIsRoleRuleModalOpen(true);
  };
  
  // Función para guardar cambios en reglas por rol
  const handleSaveRoleRule = (updatedRule: RoleRule) => {
    if (editingRoleRule) {
      const updatedRules = roleRules.map(rule => 
        rule.role === updatedRule.role ? updatedRule : rule
      );
      setRoleRules(updatedRules);
      setEditingRoleRule(null);
      setIsRoleRuleModalOpen(false);
      
      toast({
        title: "Reglas actualizadas",
        description: `Las reglas para usuarios ${updatedRule.role} han sido actualizadas.`,
      });
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Configuración de Reglas del Sistema</h1>
      
      <Tabs 
        defaultValue="general-rules" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general-rules" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Reglas Generales
          </TabsTrigger>
          <TabsTrigger value="user-rules" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Reglas por Tipo de Usuario
          </TabsTrigger>
          <TabsTrigger value="user-types" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Tipos de Usuario
          </TabsTrigger>
        </TabsList>
        
        {/* Contenido para la pestaña de Reglas Generales */}
        <TabsContent value="general-rules">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Reglas Generales</CardTitle>
              <CardDescription>
                Estas reglas afectan a cómo los terapeutas pueden hacer y gestionar reservas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="max_active_bookings"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Máximo de reservas activas</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="1"
                              disabled={!isEditMode}
                            />
                          </FormControl>
                          <FormDescription>
                            {getConfigDescription('max_active_bookings')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="advance_booking_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Días de anticipación requeridos</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="0"
                              disabled={!isEditMode}
                            />
                          </FormControl>
                          <FormDescription>
                            {getConfigDescription('advance_booking_days')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="cancellation_hours_notice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horas para cancelación</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="0"
                              disabled={!isEditMode}
                            />
                          </FormControl>
                          <FormDescription>
                            {getConfigDescription('cancellation_hours_notice')}
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
                          <FormLabel>Duración máxima (horas)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="1"
                              disabled={!isEditMode}
                            />
                          </FormControl>
                          <FormDescription>
                            {getConfigDescription('max_booking_duration_hours')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {isEditMode ? (
                    <div className="flex justify-end gap-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsEditMode(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={updateConfigMutation.isPending}>
                        {updateConfigMutation.isPending ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Guardando...
                          </>
                        ) : "Guardar cambios"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-4">
                      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="text-red-500 border-red-200">
                            Restaurar valores por defecto
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Restaurar valores por defecto?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción restaurará todas las reglas de reserva a sus valores por defecto.
                              Esta acción no puede deshacerse.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleResetToDefaults}
                              className="bg-red-500 text-white hover:bg-red-600"
                            >
                              Sí, restaurar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      
                      <Button 
                        type="button" 
                        onClick={() => setIsEditMode(true)}
                      >
                        Editar reglas
                      </Button>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
            <CardFooter className="bg-muted/50 flex flex-col items-start px-6 py-4">
              <h3 className="text-sm font-medium">Explicación de las reglas</h3>
              <ul className="mt-2 text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li><strong>Máximo de reservas activas:</strong> Número máximo de reservas que un terapeuta puede tener activas simultáneamente.</li>
                <li><strong>Días de anticipación requeridos:</strong> Cuántos días antes se debe hacer una reserva como mínimo.</li>
                <li><strong>Horas para cancelación:</strong> Horas de anticipación necesarias para cancelar una reserva sin penalización.</li>
                <li><strong>Duración máxima:</strong> Tiempo máximo en horas que se puede reservar un consultorio de forma consecutiva.</li>
              </ul>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Contenido para la pestaña de Reglas por Tipo de Usuario */}
        <TabsContent value="user-rules">
          <Card>
            <CardHeader>
              <CardTitle>Reglas por Tipo de Usuario</CardTitle>
              <CardDescription>
                Configure reglas específicas para cada tipo de usuario en el sistema.
                Estas reglas anularán las reglas generales para los usuarios de ese tipo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Usuario</TableHead>
                    <TableHead>Reservas Activas</TableHead>
                    <TableHead>Días Anticipación</TableHead>
                    <TableHead>Hrs. Cancelación</TableHead>
                    <TableHead>Hrs. Duración Máx.</TableHead>
                    <TableHead>Reserva Consecutiva</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleRules.map((rule) => (
                    <TableRow key={rule.role}>
                      <TableCell className="font-medium">{rule.role}</TableCell>
                      <TableCell>{rule.max_active_bookings}</TableCell>
                      <TableCell>{rule.advance_booking_days}</TableCell>
                      <TableCell>{rule.cancellation_hours_notice}</TableCell>
                      <TableCell>{rule.max_booking_duration_hours}</TableCell>
                      <TableCell>{rule.allow_consecutive_bookings ? "Permitida" : "No permitida"}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditRoleRule(rule)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="bg-muted/50 flex flex-col items-start px-6 py-4">
              <h3 className="text-sm font-medium">Características adicionales por tipo de usuario</h3>
              <div className="mt-2 grid grid-cols-2 gap-4 w-full">
                <div className="border rounded-md p-4">
                  <h4 className="font-semibold mb-2">Tarifas y pagos</h4>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li><strong>Usuario Estándar:</strong> 20% de reserva, 50% por cancelación</li>
                    <li><strong>Usuario Verificado:</strong> 10% de reserva, 25% por cancelación</li>
                    <li><strong>Usuario VIP:</strong> 0% de reserva, 10% por cancelación</li>
                    <li><strong>Mensualidad:</strong> Sin cargos adicionales</li>
                  </ul>
                </div>
                <div className="border rounded-md p-4">
                  <h4 className="font-semibold mb-2">Beneficios especiales</h4>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li><strong>Usuario Estándar:</strong> Reserva básica de cubículos</li>
                    <li><strong>Usuario Verificado:</strong> Reservas consecutivas permitidas</li>
                    <li><strong>Usuario VIP:</strong> Acceso a reservas mensuales y prioridad</li>
                    <li><strong>Mensualidad:</strong> Todos los beneficios y cancelación flexible</li>
                  </ul>
                </div>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Contenido para la pestaña de Tipos de Usuario */}
        <TabsContent value="user-types">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tipos de Usuario</CardTitle>
                <CardDescription>
                  Configure los diferentes tipos de usuario para el sistema.
                </CardDescription>
              </div>
              <Button onClick={handleAddUserType}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Agregar tipo
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>{type.description}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEditUserType(type)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="bg-muted/50 flex flex-col items-start px-6 py-4">
              <h3 className="text-sm font-medium">Información sobre tipos de usuario</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Los tipos de usuario determinan qué reglas de reserva y qué funcionalidades están disponibles para cada usuario.
                Puede crear, editar y eliminar tipos de usuario según las necesidades del centro.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Modal para edición de tipo de usuario */}
      <Dialog open={isUserTypeModalOpen} onOpenChange={setIsUserTypeModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingUserType?.id ? 'Editar' : 'Agregar'} Tipo de Usuario</DialogTitle>
            <DialogDescription>
              Defina un nombre y descripción para este tipo de usuario.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Nombre</label>
              <Input 
                id="name" 
                value={editingUserType?.name || ''} 
                onChange={(e) => setEditingUserType(prev => prev ? {...prev, name: e.target.value} : null)}
                placeholder="Ej: trusted"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">Descripción</label>
              <Input 
                id="description" 
                value={editingUserType?.description || ''} 
                onChange={(e) => setEditingUserType(prev => prev ? {...prev, description: e.target.value} : null)}
                placeholder="Ej: Usuario verificado con privilegios adicionales"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserTypeModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => editingUserType && handleSaveUserType(editingUserType)}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}