import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { formatDateForAPI } from "@/lib/utils/date-utils";

// Esquema para validación del formulario
const bookingFormSchema = z.object({
  roomId: z.string().min(1, { message: "Selecciona un consultorio" }),
  userId: z.string().min(1, { message: "Selecciona un usuario" }),
  date: z.date({
    required_error: "Selecciona la fecha de la reserva",
  }).refine(
    (date) => {
      // No permitir fechas en el pasado
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    },
    { message: "No se pueden hacer reservas en fechas pasadas" }
  ),
  startTime: z.string().min(1, { message: "Selecciona la hora de inicio" }),
  endTime: z.string().min(1, { message: "Selecciona la hora de finalización" }),
  notes: z.string().optional(),
}).refine(
  (data) => {
    // Verifica si ambos campos tienen datos para hacer la comparación
    if (!data.startTime || !data.endTime) return true;

    // Extrae las horas para comparar
    const startHour = parseInt(data.startTime.split(":")[0]);
    const endHour = parseInt(data.endTime.split(":")[0]);

    // La hora final debe ser mayor que la inicial
    return endHour > startHour;
  },
  {
    message: "La hora de finalización debe ser posterior a la hora de inicio",
    path: ["endTime"], // mostrar el error en el campo de hora final
  }
);

type BookingFormValues = z.infer<typeof bookingFormSchema>;

type BookingFormProps = {
  onSubmit: (data: {
    roomId: number;
    userId: number;
    date: string;
    startTime: string;
    endTime: string;
    notes?: string;
    status: string;
  }) => Promise<void> | void;
  defaultValues?: Partial<BookingFormValues>;
  isSubmitting?: boolean;
};

interface Room {
  id: number;
  name?: string;
  [key: string]: unknown;
}

interface User {
  id: number;
  name?: string;
  [key: string]: unknown;
}

export function BookingForm({ onSubmit, defaultValues }: BookingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      roomId: defaultValues?.roomId ?? "",
      userId: defaultValues?.userId ?? "",
      date: defaultValues?.date ? new Date(defaultValues.date) : new Date(),
      startTime: defaultValues?.startTime ?? "",
      endTime: defaultValues?.endTime ?? "",
      notes: defaultValues?.notes ?? "",
    },
  });

  useEffect(() => {
    const roomIdValue = form.watch("roomId");
    if (rooms.length && roomIdValue) {
      const roomId = parseInt(roomIdValue, 10);
      const room = rooms.find((r) => r.id === roomId) ?? null;
    }
  }, [rooms, form.watch("roomId")]);

  const handleFormSubmit = async (values: BookingFormValues) => {
    try {
      setIsSubmitting(true);

      const fecha = new Date(values.date);
      fecha.setHours(12, 0, 0, 0);

      const formattedDate = formatDateForAPI(fecha);

      const bookingData = {
        roomId: parseInt(values.roomId, 10),
        userId: parseInt(values.userId, 10),
        date: formattedDate,
        startTime: values.startTime,
        endTime: values.endTime,
        notes: values.notes || "",
        status: "confirmed" as const,
      };

      await onSubmit(bookingData);
    } catch (error) {
      console.error("Error al crear la reserva:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mostrar cargando mientras se obtienen los datos
  if (isLoadingRooms || isLoadingUsers) {
    return <div>Cargando...</div>;
  }

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Campos del formulario */}
      {/* ... Resto del formulario no se modifica ... */}
    </form>
  );
}