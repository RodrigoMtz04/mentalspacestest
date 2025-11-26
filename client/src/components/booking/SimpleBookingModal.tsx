import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Booking, Room, User } from "@shared/schema";
import { formatDateForAPI } from "@/lib/utils/date-utils";
import { handleBookingError } from "@/lib/bookingErrors";

// Componentes de UI
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

// Horas de operación (de 8:00 AM a 8:00 PM)
const OPERATING_HOURS = [
  "8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", 
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
];

interface SimpleBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  selectedRoomId?: number;
  onSuccess?: () => void;
}

export default function SimpleBookingModal({
  isOpen,
  onClose,
  selectedDate = new Date(),
  selectedRoomId,
  onSuccess
}: SimpleBookingModalProps) {
  console.log("SimpleBookingModal renderizado", { isOpen, selectedRoomId, selectedDate });
  
  // Estado local
  const { user } = useAuth();
  const { toast } = useToast();
  const [roomId, setRoomId] = useState<string>(selectedRoomId ? String(selectedRoomId) : "");
  const [userId, setUserId] = useState<string>(user?.id ? String(user.id) : "");
  const [date, setDate] = useState<Date>(selectedDate);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Consultas
  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery<Room[]>({
    queryKey: ['/api/rooms'],
    enabled: isOpen,
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: isOpen && user?.role === 'admin',
  });

  // Actualizar valores cuando cambian las props
  useEffect(() => {
    if (isOpen) {
      setRoomId(selectedRoomId ? String(selectedRoomId) : "");
      setUserId(user?.role === 'admin' ? "" : String(user?.id || ""));
      setDate(selectedDate);
      setStartTime("");
      setEndTime("");
    }
  }, [isOpen, selectedRoomId, selectedDate, user]);

  // Mutación para crear la reserva
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      console.log("Enviando datos a API:", bookingData);
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(bookingData),
      });
      if (res.status === 403) {
        // Manejo suave para documentación requerida
        try {
          const data = await res.json();
          if (data?.documentationRequired) {
            toast({
              title: 'Documentación requerida',
              description: 'Debes cargar al menos un documento (INE/Pasaporte o Título) antes de poder reservar.',
            });
            return null; // señal para no disparar éxito de creación
          }
        } catch {}
        // Otros 403: lanzar error genérico
        throw new Error('No autorizado para crear reserva');
      }
      if (!res.ok) {
        let msg = 'Error al crear la reserva';
        try { const j = await res.json(); msg = j?.message || msg; } catch {}
        throw new Error(msg);
      }
      return await res.json();
    },
    onSuccess: async (newBooking: Booking | null) => {
      // Si fue retorno nulo por falta de documentación, sólo resetear estado y salir
      if (newBooking == null) {
        setIsSubmitting(false);
        return;
      }
      console.log("Reserva creada con éxito:", newBooking);
      await queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      await queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/bookings`] });
      toast({
        title: "Reserva creada",
        description: "La reserva ha sido creada exitosamente",
      });
      setIsSubmitting(false);
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: Error) => {
      console.error('Error creando reserva:', error);
      // Seguimos usando el manejador central para otros tipos de errores
      handleBookingError(error, (opts) => toast(opts));
      setIsSubmitting(false);
    },
  });

  // Manejar el envío del formulario
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
  const isLoading = isLoadingRooms || isLoadingUsers;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        console.log("Dialog onOpenChange:", open);
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva Reserva</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
            {user?.role === "admin" && (
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
                  onSelect={(newDate) => newDate && setDate(newDate)}
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
                    setEndTime(OPERATING_HOURS[startIndex + 1]);
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
                onValueChange={setEndTime}
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

            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Crear Reserva
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}