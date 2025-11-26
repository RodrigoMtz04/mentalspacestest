import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Room, User, Booking } from "@shared/schema";
import { formatDateForAPI } from "@/lib/utils/date-utils";
import { createBookingSafe } from "@/lib/bookingErrors";

// Componentes UI
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";

// Horas de operación (8am a 8pm)
const OPERATING_HOURS = [
  "8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", 
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
];

export default function NewBookingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Obtener parámetros de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const roomIdParam = urlParams.get('roomId');
  const dateParam = urlParams.get('date');
  const startTimeParam = urlParams.get('startTime');
  const endTimeParam = urlParams.get('endTime');
  // Estado local
  const [roomId, setRoomId] = useState<string>(roomIdParam || "");
  const [userId, setUserId] = useState<string>(user?.id ? String(user.id) : "");
  const [date, setDate] = useState<Date>(() => {
    if (dateParam) {
      try {
        // Parse the date parameter correctly
        const [year, month, day] = dateParam.split('-').map(Number);
        const parsedDate = new Date(year, month - 1, day, 12, 0, 0, 0);
        return parsedDate;
      } catch (e) {
        console.error("Error parsing date parameter:", e);
        return new Date();
      }
    } else {
    return new Date();
    }
  });
  const [startTime, setStartTime] = useState<string>(startTimeParam || "");
  const [endTime, setEndTime] = useState<string>(endTimeParam || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Asegurarse de que el userId esté actualizado cuando el usuario se carga
  useEffect(() => {
    if (user && !user.role) {
      setUserId(String(user.id));
    }
  }, [user]);

  // Redireccionar si no hay usuario autenticado
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  // Consultas
  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery<Room[]>({
    queryKey: ['/api/rooms'],
    enabled: !!user,
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!user && user.role === 'admin',
  });

  // Mutación para crear reserva
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      console.log("Enviando datos a API:", bookingData);
      const created = await createBookingSafe(bookingData, (opts) => toast(opts));
      return created; // puede ser null
    },
    onSuccess: async (newBooking: Booking | null) => {
      if (!newBooking) {
        setIsSubmitting(false);
        return;
      }

      console.log("Reserva creada con éxito:", newBooking);

      // Guardar información detallada de la reserva para la comunicación entre páginas
      const bookingInfo = {
        id: newBooking.id,
        roomId: newBooking.roomId,
        date: formatDateForAPI(date),
        startTime: newBooking.startTime,
        endTime: newBooking.endTime,
        timestamp: new Date().getTime()
      };

      // Guardar como JSON para transmitir todos los datos relevantes
      localStorage.setItem('lastCreatedBooking', JSON.stringify(bookingInfo));

      // Guardar timestamp para indicar actualización (compatible con código existente)
      localStorage.setItem('bookingUpdated', new Date().toISOString());

      // Invalidar TODAS las consultas relacionadas a bookings de manera más agresiva
      await queryClient.invalidateQueries({ 
        predicate: (query) => String(query.queryKey[0]).includes('booking') 
      });

      // Invalidar consultas específicas para asegurar actualización
      await queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/users'] });

      // Invalidar específicamente las reservas del usuario
      if (user) {
        await queryClient.invalidateQueries({ 
          queryKey: [`/api/users/${user.id}/bookings`] 
        });
      }

      toast({
        title: "Reserva creada",
        description: "La reserva ha sido creada exitosamente",
      });

      setIsSubmitting(false);

      // Guardar la fecha seleccionada antes de redirigir
      const formattedDate = formatDateForAPI(date);
      localStorage.setItem('selectedBookingDate', formattedDate);
      console.log("Guardando fecha en localStorage:", formattedDate);

      // Redireccionar al calendario con la fecha y parámetro de éxito
      // Incluir el ID de la sala para mejorar la actualización específica
      navigate(`/bookings?date=${formattedDate}&bookingCreated=true&roomId=${newBooking.roomId}`);
    },
    onError: (error: Error) => {
      console.error("Error al crear la reserva:", error);
      const docMsgPrefix = '403: Debes cargar documentos de identificación';
      if (error.message.startsWith(docMsgPrefix)) {
        toast({
          title: 'Documentación requerida',
          description: 'Debes cargar al menos un documento (INE/Pasaporte o Título) antes de poder reservar.',
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
      setIsSubmitting(false);
    },
  });

  // Manejar envío del formulario
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    console.log("Formulario enviado con valores:", { roomId, userId, date, startTime, endTime });

    if (!roomId || !userId || !date || !startTime || !endTime) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const bookingData = {
      roomId: parseInt(roomId),
      userId: parseInt(userId),
      date: formatDateForAPI(date),
      startTime,
      endTime,
      notes: "",
      status: "confirmed",
    };

    await createBookingMutation.mutateAsync(bookingData);
  };

  // Filtrar terapeutas (no mostrar admin)
  const therapists = users.filter(u => u.role !== "admin");

  // Verificar si hay carga
  const isLoading = isLoadingRooms || isLoadingUsers || !user;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-8">
        <Button 
          variant="ghost" 
          className="mr-2" 
          onClick={() => navigate("/bookings")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold">Nueva Reserva</h1>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Detalles de la Reserva</CardTitle>
          <CardDescription>
            Complete los siguientes campos para agendar su reserva.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="bookingForm" onSubmit={handleSubmit} className="space-y-6">
            {/* Consultorio */}
            <div className="space-y-2">
              <Label htmlFor="room">Consultorio</Label>
              <Select
                value={roomId}
                onValueChange={setRoomId}
                disabled={isSubmitting}
              >
                <SelectTrigger id="room">
                  <SelectValue placeholder="Seleccionar consultorio" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={String(room.id)}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Usuario (solo para admin) */}
            {user.role === "admin" && (
              <div className="space-y-2">
                <Label htmlFor="user">Terapeuta</Label>
                <Select
                  value={userId}
                  onValueChange={setUserId}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="user">
                    <SelectValue placeholder="Seleccionar terapeuta" />
                  </SelectTrigger>
                  <SelectContent>
                    {therapists.map((therapist) => (
                      <SelectItem key={therapist.id} value={String(therapist.id)}>
                        {therapist.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Fecha */}
            <div className="space-y-2">
              <Label>Fecha de la reserva</Label>
              <div className="border rounded-md p-2">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    if (newDate) {
                      setDate(newDate);

                      // Mantener los parámetros al cambiar de fecha
                      const newDateStr = formatDateForAPI(newDate);
                      const params = new URLSearchParams();

                      if (roomId) params.set('roomId', roomId);
                      params.set('date', newDateStr);
                      if (startTime) params.set('startTime', startTime);
                      if (endTime) params.set('endTime', endTime);

                      // Actualizar URL sin recargar la página
                      window.history.replaceState(
                        {}, 
                        '', 
                        `${window.location.pathname}?${params.toString()}`
                      );
                    }
                  }}
                  disabled={isSubmitting}
                  className="mx-auto"
                />
              </div>
            </div>

            {/* Hora inicio */}
            <div className="space-y-2">
              <Label htmlFor="startTime">Hora de inicio</Label>
              <Select
                value={startTime}
                onValueChange={(value) => {
                  setStartTime(value);

                  // Actualizar hora fin automáticamente (1 hora después)
                  const startIndex = OPERATING_HOURS.indexOf(value);
                  if (startIndex >= 0 && startIndex < OPERATING_HOURS.length - 1) {
                    const newEndTime = OPERATING_HOURS[startIndex + 1];
                    setEndTime(newEndTime);

                    // Actualizar URL con los nuevos parámetros
                    const params = new URLSearchParams(window.location.search);
                    params.set('startTime', value);
                    params.set('endTime', newEndTime);
                    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
                  }
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger id="startTime">
                  <SelectValue placeholder="Seleccionar hora de inicio" />
                </SelectTrigger>
                <SelectContent>
                  {OPERATING_HOURS.slice(0, -1).map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hora fin */}
            <div className="space-y-2">
              <Label htmlFor="endTime">Hora de finalización</Label>
              <Select
                value={endTime}
                onValueChange={(value) => {
                  setEndTime(value);

                  // Actualizar URL con el nuevo parámetro
                  const params = new URLSearchParams(window.location.search);
                  params.set('endTime', value);
                  window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
                }}
                disabled={isSubmitting || !startTime}
              >
                <SelectTrigger id="endTime">
                  <SelectValue placeholder="Seleccionar hora de finalización" />
                </SelectTrigger>
                <SelectContent>
                  {OPERATING_HOURS
                    .filter((time) => {
                      // Solo mostrar horas posteriores a la de inicio
                      if (!startTime) return false;
                      const startIndex = OPERATING_HOURS.indexOf(startTime);
                      const currentIndex = OPERATING_HOURS.indexOf(time);
                      return currentIndex > startIndex;
                    })
                    .map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate("/bookings")}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            form="bookingForm"
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear Reserva
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}