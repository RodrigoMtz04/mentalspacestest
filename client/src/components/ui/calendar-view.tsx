import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Función para obtener la fecha actual del sistema de forma confiable
export function getCurrentDate(): Date {
  const now = new Date();
  console.log("Fecha actual del sistema (calendar-view):", now);
  return now;
}

type CalendarViewMode = "day" | "week" | "month";
type LocationType = "all" | "vistahermosa" | "santamonica";

interface CalendarViewProps {
  onDateSelect?: (date: Date) => void;
  onNewBooking?: (date?: Date) => void;
  selectedDate?: Date;
}

interface CalendarEvent {
  id: number;
  title: string;
  roomId: number;
  roomName: string;
  start: Date;
  end: Date;
  status: string;
  userId: number;
  location: string;
}

export default function CalendarView({ onDateSelect, onNewBooking, selectedDate }: CalendarViewProps) {
  // Usando la función getCurrentDate para obtener fecha actual real del sistema
  const todayDate = getCurrentDate();
  console.log("Iniciando CalendarView con fecha actual:", todayDate);
  
  // Si no hay fecha seleccionada, usar fecha actual del sistema
  const initialDate = selectedDate || todayDate;
  console.log("Fecha inicial para CalendarView:", initialDate);
  
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("day");
  const [selectedLocation, setSelectedLocation] = useState<LocationType>("all");
  
  // Log para debugging
  useEffect(() => {
    console.log("CalendarView -> Fecha actual:", currentDate);
    console.log("Fecha actual del sistema:", todayDate);
  }, [currentDate]);
  
  // Update current date when selectedDate prop changes
  useEffect(() => {
    if (selectedDate) {
      console.log("CalendarView -> Actualización por prop selectedDate:", selectedDate);
      setCurrentDate(selectedDate);
    }
  }, [selectedDate]);

  // Determina el rango de fechas para las consultas según el modo de visualización
  const dateRange = useMemo(() => {
    let startDate = new Date(currentDate);
    let endDate = new Date(currentDate);
    
    if (viewMode === 'week') {
      startDate = startOfWeek(currentDate, { locale: es });
      endDate = endOfWeek(currentDate, { locale: es });
    } else if (viewMode === 'month') {
      startDate = startOfMonth(currentDate);
      endDate = endOfMonth(currentDate);
    }
    
    // Formato YYYY-MM-DD para ambas fechas
    return {
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd')
    };
  }, [currentDate, viewMode]);

  // Log del rango de fechas para debugging
  useEffect(() => {
    console.log('Rango de fechas para consulta de reservas:', dateRange);
  }, [dateRange]);
  
  // Fetch bookings - consulta para un rango de fechas según la vista actual
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ['/api/bookings', 
      viewMode === 'day' 
        ? { date: format(currentDate, 'yyyy-MM-dd') }
        : { startDate: dateRange.start, endDate: dateRange.end }
    ],
    staleTime: 0, // Sin caché para asegurar datos frescos
    refetchInterval: 5000, // Auto refresh cada 5 segundos
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    gcTime: 0, // Sin garbage collection
  });

  // Fetch rooms for booking data
  const { data: rooms = [] } = useQuery<any[]>({
    queryKey: ['/api/rooms'],
    staleTime: 3600000, // 1 hour
  });

  // Fetch therapists for booking data
  const { data: therapists = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    staleTime: 3600000, // 1 hour
  });
  
  // Crear mapa de terapeutas para búsqueda más eficiente
  const therapistMap = useMemo(() => {
    const map = new Map();
    therapists.forEach(therapist => {
      map.set(therapist.id, therapist);
    });
    return map;
  }, [therapists]);

  // Determine room location based on features
  const getRoomLocation = useMemo(() => {
    return (room: any): string => {
      if (!room || !room.features) return "Desconocido";
      if (room.features.includes("Vistahermosa")) return "vistahermosa";
      if (room.features.includes("Santa Monica")) return "santamonica";
      return "Desconocido";
    };
  }, []);

  // Process bookings into calendar events
  const events: CalendarEvent[] = useMemo(() => {
    // Solo loggear el conteo para debug, no todo el conjunto de reservas
    console.log(`Procesando ${bookings.length} eventos de calendario`);
    
    // Si no hay reservas o salas, devolver array vacío para prevenir errores
    if (!bookings.length || !rooms.length) return [];
    
    // Crear un mapa para búsqueda más eficiente de salas por ID
    const roomMap = new Map(rooms.map(room => [room.id, room]));
    
    return bookings.map((booking: any) => {
      const room = roomMap.get(booking.roomId);
      
      // Construir fechas completas combinando la fecha y la hora
      const startDateTime = new Date(`${booking.date}T${booking.startTime}`);
      const endDateTime = new Date(`${booking.date}T${booking.endTime}`);
      
      return {
        id: booking.id,
        title: room?.name || `Cubículo ${booking.roomId}`,
        roomId: booking.roomId,
        roomName: room?.name || `Cubículo ${booking.roomId}`,
        start: startDateTime,
        end: endDateTime,
        status: booking.status,
        userId: booking.userId,
        location: getRoomLocation(room)
      };
    });
  }, [bookings, rooms]);

  // Filter events based on selected location
  const filteredEvents = useMemo(() => {
    return selectedLocation === "all" 
      ? events 
      : events.filter(event => event.location === selectedLocation);
  }, [events, selectedLocation]);

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const prevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const changeViewMode = (mode: CalendarViewMode) => {
    setViewMode(mode);
    // Al cambiar a vista diaria, asegurarse de que se seleccione el día actual si no hay uno seleccionado
    if (mode === "day" && selectedDate && !isSameDay(currentDate, selectedDate)) {
      setCurrentDate(selectedDate);
    }
  };

  const handleDateClick = (date: Date) => {
    if (onDateSelect) {
      // Crear una nueva instancia de la fecha para evitar referencias a fechas antiguas
      // y asegurarnos de que se trate como una nueva fecha
      const freshDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
      console.log("Fecha seleccionada en calendario (original):", date);
      console.log("Fecha seleccionada en calendario (fresh date):", freshDate);
      
      // Actualizar la fecha actual en el componente
      setCurrentDate(freshDate);
      
      // Notificar al componente padre
      onDateSelect(freshDate);
    }
  };

  const getCalendarHeader = () => {
    // Encabezados de días de la semana para todas las vistas
    const dayNamesHeader = (
      <div className="grid grid-cols-7 bg-muted border-b border-border">
        {["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((day) => (
          <div key={day} className="py-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
    );
    
    if (viewMode === "month") {
      return dayNamesHeader;
    }
    
    if (viewMode === "day") {
      return (
        <>
          <div className="bg-muted border-b border-border py-3 px-4">
            <h3 className="text-lg font-medium text-center text-foreground">
              {format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}
            </h3>
          </div>
          {dayNamesHeader}
        </>
      );
    }
    
    return null;
  };

  const renderMonthCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const rows = [];
    let days = [];
    let day = startDate;
    
    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        // Usa los eventos filtrados por ubicación
        const dayEvents = filteredEvents.filter(event => isSameDay(event.start, cloneDay));
        
        days.push(
          <div 
            key={day.toString()} 
            className={cn(
              "min-h-[120px] p-1 border-r border-b border-border relative",
              !isSameMonth(day, monthStart) && "bg-muted text-muted-foreground",
              isSameDay(day, new Date()) && "bg-primary/10"
            )}
            onClick={() => handleDateClick(cloneDay)}
          >
            <div className={cn(
              "text-right p-1",
              isSameDay(day, new Date()) && "font-semibold text-primary-700"
            )}>
              {format(day, "d")}
            </div>
            
            <div className="mt-1 px-1 space-y-1">
              {dayEvents.map((event) => (
                <div
                  key={event.id}
                  className={cn(
                    "text-xs p-1 rounded truncate border-l-2",
                    event.location === "vistahermosa"
                      ? "bg-primary-100 text-primary-800 border-primary-500" 
                      : "bg-secondary-100 text-secondary-800 border-secondary-500"
                  )}
                >
                  {format(event.start, "HH:mm")} - {event.roomName}
                </div>
              ))}
            </div>
          </div>
        );
        
        day = addDays(day, 1);
      }
      
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      
      days = [];
    }
    
    return rows;
  };
  
  const renderDayCalendar = () => {
    // Filtrar los eventos filtrados por ubicación para este día, usando memoización
    const dayEvents = useMemo(() => {
      return filteredEvents.filter(event => isSameDay(event.start, currentDate));
    }, [filteredEvents, currentDate]);
    
    // Generar las horas del día (de 8am a 8pm)
    const hours = Array.from({ length: 13 }, (_, i) => i + 8);
    
    return (
      <div className="w-full space-y-2">
        {hours.map(hour => {
          // Filtrar eventos que empiezan a esta hora
          const hourEvents = dayEvents.filter(
            event => parseInt(format(event.start, "H")) === hour
          );
          
          return (
            <div key={hour} className="border rounded-md overflow-hidden">
              <div className="bg-muted border-b px-4 py-2 flex justify-between items-center border-border">
                <div className="font-medium text-foreground">
                  {hour}:00
                </div>
                {hourEvents.length === 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-primary hover:text-primary/80"
                    onClick={() => {
                      if (onNewBooking) {
                        // Crear una fecha para esta hora específica, usando fecha actual como base
                        const today = getCurrentDate();
                        const date = new Date(today);
                        // Luego configuramos la fecha según currentDate para mantener el día seleccionado
                        date.setFullYear(currentDate.getFullYear());
                        date.setMonth(currentDate.getMonth());
                        date.setDate(currentDate.getDate());
                        date.setHours(hour, 0, 0, 0);
                        console.log("Fecha para nueva reserva (botón +Reservar):", date);
                        onNewBooking(date);
                      }
                    }}
                  >
                    + Reservar
                  </Button>
                )}
              </div>
              
              {/* Columna de eventos */}
              <div className="p-2">
                {hourEvents.length > 0 ? (
                  <div className="space-y-2">
                    {hourEvents.map(event => {
                      // Calcular duración del evento en horas
                      const startHour = parseInt(format(event.start, "H"));
                      const endHour = parseInt(format(event.end, "H"));
                      const duration = endHour - startHour; // reservado para futuras mejoras de altura

                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "p-3 rounded-md shadow-sm border-l-4",
                            event.location === "vistahermosa"
                              ? "bg-primary-50 border-primary-500" 
                              : "bg-secondary-50 border-secondary-500"
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">
                                {format(event.start, "HH:mm")} - {format(event.end, "HH:mm")}
                              </div>
                              <div className="text-lg font-semibold mt-1">{event.roomName}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                Reservado por: {therapistMap.get(event.userId)?.fullName || "Usuario desconocido"}
                              </div>
                            </div>
                            <div className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">
                              {event.status}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No hay reservas para esta hora
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (bookingsLoading) {
    return (
      <div className="bg-card rounded-lg shadow overflow-hidden mb-6 border border-border">
        <div className="p-4 bg-muted border-b border-border">
           <Skeleton className="h-8 w-64" />
         </div>
         <div className="grid grid-cols-7 gap-2 p-4">
           {Array(35).fill(0).map((_, i) => (
             <Skeleton key={i} className="h-24 w-full" />
           ))}
         </div>
       </div>
     );
   }

  return (
    <div className="bg-card rounded-lg shadow overflow-hidden mb-6 border border-border">
      <div className="p-4 bg-muted border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={prevMonth}
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              Anterior
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={nextMonth}
            >
              Siguiente
              <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </h2>
          <div className="flex space-x-2">
            <Button 
              variant={viewMode === "day" ? "default" : "outline"} 
              size="sm"
              onClick={() => changeViewMode("day")}
            >
              Día
            </Button>
            <Button 
              variant={viewMode === "week" ? "default" : "outline"} 
              size="sm"
              onClick={() => changeViewMode("week")}
            >
              Semana
            </Button>
            <Button 
              variant={viewMode === "month" ? "default" : "outline"} 
              size="sm"
              onClick={() => changeViewMode("month")}
            >
              Mes
            </Button>
          </div>
        </div>
        
        {/* Selector de ubicación */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <Label htmlFor="location-select" className="text-sm font-medium">Ubicación:</Label>
          </div>
          <Select 
            value={selectedLocation}
            onValueChange={(value: string) => setSelectedLocation(value as LocationType)}
          >
            <SelectTrigger id="location-select" className="w-[200px]">
              <SelectValue placeholder="Seleccionar ubicación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ubicaciones</SelectItem>
              <SelectItem value="vistahermosa">Vistahermosa</SelectItem>
              <SelectItem value="santamonica">Santa Monica</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className={viewMode === "day" ? "min-w-[600px]" : "min-w-[800px]"}>
          {getCalendarHeader()}
          
          {viewMode === "month" ? (
            <div className="grid grid-cols-7 grid-rows-5 border-b border-border">
              {renderMonthCalendar()}
            </div>
          ) : viewMode === "day" ? (
            <div className="p-4">
              {renderDayCalendar()}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Vista de semana no implementada
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
