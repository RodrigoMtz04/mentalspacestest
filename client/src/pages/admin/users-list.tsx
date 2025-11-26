import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, UserPlus, Check, X, Shield, Award, BadgeCheck, Users, UserX, ArrowUpCircle, ArrowDownCircle, AlertCircle, AlertTriangle, History, CheckCircle2 } from "lucide-react";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import UserEditModal from "@/components/users/UserEditModal";
import UserAddModal from "@/components/users/UserAddModal";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import UserDocumentationModal from "@/components/users/UserDocumentationModal.tsx";

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
  incidentType: z.enum(["noshow", "latepayment", "cancellation", "goodbehavior", "vip_override"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
  affectsTrustLevel: z.boolean().default(true),
});

export default function UsersListPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [docUser, setDocUser] = useState<User | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);

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
      rehabilitationRequirements: "5 reservas exitosas consecutivas con pago a tiempo",
    }
  });
  
  // Formulario para registrar incidentes
  const incidentForm = useForm<z.infer<typeof incidentSchema>>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      incidentType: "noshow",
      affectsTrustLevel: true,
    }
  });

  // Consulta para obtener todos los usuarios
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: user?.role === 'admin',
  });

  // Filtrar los usuarios basados en el término de búsqueda
  const filteredUsers = users?.filter(user => 
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Función para abrir el modal de edición
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  // Función para abrir el modal de agregar usuario
  const handleAddUser = () => {
    setIsAddModalOpen(true);
  };

  // Función para cerrar el modal de edición
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedUser(null);
  };

  // Función para cerrar el modal de agregar usuario
  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };
  
  // Función para abrir el modal de validación de documentos
  const handleValidateDocs = (user: User) => {
    setDocUser(user);
    setShowDocModal(true);
  };

  // Datos simulados para niveles de confianza
  const userTrustLevels = [
    { id: 2, username: "maria.garcia", fullName: "María García", trustLevel: "vip", lastChange: "2025-02-15", bookings: 32, attendanceRate: 97, paymentOnTimeRate: 100 },
    { id: 3, username: "carlos.lopez", fullName: "Carlos López", trustLevel: "problemático", lastChange: "2025-03-01", bookings: 15, attendanceRate: 60, paymentOnTimeRate: 80 },
    { id: 4, username: "ana.martinez", fullName: "Ana Martínez", trustLevel: "confiable", lastChange: "2025-02-10", bookings: 12, attendanceRate: 92, paymentOnTimeRate: 100 },
    { id: 5, username: "juan.rodriguez", fullName: "Juan Rodríguez", trustLevel: "novato", lastChange: "2025-03-08", bookings: 2, attendanceRate: 100, paymentOnTimeRate: 100 },
  ];
  
  // Datos simulados para incidentes
  const recentIncidents = [
    { id: 1, userId: 3, username: "carlos.lopez", date: "2025-03-01", incidentType: "noshow", notes: "No se presentó sin aviso previo", affectedTrustLevel: true },
    { id: 2, userId: 3, username: "carlos.lopez", date: "2025-02-20", incidentType: "latepayment", notes: "Pago con 5 días de retraso", affectedTrustLevel: true },
    { id: 3, userId: 2, username: "maria.garcia", date: "2025-02-15", incidentType: "vip_override", notes: "Promoción manual a VIP por historial excelente", affectedTrustLevel: true },
    { id: 4, userId: 4, username: "ana.martinez", date: "2025-02-10", incidentType: "goodbehavior", notes: "10 reservas consecutivas sin problemas", affectedTrustLevel: true },
    { id: 5, userId: 3, username: "carlos.lopez", date: "2025-02-05", incidentType: "cancellation", notes: "Cancelación con menos de 24 horas de anticipación", affectedTrustLevel: true },
  ];
  
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
    const userMatch = users?.find(u => u.id === values.userId);
    
    console.log("Registrando incidente:", {
      ...values,
      username: userMatch?.username,
    });
    
    toast({
      title: "Incidente registrado",
      description: `Se ha registrado un incidente para ${userMatch?.username || 'el usuario'}.`,
    });
    
    setShowIncidentDialog(false);
    incidentForm.reset({
      date: new Date().toISOString().split('T')[0],
      incidentType: "noshow",
      affectsTrustLevel: true,
    });
  };

  if (isLoadingUsers) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
        <Button className="ml-auto" onClick={handleAddUser}>
          <UserPlus className="mr-2 h-4 w-4" />
          Agregar Usuario
        </Button>
      </div>

      <Tabs defaultValue="users" className="mb-6" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center">
            <Users className="mr-2 h-4 w-4" /> 
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="trust" className="flex items-center">
            <Shield className="mr-2 h-4 w-4" /> 
            Niveles de Confianza
          </TabsTrigger>
        </TabsList>
        
        {/* Pestaña de Usuarios */}
        <TabsContent value="users">
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle>Búsqueda y Filtros</CardTitle>
              <CardDescription>
                Busca y filtra los usuarios registrados en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre o usuario..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Usuarios</CardTitle>
              <CardDescription>
                Administra los usuarios y sus permisos en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Correo</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado de Pago</TableHead>
                      <TableHead>Documentación</TableHead>
                      <TableHead>Acceso</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers && filteredUsers.length > 0 ? (
                      filteredUsers.map((userData) => (
                        <TableRow key={userData.id}>
                          <TableCell>{userData.id}</TableCell>
                          <TableCell className="font-medium">{userData.fullName}</TableCell>
                          <TableCell>{userData.username}</TableCell>
                          <TableCell>{userData.email}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={userData.role === 'admin' ? "secondary" : "outline"}
                            >
                              {userData.role === 'admin' ? 'Administrador' : 'Terapeuta'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={userData.paymentStatus === 'active' ? 
                                "bg-green-100 text-green-800 hover:bg-green-100" :
                                userData.paymentStatus === 'pending' ? 
                                "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" :
                                "bg-red-100 text-red-800 hover:bg-red-100"
                              }
                            >
                              {userData.paymentStatus === 'active' ? 'Al día' : 
                              userData.paymentStatus === 'pending' ? 'Pendiente' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={userData.documentationStatus === 'approved' ? 'bg-green-100 text-green-800 hover:bg-green-100' : userData.documentationStatus === 'rejected' ? 'bg-red-100 text-red-800 hover:bg-red-100' : userData.documentationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' : 'bg-gray-100 text-gray-800 hover:bg-gray-100'}
                            >
                              {userData.documentationStatus === 'approved' ? 'Aprobada' : userData.documentationStatus === 'rejected' ? 'Rechazada' : userData.documentationStatus === 'pending' ? 'En revisión' : 'Sin docs'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {userData.isActive ? (
                                <>
                                  <Check className="text-green-600 h-5 w-5 mr-1" /> 
                                  <span>Activo</span>
                                </>
                              ) : (
                                <>
                                  <X className="text-red-600 h-5 w-5 mr-1" /> 
                                  <span>Inactivo</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleEditUser(userData)}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleValidateDocs(userData)}
                                disabled={!userData.identificationUrl && !userData.diplomaUrl}
                              >
                                Validar docs
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          {searchTerm ? "No se encontraron usuarios con ese criterio de búsqueda" : "No hay usuarios registrados"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Niveles de Confianza */}
        <TabsContent value="trust">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Columna 1: Configuración de Reglas */}
            <div className="col-span-1 md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Reglas de Nivel de Confianza</CardTitle>
                  <CardDescription>
                    Configura cómo los usuarios avanzan y retroceden entre niveles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium flex items-center">
                          <ArrowUpCircle className="mr-2 h-5 w-5 text-green-500" />
                          Reglas de Promoción
                        </h3>
                        
                        <div className="flex items-center space-x-2 mb-4">
                          <FormField
                            control={form.control}
                            name="promotionEnabled"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Switch 
                                    checked={field.value} 
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="!mt-0">Habilitar promociones automáticas</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <h4 className="text-base font-medium md:col-span-2">Promoción a Confiable</h4>
                          
                          <FormField
                            control={form.control}
                            name="bookingsForTrusted"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Mínimo de reservas</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Reservas mínimas para ser Confiable
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
                                <FormLabel>Tasa de asistencia (%)</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <h4 className="text-base font-medium md:col-span-2 mt-4">Promoción a VIP</h4>
                          
                          <FormField
                            control={form.control}
                            name="bookingsForVip"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Mínimo de reservas</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="minimumAttendanceRateForVip"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tasa de asistencia (%)</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <Separator className="my-6" />
                        
                        <h3 className="text-lg font-medium flex items-center">
                          <ArrowDownCircle className="mr-2 h-5 w-5 text-red-500" />
                          Reglas de Degradación
                        </h3>
                        
                        <div className="flex items-center space-x-2 mb-4">
                          <FormField
                            control={form.control}
                            name="degradationEnabled"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Switch 
                                    checked={field.value} 
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="!mt-0">Habilitar degradaciones automáticas</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="noShowsForDegradation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ausencias para degradación</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="latePaymentsForDegradation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pagos tardíos para degradación</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="degradationPeriodDays"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Período de evaluación (días)</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Período en el que se cuentan infracciones
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <Separator className="my-6" />
                        
                        <h3 className="text-lg font-medium flex items-center">
                          <History className="mr-2 h-5 w-5 text-blue-500" />
                          Rehabilitación
                        </h3>
                        
                        <div className="flex items-center space-x-2 mb-4">
                          <FormField
                            control={form.control}
                            name="rehabilitationEnabled"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Switch 
                                    checked={field.value} 
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="!mt-0">Permitir rehabilitación automática</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="rehabilitationPeriodDays"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Período de rehabilitación (días)</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Tiempo mínimo antes de poder rehabilitarse
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
                                <FormLabel>Requisitos para rehabilitación</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button 
                          type="submit" 
                          className="flex items-center" 
                          disabled={updateRulesMutation.isPending}
                        >
                          {updateRulesMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                          )}
                          Guardar Cambios
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
            
            {/* Columna 2: Visualización y Gestión */}
            <div className="space-y-6">
              {/* Tarjeta de Niveles de Confianza */}
              <Card>
                <CardHeader>
                  <CardTitle>Niveles de Confianza</CardTitle>
                  <CardDescription>
                    Estado actual de los usuarios
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Award className="h-5 w-5 mr-2 text-yellow-500" />
                        <span className="font-medium">VIP</span>
                      </div>
                      <span className="text-sm py-1 px-2 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
                        {userTrustLevels.filter(u => u.trustLevel === "vip").length} usuarios
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <BadgeCheck className="h-5 w-5 mr-2 text-blue-500" />
                        <span className="font-medium">Confiable</span>
                      </div>
                      <span className="text-sm py-1 px-2 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                        {userTrustLevels.filter(u => u.trustLevel === "confiable").length} usuarios
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-gray-500" />
                        <span className="font-medium">Novato</span>
                      </div>
                      <span className="text-sm bg-muted text-foreground py-1 px-2 rounded-full">
                        {userTrustLevels.filter(u => u.trustLevel === "novato").length} usuarios
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                        <span className="font-medium">Problemático</span>
                      </div>
                      <span className="text-sm py-1 px-2 rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">
                        {userTrustLevels.filter(u => u.trustLevel === "problemático").length} usuarios
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tarjeta de Usuarios por Nivel */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalle por Usuario</CardTitle>
                  <CardDescription>
                    Niveles de confianza actuales
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {userTrustLevels.map((userTrust) => (
                      <div key={userTrust.id} className="p-4 hover:bg-muted/50">
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-medium">{userTrust.fullName}</div>
                          <Badge variant={
                            userTrust.trustLevel === "vip" ? "secondary" :
                            userTrust.trustLevel === "confiable" ? "outline" :
                            userTrust.trustLevel === "novato" ? "default" : "destructive"
                          }>
                            {userTrust.trustLevel}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">@{userTrust.username}</div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Reservas: {userTrust.bookings}</span>
                          <span>Asistencia: {userTrust.attendanceRate}%</span>
                          <span>Pagos a tiempo: {userTrust.paymentOnTimeRate}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Tarjeta de Acciones */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button 
                      className="w-full flex items-center justify-start" 
                      variant="outline"
                      onClick={() => setShowIncidentDialog(true)}
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Registrar Incidente
                    </Button>
                    <Button 
                      className="w-full flex items-center justify-start" 
                      variant="outline"
                    >
                      <UserX className="mr-2 h-4 w-4" />
                      Ver Usuarios Problemáticos
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Tarjeta de Incidentes Recientes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Incidentes Recientes</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {recentIncidents.slice(0, 3).map((incident) => (
                      <div key={incident.id} className="p-3 hover:bg-muted/50">
                        <div className="flex items-center mb-1">
                          {incident.incidentType === 'noshow' && (
                            <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                          )}
                          {incident.incidentType === 'latepayment' && (
                            <AlertCircle className="h-4 w-4 mr-2 text-yellow-500" />
                          )}
                          {incident.incidentType === 'cancellation' && (
                            <X className="h-4 w-4 mr-2 text-orange-500" />
                          )}
                          {incident.incidentType === 'goodbehavior' && (
                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                          )}
                          {incident.incidentType === 'vip_override' && (
                            <Award className="h-4 w-4 mr-2 text-purple-500" />
                          )}
                          <span className="font-medium text-sm">@{incident.username}</span>
                        </div>
                        <div className="text-xs text-muted-foreground ml-6">
                          {incident.notes}
                        </div>
                        <div className="text-xs text-muted-foreground ml-6 mt-1">
                          {incident.date}
                        </div>
                      </div>
                    ))}
                  </div>
                  {recentIncidents.length > 3 && (
                    <div className="p-2">
                      <Button variant="ghost" size="sm" className="w-full text-xs">
                        Ver todos los incidentes
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modales */}
      <UserEditModal 
        isOpen={isEditModalOpen} 
        onClose={handleCloseEditModal} 
        user={selectedUser} 
      />
      
      <UserAddModal 
        isOpen={isAddModalOpen} 
        onClose={handleCloseAddModal} 
      />
      
      {/* Modal para registrar incidente */}
      <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Incidente</DialogTitle>
            <DialogDescription>
              Registre un incidente que afecta el nivel de confianza de un usuario.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...incidentForm}>
            <form onSubmit={incidentForm.handleSubmit(handleSaveIncident)} className="space-y-4">
              <FormField
                control={incidentForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario</FormLabel>
                    <FormControl>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value="">Seleccione un usuario</option>
                        {users?.map(u => (
                          <option key={u.id} value={u.id}>{u.fullName} (@{u.username})</option>
                        ))}
                      </select>
                    </FormControl>
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
                    <FormControl>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value="noshow">No se presentó</option>
                        <option value="latepayment">Pago tardío</option>
                        <option value="cancellation">Cancelación tardía</option>
                        <option value="goodbehavior">Buen comportamiento</option>
                        <option value="vip_override">Asignación VIP manual</option>
                      </select>
                    </FormControl>
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
                      <Input {...field} placeholder="Detalles del incidente" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={incidentForm.control}
                name="affectsTrustLevel"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Afecta el nivel de confianza</FormLabel>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => setShowIncidentDialog(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Registrar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {showDocModal && docUser && (
        <UserDocumentationModal
          user={docUser}
          isOpen={showDocModal}
          onClose={() => { setShowDocModal(false); setDocUser(null); }}
          onStatusChange={() => queryClient.invalidateQueries({ queryKey: ['/api/users'] })}
        />
      )}
    </div>
  );
}
