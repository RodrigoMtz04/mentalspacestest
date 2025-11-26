import React, { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { 
  Card,
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    CalendarIcon,
    Plus,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { Booking, Room, User, Location } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { formatDateLocalized, formatDateForAPI } from "@/lib/utils/date-utils";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Horas de operación (de 8:00 AM a 8:00 PM)
const OPERATING_HOURS = Array.from({ length: 13 }, (_, i) => `${i + 8}:00`);

export default function BookingsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Obtener el parámetro 'location' de la URL si existe
  const urlParams = new URLSearchParams(window.location.search);
  const locationParam = urlParams.get('location');
  const bookingCreated = urlParams.get('bookingCreated');
  const dateParam = urlParams.get('date');

  const [selectedLocation, setSelectedLocation] = useState<string>(locationParam || "all");
  // Usar la fecha de la URL si existe, de lo contrario usar la fecha actual
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (dateParam) {
      const parsedDate = new Date(dateParam);
      // Verificar que la fecha sea válida
      return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    }
    return new Date();
  });
  // const [selectedRoomId, setSelectedRoomId] = useState<number | undefined>(undefined);

  // Formateamos la fecha seleccionada para la consulta
  const formattedSelectedDate = formatDateForAPI(selectedDate);

  // Guardar la fecha seleccionada en localStorage para persistencia
  useEffect(() => {
    localStorage.setItem('selectedBookingDate', formattedSelectedDate);
  }, [selectedDate, formattedSelectedDate]);

  // Todos los usuarios verán la misma vista

    //Consulta para obtener las sedes
    const { data: locations = [], isLoading: isLoadingLocaitons } = useQuery<Location[]>({
        queryKey: ['/api/locations'],
        queryFn: async () => {
            const res = await fetch(`/api/locations`);
            if (!res.ok) throw new Error('Failed to fetch locations');
            return await res.json();
        },
        enabled: !!user,
        staleTime: 0,
        refetchOnWindowFocus: true,
        refetchOnMount: 'always',
    });

  // Consulta para obtener las reservas
  const { data: bookings = [], isLoading: isLoadingBookings, refetch: refetchBookings } = useQuery<Booking[]>({
    queryKey: ['/api/bookings', { date: formatDateForAPI(selectedDate) }],
    queryFn: async () => {
      const formattedDate = formatDateForAPI(selectedDate);
      console.log("Consultando reservas para fecha:", formattedDate);
      const res = await fetch(`/api/bookings?date=${formattedDate}`);
      if (!res.ok) throw new Error('Failed to fetch bookings');
      const data = await res.json();
      console.log("Reservas cargadas:", data);
      return data;
    },
    enabled: !!user,
    // Desactivar el guardado en caché para siempre obtener datos frescos
    staleTime: 0, 
    // Refrescar automáticamente cuando regrese a la pantalla
    refetchOnWindowFocus: true,
    // Refrescar si los datos son obsoletos
    refetchOnMount: 'always',
  });

  // Consulta para obtener todos los consultorios
  const { data: rooms, isLoading: isLoadingRooms } = useQuery<Room[]>({
    queryKey: ['/api/rooms'],
    enabled: !!user,
  });

  // Consulta para obtener usuarios (para mostrar nombre del psicólogo)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users/public'],
    enabled: !!user,
  });

  // Lista de reservas no-órfanas (userId y roomId válidos)
  const nonOrphanBookings = React.useMemo(() => {
    if (!rooms || !Array.isArray(rooms) || !Array.isArray(users)) return bookings;
    const roomIds = new Set(rooms.map(r => r.id));
    const userIds = new Set(users.map(u => u.id));
    return bookings.filter(b => roomIds.has(b.roomId) && userIds.has(b.userId));
  }, [bookings, rooms, users]);

  const getUserDisplayName = (userId: number) => {
    const u = users.find(u => u.id === userId);
    if (!u) return `Usuario #${userId}`;
    if (u.professionalType === 'psychologist') return `Psc. ${u.fullName}`;
    return u.fullName;
  };

  // Función para forzar un refresco completo de los datos
  const forceFullRefresh = useCallback(() => {
    // Resetear y vaciar completamente el caché para las consultas de reservas
    queryClient.resetQueries({ queryKey: ['/api/bookings'] });
    // Esperar un momento y luego refrescar
    setTimeout(() => {
      refetchBookings();
      console.log("Forzando refresco completo de reservas...");
    }, 300);
  }, [refetchBookings]);

  // Efecto para refrescar las reservas cuando se regresa de crear una nueva reserva
  useEffect(() => {
    // Si hay un parámetro bookingCreated, significa que acabamos de crear una reserva
    if (bookingCreated === 'true') {
      console.log("Reserva creada, actualizando calendario...");

      // Recuperar la fecha guardada en localStorage si existe
      const savedDate = localStorage.getItem('selectedBookingDate');
      console.log("Fecha recuperada de localStorage:", savedDate);

      if (savedDate) {
        // Actualizar la fecha seleccionada
        const newDate = new Date(savedDate);
        setSelectedDate(newDate);

        // Forzar refresco inmediato de manera más agresiva
        forceFullRefresh();

        // Actualizar la URL con la fecha seleccionada
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, `${cleanUrl}?date=${savedDate}`);

 
      } else {
        // Si no hay fecha guardada, simplemente actualizar las reservas actuales
        forceFullRefresh();

        // Limpiar el parámetro de la URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, [bookingCreated, forceFullRefresh]);

  // Configurar un listener para detectar cuando se regresa de la página de creación
  useEffect(() => {
    // Función para manejar eventos de almacenamiento local (comunicación entre páginas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'bookingUpdated' && e.newValue) {
        console.log("Detectada actualización de reserva desde otra página");
        queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
        refetchBookings();
        // Limpiar el valor después de procesarlo
        localStorage.removeItem('bookingUpdated');
      }
    };

    // Registrar el escuchador de eventos
    window.addEventListener('storage', handleStorageChange);

    // Verificar si hay una actualización pendiente en localStorage
    const pendingUpdate = localStorage.getItem('bookingUpdated');
    if (pendingUpdate) {
      console.log("Encontrada actualización pendiente al montar");
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      refetchBookings();
      localStorage.removeItem('bookingUpdated');
    }

    // Limpiar el escuchador cuando el componente se desmonte
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refetchBookings]);


  // Obtener las reservas para la fecha seleccionada

  // Filtrar los consultorios según la ubicación seleccionada
    const filteredRooms = rooms?.filter(room => {
        if (selectedLocation === "all") return true;
        const locationId = Number(selectedLocation);
        return room.locationId === locationId;
    });

  // Obtener las reservas para la fecha seleccionada
  const getBookingsForDate = (date: Date): Booking[] => {
    const target = formatDateForAPI(date);
    return nonOrphanBookings.filter((b: Booking) => b.date === target);
  };

  // Obtener las reservas para el día seleccionado
  const todayBookings = getBookingsForDate(selectedDate);

  // Helpers para horas (las reservas son por horas exactas)
    //Parse de "HH:MM" a entero HH. Osea, solo obtiene la pura hora sin los minutos, y lo retorna como entero.
  const parseHour = (t: string) => parseInt(t.split(':')[0] || '0', 10);
  //Obitnene la cantidad de horas que dura una reserva.
  const bookingHourSpan = (b: Booking) => Math.max(1, parseHour(b.endTime) - parseHour(b.startTime));

  // Determinar si hay una reserva para un consultorio en una hora específica
    // Cabe aclarar que find() asume que no hay translapes entre reservas.
  const getBookingForRoomAtTime = (roomId: number, time: string) => {
    const slotHour = parseHour(time);
    return todayBookings.find(booking =>
      booking.roomId === roomId &&
      booking.status !== 'cancelled' &&
        //Con paserHour, conviertoe las horas "HH:MM" a enteros HH y asi se hace la comparacion con enteros
      parseHour(booking.startTime) <= slotHour &&
      parseHour(booking.endTime) > slotHour
    );
  };

  // Detectar si una reserva inicia exactamente en esta hora
    // Una vez mas, find() asume que no hay translapes entre reservas.
  const getBookingStartingAt = (roomId: number, time: string) => {
    const slotHour = parseHour(time);
    return todayBookings.find(booking =>
      booking.roomId === roomId &&
      booking.status !== 'cancelled' &&
      parseHour(booking.startTime) === slotHour
    );
  };

  // Función para cambiar el día seleccionado
  const handleDateChange = async (date: Date) => {
    setSelectedDate(date);

    // Actualizar la URL con la fecha seleccionada sin recargar la página
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('date', formatDateForAPI(date));
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, '', newUrl);

    await refetchBookings();
  };

  if (isLoadingBookings || isLoadingRooms || isLoadingLocaitons) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Calendario de Reservas</h1>
          <p className="text-gray-600 mt-1">
            Visualiza la disponibilidad y realiza tus reservas
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            className="gap-2"
            onClick={() => navigate('/my-bookings')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Mis Reservas
          </Button>
          <Button 
            className="gap-2"
            onClick={() => {
              // Asegurarse de que la fecha se mantenga correctamente
              const formattedDate = formatDateForAPI(selectedDate);
              console.log("Navegando a nueva reserva con fecha:", formattedDate);
              navigate(`/new-booking?date=${formattedDate}`);
            }}
          >
            <Plus className="h-4 w-4" />
            Nueva Reserva
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div>
            <CardTitle>Disponibilidad de Cubículos</CardTitle>
            <CardDescription>
              Visualiza y reserva los cubículos disponibles para cada ubicación
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={async () => {
                        const prevWeek = new Date(selectedDate);
                        prevWeek.setDate(prevWeek.getDate() - 7);
                        handleDateChange(prevWeek);
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
                          onSelect={async (date) => {
                            if (date) {
                              document.getElementById('date-picker-popover')?.classList.add('hidden');
                              handleDateChange(date);
                            }
                          }}
                          className="bg-white rounded-md border shadow-md p-3"
                        />
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={async () => {
                        const nextWeek = new Date(selectedDate);
                        nextWeek.setDate(nextWeek.getDate() + 7);
                        handleDateChange(nextWeek);
                      }}
                      title="Semana siguiente"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden bg-background mb-4">
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
                          onClick={() => handleDateChange(new Date(currentDay))}
                        >
                          <span className="text-xs font-medium">{dayNames[i]}</span>
                          <span className="text-xl font-bold">{currentDay.getDate()}</span>
                          <span className="text-xs text-muted-foreground">{months[currentDay.getMonth()]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Tabs 
                  defaultValue="all" 
                  onValueChange={setSelectedLocation}
                  value={selectedLocation}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all">Todos</TabsTrigger>
                      {
                          locations.map((location) => (
                                <TabsTrigger key={location.id} value={location.id.toString()}>
                                    {location.name}
                                </TabsTrigger>
                          ))
                      }
                      {/*
                    <TabsTrigger value="Vistahermosa">Vistahermosa</TabsTrigger>
                    <TabsTrigger value="Santa Monica">Santa Monica</TabsTrigger>
                    Que hueva dan los comentarios en jsx*/}
                  </TabsList>
                </Tabs>
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
                      const ongoingBooking = getBookingForRoomAtTime(room.id, hour);
                      const startingBooking = getBookingStartingAt(room.id, hour);

                        // Si hay una reserva en curso que no inicia aquí, omitimos la celda
                        if (ongoingBooking && !startingBooking) {
                            return null;
                        }

                        // Si la reserva inicia aquí, usamos rowSpan para abarcar varias filas
                        if (startingBooking) {
                            const booking = startingBooking
                            const span = bookingHourSpan(startingBooking);
                            return (
                                <td
                                    key={`${room.id}-${hour}`}
                                    rowSpan={span}
                                    className="p-1 border"
                                >
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            // Si la reserva es del usuario actual, navegar a sus reservas
                                            // Sino, no hacer nada o mostrar un mensaje
                                            if (booking.userId === user?.id) {
                                                //En teo
                                                navigate(`/my-bookings?id=${booking.id}`);
                                            } else if (user?.role === 'admin') {
                                                // Los administradores deberian poder ver detalles de cualquier reserva al dar click.
                                                // Pero toavia no hay una panel para eso.
                                            }
                                        }}
                                        className="w-full h-20  px-2 py-2 rounded-md flex items-center justify-center"
                                    >
                                        {getUserDisplayName(booking.userId)}
                                    </Button>
                                </td>
                            );
                        }

                        // Slot disponible
                        return (
                            <td
                                key={`${room.id}-${hour}`}
                                className="p-1 border relative h-12"
                            >
                                <div className="h-full flex items-center justify-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground h-full w-full flex flex-col items-center justify-center hover:bg-transparent hover:text-muted-foreground"
                                        onClick={() => {
                                            // Calcular hora de finalización (asumiendo bloques de 1 hora según OPERATING_HOURS)
                                            const horaInicio = hour; // ej. "11:00"

                                            // Calcular hora de finalización (1 hora después)
                                            const [hora, minuto] = horaInicio.split(':').map(Number);
                                            const horaFin = hora + 1;
                                            const horaFinalizacion = `${horaFin}:${minuto.toString().padStart(2, '0')}`;

                                            // Guardar la fecha actual en localStorage antes de navegar
                                            const dateToUse = formatDateForAPI(selectedDate);
                                            localStorage.setItem('selectedBookingDate', dateToUse);
                                            console.log("Creando reserva en fecha:", dateToUse);

                                            // Redireccionar a la página de nueva reserva con el consultorio, fecha y rango de hora preseleccionados
                                            navigate(`/new-booking?roomId=${room.id}&date=${dateToUse}&startTime=${horaInicio}&endTime=${horaFinalizacion}&returnToCalendar=true`);
                                        }}
                                    >
                                        <Plus className="h-3 w-3" />
                                        <span className="text-xs mt-1">Disponible</span>
                                    </Button>
                                </div>
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
    </div>
  );
}