import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Room } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { CalendarCheck } from "lucide-react";
import { handleBookingError, createBookingSafe } from "@/lib/bookingErrors";

interface BookingConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  room: Room;
  date: string;
  startTime: string;
  endTime: string;
  userId: number;
}

export default function BookingConfirmationModal({
  open,
  onClose,
  room,
  date,
  startTime,
  endTime,
  userId
}: BookingConfirmationModalProps) {
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d 'de' MMMM, yyyy", { locale: es });
  };

  const formatPrice = (price: number) => {
    return `$${(price / 100).toFixed(2)}`;
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const bookingData = {
        roomId: room.id,
        userId,
        date,
        startTime,
        endTime,
        notes: notes.trim() || undefined,
        status: "confirmed"
      };

      const created = await createBookingSafe(bookingData, (opts) => toast(opts));
      if (!created) { setIsLoading(false); return; }
      toast({
        title: "¡Reserva confirmada!",
        description: "Tu reserva ha sido confirmada exitosamente.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      onClose();
      setLocation("/my-bookings");
    } catch (error: any) {
      handleBookingError(error, (opts) => toast(opts));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="text-center mb-4">
            <div className="mx-auto w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
              <CalendarCheck className="text-primary h-8 w-8" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-800">Confirmar Reserva</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 mb-6">
          <div className="flex justify-between pb-3 border-b border-gray-100">
            <span className="text-gray-600">Consultorio</span>
            <span className="font-medium text-gray-800">{room.name}</span>
          </div>
          <div className="flex justify-between pb-3 border-b border-gray-100">
            <span className="text-gray-600">Fecha</span>
            <span className="font-medium text-gray-800">{formatDate(date)}</span>
          </div>
          <div className="flex justify-between pb-3 border-b border-gray-100">
            <span className="text-gray-600">Hora</span>
            <span className="font-medium text-gray-800">{startTime} - {endTime}</span>
          </div>
          <div className="flex justify-between pb-3 border-b border-gray-100">
            <span className="text-gray-600">Duración</span>
            <span className="font-medium text-gray-800">1 hora</span>
          </div>
          <div className="flex justify-between pb-3 border-b border-gray-100">
            <span className="text-gray-600">Costo</span>
            <span className="font-medium text-gray-800">{formatPrice(room.price)}</span>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notas para la reserva (opcional)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Agregar información adicional..."
            rows={2}
          />
        </div>
        
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Procesando..." : "Confirmar y Pagar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
