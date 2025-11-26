import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Room } from "@shared/schema";

interface RoomDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookNow: () => void;
  roomId?: number;
}

export default function RoomDetailsModal({ isOpen, onClose, onBookNow, roomId }: RoomDetailsModalProps) {
  // Fetch room details
  const { data: room, isLoading } = useQuery<Room>({
    queryKey: ["/api/rooms", roomId],
    enabled: isOpen && roomId !== undefined,
    staleTime: 3600000, // 1 hour
  });

  if (isLoading || !room) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cargando detalles...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const amenities = room.features ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Detalles del Consultorio</DialogTitle>
          <DialogDescription>
            Información detallada sobre el consultorio y sus características
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <div className="w-full h-48 bg-neutral-200 rounded-md overflow-hidden">
            {room.imageUrl && (
              <img
                src={`${room.imageUrl}?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60`}
                alt={room.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          
          <h4 className="text-lg font-medium text-neutral-800 mt-4">{room.name}</h4>
          <p className="text-sm text-neutral-600 mt-2">{room.description}</p>
          
          <h5 className="text-md font-medium text-neutral-800 mt-4">Características:</h5>
          <ul className="mt-2 text-sm text-neutral-600 space-y-1">
            {amenities.map((amenity: string, index: number) => (
              <li key={index} className="flex items-center">
                <Check className="h-5 w-5 mr-2 text-secondary-500" />
                {amenity}
              </li>
            ))}
          </ul>
          
          <h5 className="text-md font-medium text-neutral-800 mt-4">Disponibilidad:</h5>
          <div className="mt-2 text-sm text-neutral-600">
            <p>Horario: Lunes a Viernes, 9:00 AM - 8:00 PM</p>
            <p>Disponible según calendario</p>
          </div>
          
          <div className="mt-4 bg-neutral-50 p-3 rounded-md">
            <p className="text-sm font-medium text-neutral-700">Precio:</p>
            <p className="text-xl font-semibold text-primary-600">${room.price} MXN / hora</p>
            <p className="text-xs text-neutral-500 mt-1">Incluye: Acceso a sala de espera, cafetería y WiFi</p>
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={onBookNow}>
            Reservar Ahora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
