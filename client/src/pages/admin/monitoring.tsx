import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { 
  User,
  Booking,
  Room
} from "@shared/schema";
import { 
  Calendar,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Clock,
  FileText,
  Users,
  Settings,
  PieChart,
  Bell,
  User as UserIcon,
  RefreshCcw,
  MailWarning,
  Building,
  DollarSign
} from "lucide-react";

// Componente para la barra de progreso
function ProgressBar({ value, max, color = "bg-primary" }: { value: number, max: number, color?: string }) {
  const percentage = Math.min(Math.round((value / max) * 100), 100);
  
  return (
    <div className="w-full bg-muted rounded-full h-2.5">
      <div className={`${color} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
    </div>
  );
}

// Componente para mostrar estadísticas en tarjetas
function StatCard({ 
  title, 
  value, 
  icon, 
  description, 
  trend,
  color = "bg-primary"
}: { 
  title: string, 
  value: string | number, 
  icon: React.ReactNode, 
  description?: string,
  trend?: { value: number, label: string },
  color?: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-2">{value}</h3>
            {trend && (
              <p className={`text-xs mt-1 ${trend.value > 0 ? 'text-green-500' : trend.value < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {trend.value > 0 ? '↑' : trend.value < 0 ? '↓' : '→'} {Math.abs(trend.value)}% {trend.label}
              </p>
            )}
          </div>
          <div className={`${color.replace('bg-', 'text-')} p-2 rounded-full bg-primary/10`}>
            {icon}
          </div>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-4">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Componente para mostrar una alerta
function AlertItem({ 
  title, 
  message, 
  severity = "medium", 
  timestamp, 
  actionText 
}: { 
  title: string, 
  message: string, 
  severity?: "low" | "medium" | "high", 
  timestamp: string, 
  actionText?: string 
}) {
  const severityColors = {
    low: "bg-yellow-100 border-yellow-300 text-yellow-800",
    medium: "bg-orange-100 border-orange-300 text-orange-800",
    high: "bg-red-100 border-red-300 text-red-800"
  };
  
  return (
    <div className={`${severityColors[severity]} border-l-4 p-4 rounded mb-4`}>
      <div className="flex justify-between">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <h4 className="font-medium">{title}</h4>
        </div>
        <span className="text-xs">{timestamp}</span>
      </div>
      <p className="mt-2 text-sm">{message}</p>
      {actionText && (
        <div className="mt-3">
          <Button variant="outline" size="sm" className="text-xs">
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
}

// Tipos para los datos de monitoreo
type UserStats = {
  userId: number;
  username: string;
  bookingsCount: number;
  cancelCount: number;
  noShowCount: number;
  attendanceRate: number;
  lateArrivalRate: number;
  paymentOnTimeRate: number;
  totalSpent: number;
  lastBookingDate: string;
  consecutiveBookings: number;
  preferredRooms: { roomId: number, roomName: string, count: number }[];
  preferredDays: { day: string, count: number }[];
  preferredHours: { hour: number, count: number }[];
};

type RoomStats = {
  roomId: number;
  roomName: string;
  totalBookings: number;
  occupancyRate: number;
  averageRating: number;
  popularity: number;
  revenue: number;
  peakHours: { hour: number, count: number }[];
  peakDays: { day: string, count: number }[];
  maintenanceEvents: number;
};

type SystemAlert = {
  id: number;
  title: string;
  message: string;
  severity: "low" | "medium" | "high";
  timestamp: string;
  category: "user" | "system" | "payment" | "maintenance";
  isRead: boolean;
  relatedUserId?: number;
  relatedRoomId?: number;
  actionNeeded: boolean;
};

type TimeSlot = {
  startHour: number;
  bookingCount: number;
};

type DayUsage = {
  day: string;
  bookingCount: number;
};

export default function MonitoringPage() {
  const [activeTab, setActiveTab] = useState("alerts");
  const [timeRange, setTimeRange] = useState("30d");
  const [userFilter, setUserFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");
  
  // Datos simulados para la demostración
  const [systemAlerts] = useState<SystemAlert[]>([
    {
      id: 1,
      title: "Usuario con múltiples cancelaciones",
      message: "Carlos López ha cancelado 3 reservas en la última semana, lo que excede el límite establecido.",
      severity: "medium",
      timestamp: "2025-03-10 09:32:15",
      category: "user",
      isRead: false,
      relatedUserId: 3,
      actionNeeded: true
    },
    {
      id: 2,
      title: "Tasa de ocupación baja",
      message: "La tasa de ocupación general está por debajo del 40% esta semana, lo que es inusualmente bajo.",
      severity: "low",
      timestamp: "2025-03-09 14:45:22",
      category: "system",
      isRead: true,
      actionNeeded: false
    },
    {
      id: 3,
      title: "Problema de mantenimiento reportado",
      message: "Se ha reportado un problema con el aire acondicionado en la sala Cub VH 1.",
      severity: "high",
      timestamp: "2025-03-10 08:15:33",
      category: "maintenance",
      isRead: false,
      relatedRoomId: 1,
      actionNeeded: true
    },
    {
      id: 4,
      title: "Pago pendiente",
      message: "Juan Rodríguez tiene un pago pendiente de $120 con fecha de vencimiento de ayer.",
      severity: "medium",
      timestamp: "2025-03-10 07:05:11",
      category: "payment",
      isRead: false,
      relatedUserId: 5,
      actionNeeded: true
    },
    {
      id: 5,
      title: "Alta demanda detectada",
      message: "Se ha detectado un pico de demanda para los miércoles de 16:00 a 19:00, considere ajustar precios.",
      severity: "low",
      timestamp: "2025-03-08 23:15:47",
      category: "system",
      isRead: true,
      actionNeeded: false
    }
  ]);
  
  const [userStatsData] = useState<UserStats[]>([
    {
      userId: 2,
      username: "maria.garcia",
      bookingsCount: 28,
      cancelCount: 2,
      noShowCount: 0,
      attendanceRate: 92.8,
      lateArrivalRate: 7.1,
      paymentOnTimeRate: 100,
      totalSpent: 1680,
      lastBookingDate: "2025-03-09",
      consecutiveBookings: 5,
      preferredRooms: [
        { roomId: 1, roomName: "Cub VH 1", count: 18 },
        { roomId: 4, roomName: "Cub SM 1", count: 10 }
      ],
      preferredDays: [
        { day: "Lunes", count: 8 },
        { day: "Miércoles", count: 12 },
        { day: "Viernes", count: 8 }
      ],
      preferredHours: [
        { hour: 10, count: 12 },
        { hour: 16, count: 10 },
        { hour: 18, count: 6 }
      ]
    },
    {
      userId: 3,
      username: "carlos.lopez",
      bookingsCount: 15,
      cancelCount: 5,
      noShowCount: 1,
      attendanceRate: 60,
      lateArrivalRate: 20,
      paymentOnTimeRate: 80,
      totalSpent: 720,
      lastBookingDate: "2025-03-10",
      consecutiveBookings: 0,
      preferredRooms: [
        { roomId: 5, roomName: "Cub SM 2", count: 10 },
        { roomId: 2, roomName: "Cub VH 2", count: 5 }
      ],
      preferredDays: [
        { day: "Martes", count: 7 },
        { day: "Jueves", count: 8 }
      ],
      preferredHours: [
        { hour: 12, count: 8 },
        { hour: 17, count: 7 }
      ]
    },
    {
      userId: 4,
      username: "ana.martinez",
      bookingsCount: 32,
      cancelCount: 1,
      noShowCount: 0,
      attendanceRate: 96.8,
      lateArrivalRate: 3.1,
      paymentOnTimeRate: 100,
      totalSpent: 2240,
      lastBookingDate: "2025-03-08",
      consecutiveBookings: 8,
      preferredRooms: [
        { roomId: 1, roomName: "Cub VH 1", count: 22 },
        { roomId: 2, roomName: "Cub VH 2", count: 10 }
      ],
      preferredDays: [
        { day: "Lunes", count: 12 },
        { day: "Miércoles", count: 10 },
        { day: "Viernes", count: 10 }
      ],
      preferredHours: [
        { hour: 9, count: 15 },
        { hour: 11, count: 10 },
        { hour: 15, count: 7 }
      ]
    }
  ]);
  
  const [roomStatsData] = useState<RoomStats[]>([
    {
      roomId: 1,
      roomName: "Cub VH 1",
      totalBookings: 86,
      occupancyRate: 72,
      averageRating: 4.8,
      popularity: 100,
      revenue: 5160,
      peakHours: [
        { hour: 10, count: 22 },
        { hour: 11, count: 18 },
        { hour: 16, count: 20 }
      ],
      peakDays: [
        { day: "Lunes", count: 18 },
        { day: "Miércoles", count: 22 },
        { day: "Viernes", count: 20 }
      ],
      maintenanceEvents: 1
    },
    {
      roomId: 2,
      roomName: "Cub VH 2",
      totalBookings: 65,
      occupancyRate: 54,
      averageRating: 4.5,
      popularity: 75,
      revenue: 3900,
      peakHours: [
        { hour: 9, count: 15 },
        { hour: 15, count: 18 },
        { hour: 17, count: 12 }
      ],
      peakDays: [
        { day: "Martes", count: 15 },
        { day: "Jueves", count: 18 },
        { day: "Viernes", count: 14 }
      ],
      maintenanceEvents: 0
    },
    {
      roomId: 4,
      roomName: "Cub SM 1",
      totalBookings: 72,
      occupancyRate: 60,
      averageRating: 4.7,
      popularity: 84,
      revenue: 4320,
      peakHours: [
        { hour: 11, count: 16 },
        { hour: 14, count: 18 },
        { hour: 16, count: 15 }
      ],
      peakDays: [
        { day: "Lunes", count: 16 },
        { day: "Miércoles", count: 18 },
        { day: "Jueves", count: 14 }
      ],
      maintenanceEvents: 2
    }
  ]);
  
  const [timeSlots] = useState<TimeSlot[]>([
    { startHour: 8, bookingCount: 45 },
    { startHour: 9, bookingCount: 72 },
    { startHour: 10, bookingCount: 88 },
    { startHour: 11, bookingCount: 95 },
    { startHour: 12, bookingCount: 65 },
    { startHour: 13, bookingCount: 52 },
    { startHour: 14, bookingCount: 58 },
    { startHour: 15, bookingCount: 75 },
    { startHour: 16, bookingCount: 92 },
    { startHour: 17, bookingCount: 85 },
    { startHour: 18, bookingCount: 78 },
    { startHour: 19, bookingCount: 42 }
  ]);
  
  const [dayUsage] = useState<DayUsage[]>([
    { day: "Lunes", bookingCount: 112 },
    { day: "Martes", bookingCount: 88 },
    { day: "Miércoles", bookingCount: 125 },
    { day: "Jueves", bookingCount: 95 },
    { day: "Viernes", bookingCount: 108 },
    { day: "Sábado", bookingCount: 55 },
    { day: "Domingo", bookingCount: 22 }
  ]);
  
  // Consulta para obtener usuarios reales desde la API
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users']
  });
  
  // Consulta para obtener salas reales desde la API
  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ['/api/rooms']
  });
  
  // Consulta para obtener reservas reales desde la API
  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ['/api/bookings']
  });
  
  // Función para enviar notificación al usuario
  const handleContactUser = (userId: number) => {
    const user = users.find(u => u.id === userId);
    
    // En una implementación real, aquí se enviaría una notificación
    // o se abriría un modal para redactar un mensaje
    
    if (user) {
      console.log(`Contactando a ${user.username}...`);
      alert(`Se enviaría una notificación a ${user.username}`);
    }
  };
  
  // Función para marcar una alerta como leída
  const handleMarkAsRead = (alertId: number) => {
    // En una implementación real, aquí se actualizaría el estado de la alerta
    console.log(`Marcando alerta ${alertId} como leída...`);
  };
  
  // Estadísticas generales
  const generalStats = {
    totalBookings: bookings.length || 223,
    cancelationRate: 6.7,
    noShowRate: 2.2,
    occupancyRate: 62,
    averageBookingDuration: 1.8,
    totalRevenue: 13380,
    activeUsers: users.length || 45
  };
  
  // Estadísticas de usuarios
  const userStats = {
    mostActive: userStatsData.sort((a, b) => b.bookingsCount - a.bookingsCount)[0],
    mostReliable: userStatsData.sort((a, b) => b.attendanceRate - a.attendanceRate)[0],
    leastReliable: userStatsData.sort((a, b) => a.attendanceRate - b.attendanceRate)[0]
  };
  
  // Estadísticas de salas
  const roomStats = {
    mostPopular: roomStatsData.sort((a, b) => b.popularity - a.popularity)[0],
    highestOccupancy: roomStatsData.sort((a, b) => b.occupancyRate - a.occupancyRate)[0],
    highestRevenue: roomStatsData.sort((a, b) => b.revenue - a.revenue)[0]
  };
  
  // Función para formatear horas (8 -> 08:00)
  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Monitoreo y Reportes</h1>
      
      <Tabs 
        defaultValue="alerts" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList className="flex flex-wrap md:grid md:grid-cols-4 w-full">
          <TabsTrigger value="alerts" className="flex items-center gap-1 text-xs sm:text-sm md:gap-2 min-w-24 justify-center">
            <Bell className="h-4 w-4" />
            <span className="hidden xs:inline">Alertas</span>
            <span className="inline xs:hidden">Al.</span>
          </TabsTrigger>
          <TabsTrigger value="user-behavior" className="flex items-center gap-1 text-xs sm:text-sm md:gap-2 min-w-24 justify-center">
            <UserIcon className="h-4 w-4" />
            <span className="hidden xs:inline">Comportamiento</span>
            <span className="inline xs:hidden">Comp.</span>
          </TabsTrigger>
          <TabsTrigger value="usage-patterns" className="flex items-center gap-1 text-xs sm:text-sm md:gap-2 min-w-24 justify-center">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden xs:inline">Patrones de Uso</span>
            <span className="inline xs:hidden">Patrones</span>
          </TabsTrigger>
          <TabsTrigger value="room-metrics" className="flex items-center gap-1 text-xs sm:text-sm md:gap-2 min-w-24 justify-center">
            <Building className="h-4 w-4" />
            <span className="hidden xs:inline">Métricas de Espacios</span>
            <span className="inline xs:hidden">Espacios</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Contenido para la pestaña de Alertas y Notificaciones */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Alertas y Notificaciones del Sistema</CardTitle>
              <CardDescription>
                Monitoree eventos importantes que requieren atención o supervisión.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-6">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <RefreshCcw className="h-4 w-4" />
                    Actualizar
                  </Button>
                  <Select value="all" onValueChange={(value) => console.log(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Todas las categorías" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      <SelectItem value="user">Usuarios</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                      <SelectItem value="payment">Pagos</SelectItem>
                      <SelectItem value="maintenance">Mantenimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Badge variant="outline" className="mr-2">
                    {systemAlerts.filter(a => !a.isRead).length} no leídas
                  </Badge>
                  <Badge variant="outline">
                    {systemAlerts.filter(a => a.actionNeeded).length} requieren acción
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-4">
                {systemAlerts.map(alert => (
                  <div key={alert.id} className="flex items-start gap-4 p-4 rounded-lg border mb-4">
                    <div className={`p-2 rounded-full ${
                      alert.severity === 'high' ? 'bg-red-100 text-red-600' :
                      alert.severity === 'medium' ? 'bg-orange-100 text-orange-600' : 
                      'bg-yellow-100 text-yellow-600'
                    }`}>
                      {alert.category === 'user' ? <UserIcon className="h-5 w-5" /> :
                       alert.category === 'payment' ? <DollarSign className="h-5 w-5" /> :
                       alert.category === 'maintenance' ? <Settings className="h-5 w-5" /> :
                       <Bell className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">{alert.title}</h4>
                        <span className="text-xs text-muted-foreground">{alert.timestamp.split(' ')[0]}</span>
                      </div>
                      <p className="text-sm mt-1">{alert.message}</p>
                      <div className="flex gap-2 mt-3">
                        {alert.relatedUserId && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleContactUser(alert.relatedUserId!)}
                          >
                            <MailWarning className="h-4 w-4 mr-1" />
                            Contactar usuario
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleMarkAsRead(alert.id)}
                        >
                          Marcar como leída
                        </Button>
                      </div>
                    </div>
                    <Badge 
                      className={
                        alert.severity === 'high' ? 'bg-red-500' :
                        alert.severity === 'medium' ? 'bg-orange-500' : 
                        'bg-yellow-500'
                      }
                    >
                      {alert.severity === 'high' ? 'Alta' :
                       alert.severity === 'medium' ? 'Media' : 'Baja'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 flex-col items-start px-6 py-4">
              <h3 className="text-sm font-medium">Sistema de alertas</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Las alertas se generan automáticamente en base a reglas predefinidas. El sistema detecta patrones de comportamiento
                anómalos, problemas de mantenimiento, pagos pendientes y otros eventos que requieren atención. Las alertas no leídas
                se mantendrán visibles hasta que sean marcadas como leídas.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Contenido para la pestaña de Comportamiento de Usuarios */}
        <TabsContent value="user-behavior">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard 
              title="Usuarios activos" 
              value={generalStats.activeUsers} 
              icon={<Users className="h-5 w-5" />} 
              trend={{ value: 12, label: "último mes" }}
            />
            <StatCard 
              title="Tasa de cancelación" 
              value={`${generalStats.cancelationRate}%`} 
              icon={<Clock className="h-5 w-5" />} 
              trend={{ value: -2.3, label: "último mes" }}
              color="bg-orange-500"
            />
            <StatCard 
              title="Tasa de inasistencia" 
              value={`${generalStats.noShowRate}%`} 
              icon={<AlertTriangle className="h-5 w-5" />}
              trend={{ value: -1.5, label: "último mes" }}
              color="bg-red-500"
            />
            <StatCard 
              title="Usuario más activo" 
              value={userStats.mostActive.username} 
              icon={<UserIcon className="h-5 w-5" />}
              description={`${userStats.mostActive.bookingsCount} reservas este mes`}
            />
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Comportamiento de Usuarios</CardTitle>
              <CardDescription>
                Análisis detallado del comportamiento de los usuarios en el sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-6">
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Todos los usuarios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los usuarios</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id?.toString() || ""}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Últimos 30 días" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Últimos 7 días</SelectItem>
                    <SelectItem value="30d">Últimos 30 días</SelectItem>
                    <SelectItem value="90d">Últimos 90 días</SelectItem>
                    <SelectItem value="1y">Último año</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Total Reservas</TableHead>
                    <TableHead>Tasa de Asistencia</TableHead>
                    <TableHead>Cancelaciones</TableHead>
                    <TableHead>Inasistencias</TableHead>
                    <TableHead>Pago a Tiempo</TableHead>
                    <TableHead>Espacios Preferidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userStatsData.map(user => (
                    <TableRow key={user.userId}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.bookingsCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className={`mr-2 ${
                            user.attendanceRate >= 90 ? "text-green-600" :
                            user.attendanceRate >= 70 ? "text-amber-600" :
                            "text-red-600"
                          }`}>
                            {user.attendanceRate}%
                          </span>
                          <ProgressBar 
                            value={user.attendanceRate} 
                            max={100} 
                            color={
                              user.attendanceRate >= 90 ? "bg-green-500" :
                              user.attendanceRate >= 70 ? "bg-amber-500" :
                              "bg-red-500"
                            } 
                          />
                        </div>
                      </TableCell>
                      <TableCell>{user.cancelCount}</TableCell>
                      <TableCell>{user.noShowCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="mr-2">{user.paymentOnTimeRate}%</span>
                          <ProgressBar 
                            value={user.paymentOnTimeRate} 
                            max={100} 
                            color={
                              user.paymentOnTimeRate >= 90 ? "bg-green-500" :
                              user.paymentOnTimeRate >= 70 ? "bg-amber-500" :
                              "bg-red-500"
                            } 
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.preferredRooms.map(room => (
                            <Badge key={room.roomId} variant="outline" className="text-xs">
                              {room.roomName}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="bg-muted/50 flex-col items-start px-6 py-4">
              <h3 className="text-sm font-medium">Análisis de comportamiento</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                El análisis de comportamiento de usuarios permite identificar patrones, detectar usuarios problemáticos y
                reconocer a los usuarios más confiables. Esta información es utilizada por el sistema de nivel de confianza
                para ajustar automáticamente los privilegios y restricciones de cada usuario.
              </p>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Historial de Acciones</CardTitle>
              <CardDescription>
                Registro de penalizaciones, excepciones y comunicaciones importantes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Aplicado por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>2025-03-08</TableCell>
                    <TableCell>carlos.lopez</TableCell>
                    <TableCell>
                      <Badge variant="destructive">Penalización</Badge>
                    </TableCell>
                    <TableCell>Cobro por inasistencia (50% del valor)</TableCell>
                    <TableCell>Sistema</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>2025-03-05</TableCell>
                    <TableCell>ana.martinez</TableCell>
                    <TableCell>
                      <Badge variant="default">Promoción</Badge>
                    </TableCell>
                    <TableCell>Promoción a nivel VIP por buen historial</TableCell>
                    <TableCell>Sistema</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>2025-03-03</TableCell>
                    <TableCell>juan.rodriguez</TableCell>
                    <TableCell>
                      <Badge variant="outline">Excepción</Badge>
                    </TableCell>
                    <TableCell>Excepción de pago por situación médica</TableCell>
                    <TableCell>admin</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>2025-03-01</TableCell>
                    <TableCell>maria.garcia</TableCell>
                    <TableCell>
                      <Badge variant="outline">Comunicación</Badge>
                    </TableCell>
                    <TableCell>Recordatorio de política de cancelación</TableCell>
                    <TableCell>admin</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Contenido para la pestaña de Patrones de Uso */}
        <TabsContent value="usage-patterns">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard 
              title="Total de reservas" 
              value={generalStats.totalBookings} 
              icon={<Calendar className="h-5 w-5" />} 
              trend={{ value: 8.5, label: "último mes" }}
            />
            <StatCard 
              title="Tasa de ocupación" 
              value={`${generalStats.occupancyRate}%`} 
              icon={<Building className="h-5 w-5" />} 
              trend={{ value: 4.2, label: "último mes" }}
            />
            <StatCard 
              title="Duración promedio" 
              value={`${generalStats.averageBookingDuration} horas`} 
              icon={<Clock className="h-5 w-5" />}
              trend={{ value: 0.2, label: "último mes" }}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Uso por Día de la Semana</CardTitle>
                <CardDescription>
                  Distribución de reservas por día de la semana.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dayUsage.map(day => (
                    <div key={day.day} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{day.day}</span>
                        <span>{day.bookingCount} reservas</span>
                      </div>
                      <ProgressBar 
                        value={day.bookingCount} 
                        max={Math.max(...dayUsage.map(d => d.bookingCount))} 
                        color={
                          day.bookingCount > 100 ? "bg-green-500" :
                          day.bookingCount > 50 ? "bg-blue-500" :
                          "bg-gray-500"
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Uso por Hora del Día</CardTitle>
                <CardDescription>
                  Distribución de reservas por hora del día.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timeSlots.map(slot => (
                    <div key={slot.startHour} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{formatHour(slot.startHour)}</span>
                        <span>{slot.bookingCount} reservas</span>
                      </div>
                      <ProgressBar 
                        value={slot.bookingCount} 
                        max={Math.max(...timeSlots.map(s => s.bookingCount))} 
                        color={
                          slot.bookingCount > 80 ? "bg-red-500" :
                          slot.bookingCount > 60 ? "bg-amber-500" :
                          "bg-green-500"
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Sugerencias Basadas en Patrones</CardTitle>
              <CardDescription>
                Recomendaciones automatizadas basadas en el análisis de patrones de uso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-blue-50">
                  <h3 className="font-medium text-blue-700 flex items-center">
                    <PieChart className="h-5 w-5 mr-2" />
                    Optimización de precios
                  </h3>
                  <p className="mt-2 text-sm text-blue-700">
                    Considere aumentar las tarifas los días miércoles entre 10:00 y 12:00, y entre 16:00 y 18:00, 
                    que son las horas de mayor demanda.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg bg-green-50">
                  <h3 className="font-medium text-green-700 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Promoción de horarios con baja ocupación
                  </h3>
                  <p className="mt-2 text-sm text-green-700">
                    Los horarios entre 13:00 y 14:00 tienen una ocupación baja. Considere ofrecer descuentos 
                    especiales para estos horarios para aumentar su uso.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg bg-amber-50">
                  <h3 className="font-medium text-amber-700 flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Distribución de consultorios
                  </h3>
                  <p className="mt-2 text-sm text-amber-700">
                    El consultorio "Cub VH 1" tiene una alta demanda. Considere redistribuir algunas reservas 
                    a otros consultorios o invertir en mejoras para los menos populares.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 flex-col items-start px-6 py-4">
              <h3 className="text-sm font-medium">Optimización basada en datos</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                El análisis de patrones de uso permite optimizar la distribución de recursos, ajustar precios según la demanda
                y mejorar la experiencia de los usuarios. Las sugerencias se generan automáticamente en base a los datos históricos
                de reservas y ocupación.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Contenido para la pestaña de Métricas de Espacios */}
        <TabsContent value="room-metrics">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard 
              title="Espacio más popular" 
              value={roomStats.mostPopular.roomName} 
              icon={<Building className="h-5 w-5" />} 
              description={`${roomStats.mostPopular.totalBookings} reservas / ${roomStats.mostPopular.occupancyRate}% ocupación`}
            />
            <StatCard 
              title="Mayor ocupación" 
              value={`${roomStats.highestOccupancy.occupancyRate}%`} 
              icon={<Users className="h-5 w-5" />} 
              description={`${roomStats.highestOccupancy.roomName}`}
            />
            <StatCard 
              title="Mayor ingreso" 
              value={`$${roomStats.highestRevenue.revenue}`} 
              icon={<DollarSign className="h-5 w-5" />}
              description={`${roomStats.highestRevenue.roomName}`}
              color="bg-green-500"
            />
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Métricas de Espacios</CardTitle>
              <CardDescription>
                Análisis detallado del rendimiento de cada espacio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-6">
                <Select value={roomFilter} onValueChange={setRoomFilter}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Todos los espacios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los espacios</SelectItem>
                    {rooms.map(room => (
                      <SelectItem key={room.id} value={room.id?.toString() || ""}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Últimos 30 días" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Últimos 7 días</SelectItem>
                    <SelectItem value="30d">Últimos 30 días</SelectItem>
                    <SelectItem value="90d">Últimos 90 días</SelectItem>
                    <SelectItem value="1y">Último año</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Espacio</TableHead>
                    <TableHead>Total Reservas</TableHead>
                    <TableHead>Tasa de Ocupación</TableHead>
                    <TableHead>Calificación</TableHead>
                    <TableHead>Ingresos</TableHead>
                    <TableHead>Horarios Pico</TableHead>
                    <TableHead>Mantenimiento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roomStatsData.map(room => (
                    <TableRow key={room.roomId}>
                      <TableCell className="font-medium">{room.roomName}</TableCell>
                      <TableCell>{room.totalBookings}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className={`mr-2 ${
                            room.occupancyRate >= 70 ? "text-green-600" :
                            room.occupancyRate >= 40 ? "text-amber-600" :
                            "text-red-600"
                          }`}>
                            {room.occupancyRate}%
                          </span>
                          <ProgressBar 
                            value={room.occupancyRate} 
                            max={100} 
                            color={
                              room.occupancyRate >= 70 ? "bg-green-500" :
                              room.occupancyRate >= 40 ? "bg-amber-500" :
                              "bg-red-500"
                            } 
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="mr-2">{room.averageRating}</span>
                          {[1, 2, 3, 4, 5].map(star => (
                            <svg 
                              key={star} 
                              xmlns="http://www.w3.org/2000/svg" 
                              viewBox="0 0 24 24" 
                              fill={star <= Math.floor(room.averageRating) ? "currentColor" : "none"} 
                              stroke="currentColor" 
                              className={`h-3 w-3 ${star <= Math.floor(room.averageRating) ? "text-yellow-500" : "text-muted-foreground/40"}`}>
                              <path
                                d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"
                              />
                            </svg>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>${room.revenue}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          {room.peakHours.slice(0, 2).map(peak => (
                            <span key={peak.hour} className="mr-2">
                              {formatHour(peak.hour)}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={room.maintenanceEvents > 0 ? "outline" : "secondary"}>
                          {room.maintenanceEvents} eventos
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="bg-muted/50 flex-col items-start px-6 py-4">
              <h3 className="text-sm font-medium">Rendimiento de espacios</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                El análisis de rendimiento de espacios permite identificar oportunidades de mejora, optimizar precios
                y planificar el mantenimiento de manera más eficiente. Los espacios con alta demanda pueden justificar
                inversiones adicionales, mientras que los menos utilizados pueden beneficiarse de promociones especiales.
              </p>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Ingresos por Espacio</CardTitle>
              <CardDescription>
                Análisis de ingresos generados por cada espacio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {roomStatsData.sort((a, b) => b.revenue - a.revenue).map(room => (
                  <div key={room.roomId} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{room.roomName}</span>
                      <span className="font-bold">${room.revenue}</span>
                    </div>
                    <ProgressBar 
                      value={room.revenue} 
                      max={Math.max(...roomStatsData.map(r => r.revenue))} 
                      color="bg-green-500" 
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{room.totalBookings} reservas</span>
                      <span>${(room.revenue / room.totalBookings).toFixed(2)} por reserva</span>
                    </div>
                  </div>
                ))}
                
                <div className="border-t pt-4 mt-6">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Total</span>
                    <span className="font-bold">${roomStatsData.reduce((sum, room) => sum + room.revenue, 0)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

