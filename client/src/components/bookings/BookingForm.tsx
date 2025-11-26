import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addHours, parse, addDays } from "date-fns";
import { insertBookingSchema, Booking, Room } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
// import { Input } from "@/components/ui/input"; // no se usa
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { es } from "date-fns/locale";
import { CalendarIcon, CreditCard } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  // CardDescription,
  // CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { handleBookingError, createBookingSafe } from "@/lib/bookingErrors";

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00"
];

// Esquema de validación para el formulario
const bookingFormSchema = insertBookingSchema.pick({
  roomId: true,
  date: true,
  startTime: true,
  endTime: true,
  notes: true,
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface BookingFormProps {
  rooms: Room[];
  selectedRoomId?: number;
  selectedDate?: Date;
  onSuccess: (queryParam?: string) => void;
  onCancel: () => void;
}

export default function BookingForm({
  rooms,
  selectedRoomId,
  selectedDate = new Date(),
  onSuccess,
  onCancel,
}: BookingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(4);
  const [payNow, setPayNow] = useState(false);

  // Inicializar formulario con valores predeterminados
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      roomId: selectedRoomId,
      date: format(selectedDate, "yyyy-MM-dd"),
      startTime: "09:00",
      endTime: "10:00",
      notes: "",
    },
  });

  // Manejar envío del formulario
  const onSubmit = async (values: BookingFormValues) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para hacer una reserva",
        variant: "destructive",
      });
      return;
    }

    // Si es la primera vez que el usuario envía el formulario, mostrar opciones de pago
    if (!showPaymentOptions) {
      setShowPaymentOptions(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // Añadir el ID del usuario actual
      const bookingData = {
        ...values,
        userId: user.id,
        isRecurring: isRecurring,
        recurrenceWeeks: isRecurring ? recurrenceWeeks : 0,
        paymentOption: payNow ? 'pay_now' : 'pay_later'
      };

      if (isRecurring) {
        // Crear múltiples reservas para fechas futuras
        const baseDate = parse(values.date, "yyyy-MM-dd", new Date());
        const bookings = [];

        // Añadir la primera reserva (la fecha seleccionada)
        bookings.push(bookingData);

        // Crear reservas adicionales para las semanas siguientes
        for (let i = 1; i <= recurrenceWeeks; i++) {
          const nextDate = addDays(baseDate, i * 7);
          const nextBooking = {
            ...bookingData,
            date: format(nextDate, "yyyy-MM-dd")
          };
          bookings.push(nextBooking);
        }

        // Enviar todas las reservas a la API y guardar sus respuestas
        const createdBookings: any[] = [];
        for (const booking of bookings) {
          const created = await createBookingSafe(booking, (opts) => toast(opts));
          if (created) createdBookings.push(created); // sólo si se creó
        }

        // Invalidar todas las consultas relacionadas con reservas
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/bookings'] }),
          queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/bookings`] }),
          // También invalidar consultas específicas por fecha
          queryClient.invalidateQueries({ 
            queryKey: ['/api/bookings', { date: format(parse(form.getValues('date'), "yyyy-MM-dd", new Date()), "yyyy-MM-dd") }] 
          })
        ]);

        // Actualizar también directamente el caché para respuesta inmediata
        queryClient.setQueryData<Booking[]>(['/api/bookings'], (oldData = []) => {
          return [...oldData, ...createdBookings];
        });

        // Actualizar también el caché de las reservas del usuario
        if (user) {
          queryClient.setQueryData<Booking[]>([`/api/users/${user.id}/bookings`], (oldData = []) => {
            return [...oldData, ...createdBookings];
          });
        }

        toast({
          title: "Reservas recurrentes creadas",
          description: `Se han creado ${bookings.length} reservas exitosamente.`,
        });

        // Establecer el localStorage y llamar a onSuccess con el parámetro de query
        localStorage.setItem('bookingUpdated', 'true');
        onSuccess('?bookingCreated=true');
      } else {
        // Enviar datos a la API para una sola reserva y obtener la respuesta
        const response = await createBookingSafe(bookingData, (opts) => toast(opts));
        if (!response) { setIsSubmitting(false); return; }

        // Invalidar todas las consultas relacionadas con reservas
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/bookings'] }),
          queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/bookings`] }),
          // También invalidar consultas específicas por fecha
          queryClient.invalidateQueries({ 
            queryKey: ['/api/bookings', { date: form.getValues('date') }] 
          })
        ]);

        // Actualizar directamente el caché de React Query para respuesta inmediata
        queryClient.setQueryData<Booking[]>(['/api/bookings'], (oldData = []) => {
          return [...oldData, response];
        });

        // Actualizar también el caché de las reservas del usuario
        if (user) {
          queryClient.setQueryData<Booking[]>([`/api/users/${user.id}/bookings`], (oldData = []) => {
            return [...oldData, response];
          });
        }

        toast({
          title: "Reserva creada",
          description: "Tu reserva ha sido registrada exitosamente.",
        });

        // Establecer el localStorage y llamar a onSuccess con el parámetro de query
        localStorage.setItem('bookingUpdated', 'true');
        onSuccess('?bookingCreated=true');
      }

      // Si el usuario eligió pagar ahora, redirigir a la página de pagos
      if (payNow) {
        toast({
          title: "Redirigiendo a pagos",
          description: "Serás redirigido a la página de pagos para completar tu reserva.",
        });
        // Aquí podríamos redirigir a la pasarela de pagos
      }
    } catch (error: any) {
      console.error("Error al crear la reserva:", error);

      // Mostrar mensaje de error apropiado
      let errorMessage = "No se pudo crear la reserva. Inténtalo de nuevo.";

      // Capturar errores específicos basados en el código de estado
      if (error.message.includes("409")) {
        errorMessage = "El consultorio ya está reservado para este horario. Por favor, selecciona otro horario.";
      } else if (error.message.includes("400")) {
        try {
          // Intentar obtener el mensaje de error específico del backend
          const errorResponse = JSON.parse(error.message.split('body: ')[1]);
          if (errorResponse && errorResponse.message) {
            errorMessage = errorResponse.message;
          }
        } catch (e) {
          // Mantener el mensaje genérico si no podemos parsearlo
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Actualizar hora de fin cuando cambia la hora de inicio
  const updateEndTime = (startTime: string) => {
    // Parsear la hora de inicio y añadir una hora
    const startDate = parse(startTime, "HH:mm", new Date());
    const endDate = addHours(startDate, 1);
    const endTime = format(endDate, "HH:mm");

    form.setValue("endTime", endTime);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Selección de consultorio */}
        <FormField
          control={form.control}
          name="roomId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Consultorio</FormLabel>
              <Select
                disabled={selectedRoomId !== undefined}
                value={field.value?.toString()}
                onValueChange={(value) => field.onChange(parseInt(value))}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un consultorio" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id.toString()}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Selección de fecha */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={`pl-3 text-left font-normal ${
                        !field.value && "text-muted-foreground"
                      }`}
                    >
                      {field.value ? (
                        format(parse(field.value, "yyyy-MM-dd", new Date()), "PPP", { locale: es })
                      ) : (
                        <span>Selecciona una fecha</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={parse(field.value, "yyyy-MM-dd", new Date())}
                    onSelect={(date) => {
                      if (date) {
                        field.onChange(format(date, "yyyy-MM-dd"));
                      }
                    }}
                    disabled={(date) => {
                      // Deshabilitar fechas en el pasado
                      return date < new Date(new Date().setHours(0, 0, 0, 0));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Hora de inicio y fin */}
        <div className="grid grid-cols-2 gap-4">
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
                    updateEndTime(value);
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona hora" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {timeSlots.slice(0, -1).map((time) => (
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

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora de fin</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona hora" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {timeSlots.slice(1).map((time) => (
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
        </div>

        {/* Reglas de reserva */}
        <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
          <h3 className="text-sm font-medium mb-2 text-slate-800">Políticas de reserva:</h3>
          <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
            <li>Las reservas deben realizarse con al menos <strong>24 horas</strong> de anticipación</li>
            <li>Máximo <strong>3 reservas activas</strong> por usuario</li>
            <li>Duración máxima de <strong>2 horas</strong> por reserva</li>
            <li>Las cancelaciones deben hacerse con al menos <strong>12 horas</strong> de anticipación</li>
          </ul>
        </div>

        {/* Notas adicionales */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Añade cualquier información adicional sobre tu reserva"
                  className="resize-none h-24"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Opciones de pago y reserva recurrente */}
        {showPaymentOptions && (
          <div className="space-y-6 pt-4 border-t border-slate-200">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Opciones adicionales</h3>

              {/* Reserva recurrente */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Reserva recurrente</CardTitle>
                    <Switch 
                      checked={isRecurring}
                      onCheckedChange={setIsRecurring}
                    />
                  </div>
                </CardHeader>
                {isRecurring && (
                  <CardContent>
                    <div className="space-y-2">
                      <label className="text-sm text-slate-600">
                        Repetir cada semana durante:
                      </label>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full"
                          onClick={() => setRecurrenceWeeks(Math.max(1, recurrenceWeeks - 1))}
                        >
                          -
                        </Button>
                        <span className="font-medium w-10 text-center">{recurrenceWeeks}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full"
                          onClick={() => setRecurrenceWeeks(Math.min(12, recurrenceWeeks + 1))}
                        >
                          +
                        </Button>
                        <span className="text-sm text-slate-600 ml-2">semanas</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Se creará una reserva cada semana en el mismo horario durante {recurrenceWeeks} semanas.
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Opciones de pago */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Opciones de pago</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="pay-now"
                          checked={payNow}
                          onCheckedChange={(checked) => setPayNow(checked === true)}
                        />
                        <label
                          htmlFor="pay-now"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Pagar ahora con tarjeta
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="pay-later"
                          checked={!payNow}
                          onCheckedChange={(checked) => setPayNow(checked !== true)}
                        />
                        <label
                          htmlFor="pay-later"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Pagar en el consultorio
                        </label>
                      </div>
                    </div>

                    {payNow && (
                      <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                        <div className="flex items-center">
                          <CreditCard className="h-5 w-5 text-slate-500 mr-2" />
                          <p className="text-sm text-slate-600">
                            Al confirmar, serás redirigido a la pasarela de pagos segura.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Procesando..." : showPaymentOptions 
              ? (payNow ? "Pagar y Confirmar" : "Confirmar Reserva") 
              : "Continuar"
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}