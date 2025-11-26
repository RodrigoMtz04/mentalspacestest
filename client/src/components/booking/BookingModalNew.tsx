import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDateForAPI } from "@/lib/utils/date-utils";
import { Room, User, Booking } from "@shared/schema";
import { handleBookingError, createBookingSafe } from "@/lib/bookingErrors";

// Esquema para el formulario de reserva
const bookingFormSchema = z.object({
  roomId: z.string().min(1, { message: "Selecciona un consultorio" }),
  userId: z.string().min(1, { message: "Selecciona un terapeuta" }),
  date: z.date({
    required_error: "Selecciona la fecha de la reserva",
  }),
  startTime: z.string().min(1, { message: "Selecciona la hora de inicio" }),
  endTime: z.string().min(1, { message: "Selecciona la hora de finalización" }),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

// Horas de operación (de 8:00 AM a 8:00 PM)
const OPERATING_HOURS = [
  "8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", 
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
];

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  selectedRoomId?: number;
  onSuccess?: () => void;
}

export default function BookingModalNew({
  isOpen,
  onClose,
  selectedDate = new Date(),
  selectedRoomId,
  onSuccess
}: BookingModalProps) {
  console.log("BookingModalNew renderizado", { isOpen, selectedRoomId, selectedDate });
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Consulta para obtener todos los consultorios
  const { data: rooms, isLoading: isLoadingRooms } = useQuery<Room[]>({
    queryKey: ['/api/rooms'],
    enabled: isOpen,
  });

  // Consulta para obtener todos los terapeutas
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: isOpen,
  });

  // Formulario para crear reservas
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      roomId: selectedRoomId ? String(selectedRoomId) : "",
      userId: user?.role === 'admin' ? "" : String(user?.id || ""),
      date: selectedDate,
      startTime: "",
      endTime: "",
      notes: "",
    },
  });

  // Actualizar el formulario cuando cambian las props
  useEffect(() => {
    if (isOpen) {
      console.log("Actualizando formulario con valores", { 
        roomId: selectedRoomId, 
        userId: user?.id,
        date: selectedDate 
      });
      form.reset({
        roomId: selectedRoomId ? String(selectedRoomId) : "",
        userId: user?.role === 'admin' ? "" : String(user?.id || ""),
        date: selectedDate,
        startTime: "",
        endTime: "",
        notes: "",
      });
    }
  }, [isOpen, selectedDate, selectedRoomId, form, user]);

  // Mutación para crear una reserva
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => createBookingSafe(bookingData, (opts) => toast(opts)),
    onSuccess: async (newBooking: Booking | null) => {
      if (!newBooking) { setIsSubmitting(false); return; }
      console.log("Reserva creada exitosamente:", newBooking);
      
      // Actualizar caché
      await queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      await queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/bookings`] });
      
      toast({
        title: "Reserva creada",
        description: "La reserva ha sido creada exitosamente",
      });
      
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: Error) => {
      handleBookingError(error, (opts) => toast(opts));
      setIsSubmitting(false);
    },
  });

  // Función para manejar el envío del formulario
  const onSubmit = async (values: BookingFormValues) => {
    console.log("Formulario enviado con valores:", values);
    setIsSubmitting(true);
    
    try {
      // Convertir los tipos de datos necesarios
      const bookingData = {
        roomId: parseInt(values.roomId),
        userId: parseInt(values.userId),
        date: formatDateForAPI(values.date),
        startTime: values.startTime,
        endTime: values.endTime,
        notes: values.notes || "",
        status: "confirmed",
      };
      
      await createBookingMutation.mutateAsync(bookingData);
    } catch (error) {
      console.error("Error en onSubmit:", error);
      setIsSubmitting(false);
    }
  };

  // Filtrar terapeutas (mostrar todos los usuarios que no sean admin)
  const therapists = users?.filter(u => u.role !== "admin") || [];

  // Verificar si se están cargando los datos
  const isLoading = isLoadingRooms || isLoadingUsers;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        console.log("Dialog onOpenChange:", open);
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva Reserva</DialogTitle>
          <DialogDescription>
            Complete los detalles para agendar una nueva reserva de consultorio.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Campo: Consultorio */}
              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consultorio</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar consultorio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rooms?.map((room) => (
                          <SelectItem key={room.id} value={String(room.id)}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo: Terapeuta (Solo visible para administradores) */}
              {user?.role === "admin" && (
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Terapeuta</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar terapeuta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {therapists.map((therapist) => (
                            <SelectItem key={therapist.id} value={String(therapist.id)}>
                              {therapist.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Campo: Fecha */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de la reserva</FormLabel>
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => date && field.onChange(date)}
                      disabled={isSubmitting}
                      className="rounded-md border"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo: Hora de inicio */}
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de inicio</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        
                        // Actualizar hora de fin automáticamente (una hora después)
                        const startIndex = OPERATING_HOURS.indexOf(value);
                        if (startIndex >= 0 && startIndex < OPERATING_HOURS.length - 1) {
                          form.setValue("endTime", OPERATING_HOURS[startIndex + 1]);
                        }
                      }}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar hora de inicio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OPERATING_HOURS.slice(0, -1).map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo: Hora de finalización */}
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de finalización</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting || !form.getValues("startTime")}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar hora de finalización" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OPERATING_HOURS
                          .filter((time) => {
                            // Solo mostrar horas posteriores a la hora de inicio
                            const startTime = form.getValues("startTime");
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
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
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}