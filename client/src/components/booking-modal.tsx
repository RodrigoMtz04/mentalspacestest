import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  selectedRoomId?: number;
}

export default function BookingModal({ isOpen, onClose, selectedDate = new Date(), selectedRoomId }: BookingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [date, setDate] = useState<Date | undefined>(selectedDate);
  const [roomId, setRoomId] = useState<string>(selectedRoomId?.toString() || "");
  const [startTime, setStartTime] = useState<string>("9:00");
  const [duration, setDuration] = useState<string>("1");
  const [therapistId, setTherapistId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setDate(selectedDate);
      setRoomId(selectedRoomId?.toString() || "");
      setStartTime("9:00");
      setDuration("1");
      setTherapistId("");
      setNotes("");
    }
  }, [isOpen, selectedDate, selectedRoomId]);
  
  // Fetch rooms for dropdown
  const { data: rooms = [], isLoading: roomsLoading } = useQuery<[]>({ //JC: Pequeño error que encontre, rooms nunca estuvo tipado como array, o algo así. Al parecer siempre estuvo aquí ese error.
    queryKey: ['/api/rooms'],
    enabled: isOpen,
    staleTime: 3600000, // 1 hour
  });

  // Fetch therapists for dropdown
  const { data: therapists = [], isLoading: therapistsLoading } = useQuery<[]>({ //JC: Mismo caso con therapists.
    queryKey: ['/api/users'],
    enabled: isOpen,
    staleTime: 3600000, // 1 hour
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const res = await apiRequest('POST', '/api/bookings', bookingData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({
        title: "Reserva confirmada",
        description: "La reserva ha sido confirmada exitosamente.",
        variant: "default",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error al crear reserva",
        description: error instanceof Error ? error.message : "Hubo un error al procesar la reserva. Intente nuevamente.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = () => {
    if (!date || !roomId || !startTime || !duration || !therapistId) {
      toast({
        title: "Formulario incompleto",
        description: "Por favor complete todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    // Create the booking data
    const bookingDate = new Date(date);
    const [hours, minutes] = startTime.split(':').map(Number);
    
    // Set start time
    bookingDate.setHours(hours, minutes, 0, 0);
    const startDateTime = new Date(bookingDate);
    
    // Calculate end time based on duration
    const durationHours = parseFloat(duration);
    const endDateTime = new Date(startDateTime);
    endDateTime.setTime(startDateTime.getTime() + (durationHours * 60 * 60 * 1000));

    const bookingData = {
      roomId: parseInt(roomId),
      userId: parseInt(therapistId),
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      notes: notes,
      status: "confirmed"
    };

    createBookingMutation.mutate(bookingData);
  };

  const isLoading = roomsLoading || therapistsLoading || createBookingMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nueva Reserva</DialogTitle>
          <DialogDescription>
            Completa el formulario para reservar un consultorio
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="room" className="text-right">
              Consultorio
            </Label>
            <Select
              value={roomId}
              onValueChange={setRoomId}
              disabled={isLoading}
            >
              <SelectTrigger id="room" className="col-span-3">
                <SelectValue placeholder="Seleccionar consultorio" />
              </SelectTrigger>
              <SelectContent>
                {rooms?.map((room: any) => (
                  <SelectItem key={room.id} value={room.id.toString()}>
                    {room.name} - {room.type.charAt(0).toUpperCase() + room.type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Fecha
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                  disabled={isLoading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  disabled={isLoading}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="time" className="text-right">
              Hora Inicio
            </Label>
            <Select
              value={startTime}
              onValueChange={setStartTime}
              disabled={isLoading}
            >
              <SelectTrigger id="time" className="col-span-3">
                <SelectValue placeholder="Seleccionar hora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9:00">9:00 AM</SelectItem>
                <SelectItem value="10:00">10:00 AM</SelectItem>
                <SelectItem value="11:00">11:00 AM</SelectItem>
                <SelectItem value="12:00">12:00 PM</SelectItem>
                <SelectItem value="13:00">1:00 PM</SelectItem>
                <SelectItem value="14:00">2:00 PM</SelectItem>
                <SelectItem value="15:00">3:00 PM</SelectItem>
                <SelectItem value="16:00">4:00 PM</SelectItem>
                <SelectItem value="17:00">5:00 PM</SelectItem>
                <SelectItem value="18:00">6:00 PM</SelectItem>
                <SelectItem value="19:00">7:00 PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">
              Duración
            </Label>
            <Select
              value={duration}
              onValueChange={setDuration}
              disabled={isLoading}
            >
              <SelectTrigger id="duration" className="col-span-3">
                <SelectValue placeholder="Seleccionar duración" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hora</SelectItem>
                <SelectItem value="1.5">1.5 horas</SelectItem>
                <SelectItem value="2">2 horas</SelectItem>
                <SelectItem value="2.5">2.5 horas</SelectItem>
                <SelectItem value="3">3 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="therapist" className="text-right">
              Terapeuta
            </Label>
            <Select
              value={therapistId}
              onValueChange={setTherapistId}
              disabled={isLoading}
            >
              <SelectTrigger id="therapist" className="col-span-3">
                <SelectValue placeholder="Seleccionar terapeuta" />
              </SelectTrigger>
              <SelectContent>
                {therapists?.filter((t: any) => t.role === "therapist").map((therapist: any) => (
                  <SelectItem key={therapist.id} value={therapist.id.toString()}>
                    {therapist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right align-self-start pt-2">
              Notas
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales sobre la reserva..."
              className="col-span-3"
              disabled={isLoading}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Confirmar Reserva"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
