import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  List, 
  ChevronLeft, 
  ChevronRight, 
  Plus
} from "lucide-react";
import { Booking, Room, User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { formatDateLocalized, formatTime } from "@/lib/utils/date-utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Importar componente de modal de reserva (pendiente de creación/importación)
// import BookingModal from "@/components/bookings/BookingModal";
import { parseISO } from "date-fns";

// Horas de operación (de 8:00 AM a 8:00 PM)
const OPERATING_HOURS = Array.from({ length: 13 }, (_, i) => `${i + 8}:00`);

//Parece ser que esta página es igual que la de bookings?
// Pero con la diferencia de que esta es solo para admin.
// Pero no hay ninguna diferencia a la "original".

export default function AdminBookingsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Obtener el parámetro 'location' de la URL si existe
  const urlParams = new URLSearchParams(window.location.search);
  const locationParam = urlParams.get('location');
  
  const [selectedLocation, setSelectedLocation] = useState<string>(locationParam || "all");
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Consulta para obtener todas las reservas
  const { data: bookings, isLoading: isLoadingBookings } = useQuery<Booking[]>({
    queryKey: ['/api/bookings'],
    enabled: user?.role === 'admin',
  });

  // Consulta para obtener todos los consultorios
  const { data: rooms, isLoading: isLoadingRooms } = useQuery<Room[]>({
    queryKey: ['/api/rooms'],
    enabled: user?.role === 'admin',
  });

  // Consulta para obtener todos los usuarios
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: user?.role === 'admin',
  });

  // Función para obtener el nombre del consultorio
  const getRoomName = (roomId: number) => {
    if (!rooms) return "Cargando...";
    const room = rooms.find(r => r.id === roomId);
    return room ? room.name : "Consultorio desconocido";
  };

  // Función para obtener el nombre del usuario
  const getUserName = (userId: number) => {
    if (!users) return "Cargando...";
    const userObj = users.find(u => u.id === userId);
    return userObj ? userObj.fullName : "Usuario desconocido";
  };

  // Obtener las reservas para la fecha seleccionada
  const getBookingsForDate = (date: Date) => {
    if (!bookings) return [];
    
    return bookings.filter(booking => {
      const bookingDate = parseISO(booking.date);
      return (
        bookingDate.getDate() === date.getDate() &&
        bookingDate.getMonth() === date.getMonth() &&
        bookingDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Filtrar las reservas
  const filteredBookings = bookings?.filter(booking => {
    // Filtro por término de búsqueda
    const searchMatch = !searchTerm || 
      (getUserName(booking.userId).toLowerCase().includes(searchTerm.toLowerCase()) ||
       getRoomName(booking.roomId).toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filtro por estado
    const statusMatch = statusFilter === "all" || booking.status === statusFilter;
    
    // Filtro por fecha
    let dateMatch = true;
    const bookingDate = parseISO(booking.date);
    const today = new Date();
    
    if (dateFilter === "today") {
      dateMatch = 
        bookingDate.getDate() === today.getDate() && 
        bookingDate.getMonth() === today.getMonth() && 
        bookingDate.getFullYear() === today.getFullYear();
    } else if (dateFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      dateMatch = bookingDate >= weekAgo;
    } else if (dateFilter === "future") {
      dateMatch = bookingDate > today;
    } else if (dateFilter === "past") {
      dateMatch = bookingDate < today;
    }
    
    return searchMatch && statusMatch && dateMatch;
  });

  // Filtrar los consultorios según la ubicación seleccionada
  const filteredRooms = rooms?.filter(room => {
    if (selectedLocation === "all") return true;
    // Verificar si la ubicación está en features o en location
      /*
      JC:   Este clon de la pagina tiene codigo que ya no funciona,
            Segun yo, esta pagina nunca se usa, por lo que no deberia haber problema.
            Pero es molesto que el IDE marque errores en codigo aunque no se use.
      */
    //return room.features?.includes(selectedLocation) || room.location === selectedLocation;
  });

  // Obtener las reservas para el día seleccionado
  const todayBookings = getBookingsForDate(selectedDate);

  // Cambiar al día anterior
  const goToPreviousDay = () => {
    const previousDay = new Date(selectedDate);
    previousDay.setDate(previousDay.getDate() - 1);
    setSelectedDate(previousDay);
  };

  // Cambiar al día siguiente
  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
  };

  if (isLoadingBookings || isLoadingRooms || isLoadingUsers) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusBadge = (status: string, userId?: number) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">{userId ? getUserName(userId) : "Confirmada"}</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelada</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800">Completada</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  // Determinar si hay una reserva para un consultorio en una hora específica
  const getBookingForRoomAtTime = (roomId: number, time: string) => {
    return todayBookings.find(booking => 
      booking.roomId === roomId && 
      booking.startTime <= time && 
      booking.endTime > time
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Calendario de Reservas</h1>
        <Button 
          className="gap-2" 
          onClick={() => setIsBookingModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Nueva Reserva
        </Button>
      </div>
      
      <Tabs defaultValue="calendar" className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger 
            value="calendar" 
            onClick={() => setViewMode("calendar")}
            className="flex items-center gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            Vista Calendario
          </TabsTrigger>
          <TabsTrigger 
            value="list" 
            onClick={() => setViewMode("list")}
            className="flex items-center gap-2"
          >
            <List className="h-4 w-4" />
            Vista Lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Calendario de Consultorios</CardTitle>
                  <CardDescription>
                    Visualiza la disponibilidad y reservas de todos los consultorios
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => {
                          const prevWeek = new Date(selectedDate);
                          prevWeek.setDate(prevWeek.getDate() - 7);
                          setSelectedDate(prevWeek);
                        }}
                        title="Semana anterior"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="text-lg font-semibold">
                        {formatDateLocalized(selectedDate)}
                      </div>
                      <div className="relative">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const popover = document.getElementById('date-picker-popover');
                            if (popover) {
                              popover.classList.toggle('hidden');
                            }
                          }}
                          title="Seleccionar fecha"
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                        <div id="date-picker-popover" className="absolute z-50 right-0 mt-2 hidden">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              if (date) {
                                setSelectedDate(date);
                                document.getElementById('date-picker-popover')?.classList.add('hidden');
                              }
                            }}
                            className="bg-card rounded-md border border-border shadow-md p-3"
                          />
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => {
                          const nextWeek = new Date(selectedDate);
                          nextWeek.setDate(nextWeek.getDate() + 7);
                          setSelectedDate(nextWeek);
                        }}
                        title="Semana siguiente"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Tabs 
                    defaultValue="all" 
                    onValueChange={setSelectedLocation}
                    value={selectedLocation}
                    className="w-full mb-4"
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="all">Todos</TabsTrigger>
                      <TabsTrigger value="Vistahermosa">Vistahermosa</TabsTrigger>
                      <TabsTrigger value="Santa Monica">Santa Monica</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  <div className="border rounded-lg overflow-hidden bg-background">
                    <div className="grid grid-cols-7 gap-0">
                      {Array.from({ length: 7 }, (_, i) => {
                        const date = new Date(selectedDate);
                        // Ajustar para obtener el lunes de la semana actual
                        const mondayDiff = date.getDay() === 0 ? -6 : 1 - date.getDay();
                        const monday = new Date(date);
                        monday.setDate(date.getDate() + mondayDiff);
                        
                        // Calcular el día de la semana actual
                        const currentDay = new Date(monday);
                        currentDay.setDate(monday.getDate() + i);
                        
                        const isSelected = 
                          currentDay.getDate() === selectedDate.getDate() && 
                          currentDay.getMonth() === selectedDate.getMonth() && 
                          currentDay.getFullYear() === selectedDate.getFullYear();
                        
                        const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
                        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
                        
                        return (
                          <button 
                            key={i}
                            className={`flex flex-col items-center justify-center py-3 border-b-2 transition-all ${
                              isSelected 
                                ? "border-primary text-primary font-semibold bg-primary/10" 
                                : "border-transparent hover:bg-muted"
                            }`}
                            onClick={() => setSelectedDate(new Date(currentDay))}
                          >
                            <span className="text-xs font-medium">{dayNames[i]}</span>
                            <span className="text-xl font-bold">{currentDay.getDate()}</span>
                            <span className="text-xs text-muted-foreground">{months[currentDay.getMonth()]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-1 text-left font-semibold border bg-muted min-w-[60px] text-xs">Hora</th>
                      {filteredRooms && filteredRooms.map(room => (
                        <th 
                          key={room.id} 
                          className="p-1 text-left font-semibold border bg-muted min-w-[140px] text-xs"
                        >
                          {room.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {OPERATING_HOURS.map((hour, index) => (
                      <tr key={index}>
                        <td className="p-1 border font-medium text-foreground text-xs">
                          {hour}
                        </td>
                        {filteredRooms && filteredRooms.map(room => {
                          const booking = getBookingForRoomAtTime(room.id, hour);
                          return (
                            <td 
                              key={`${room.id}-${hour}`} 
                              className={`p-1 border relative h-10 ${
                                booking ? 
                                  booking.status === 'confirmed' ? 'bg-green-50' : 
                                  booking.status === 'pending' ? 'bg-yellow-50' :
                                  booking.status === 'cancelled' ? 'bg-red-50' :
                                  'bg-blue-50'
                                : ''
                              }`}
                            >
                              {booking ? (
                                <div className="absolute inset-0 flex flex-col justify-center p-0.5">
                                  <div className="font-medium truncate text-xs">
                                    {getUserName(booking.userId)}
                                  </div>
                                  <div className="text-xs text-gray-500 leading-tight">
                                    {booking.startTime} - {booking.endTime}
                                  </div>
                                  <div className="mt-0.5">
                                    {getStatusBadge(booking.status, booking.userId)}
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full flex items-center justify-center">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-gray-400 hover:text-primary h-6 w-6 p-0"
                                    onClick={() => setIsBookingModalOpen(true)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Filtra las reservas por diferentes criterios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Buscar por terapeuta o consultorio"
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="confirmed">Confirmadas</SelectItem>
                      <SelectItem value="pending">Pendientes</SelectItem>
                      <SelectItem value="cancelled">Canceladas</SelectItem>
                      <SelectItem value="completed">Completadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha</label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por fecha" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las fechas</SelectItem>
                      <SelectItem value="today">Hoy</SelectItem>
                      <SelectItem value="week">Última semana</SelectItem>
                      <SelectItem value="future">Próximas</SelectItem>
                      <SelectItem value="past">Pasadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    className="gap-2 w-full"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setDateFilter("all");
                    }}
                  >
                    <Filter className="h-4 w-4" />
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Reservas</CardTitle>
              <CardDescription>
                {filteredBookings ? 
                  `Mostrando ${filteredBookings.length} de ${bookings?.length} reservas` : 
                  "Cargando reservas..."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Horario</TableHead>
                      <TableHead>Consultorio</TableHead>
                      <TableHead>Terapeuta</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings && filteredBookings.length > 0 ? (
                      filteredBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">
                            {formatDateLocalized(new Date(booking.date))}
                          </TableCell>
                          <TableCell>
                            {booking.startTime} - {booking.endTime}
                          </TableCell>
                          <TableCell>{getRoomName(booking.roomId)}</TableCell>
                          <TableCell>{getUserName(booking.userId)}</TableCell>
                          <TableCell>{getStatusBadge(booking.status, booking.userId)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                Ver detalles
                              </Button>
                              {booking.status === "pending" && (
                                <Button variant="outline" size="sm" className="text-green-600">
                                  Confirmar
                                </Button>
                              )}
                              {(booking.status === "pending" || booking.status === "confirmed") && (
                                <Button variant="outline" size="sm" className="text-red-600">
                                  Cancelar
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No se encontraron reservas con los filtros seleccionados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal para crear nuevas reservas (a implementar) */}
      {/* <BookingModal 
        isOpen={isBookingModalOpen} 
        onClose={() => setIsBookingModalOpen(false)}
        selectedDate={selectedDate}
      /> */}
    </div>
  );
}