import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Room, Booking } from "@shared/schema";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import BookingCalendar from "@/components/booking/BookingCalendar";
import BookingConfirmationModal from "@/components/booking/BookingConfirmationModal";
import BadgeList from "@/components/ui/badge-list";

export default function RoomDetailsPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/rooms/:id");
  const roomId = params?.id ? parseInt(params.id) : 0;
  
  const [showModal, setShowModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState<{ date: string; time: string } | null>(null);

  // Hardcoded user ID for demo (normally would come from authentication)
  const userId = 1;

  // Fetch room details
  const { data: room, isLoading: roomLoading } = useQuery<Room>({
    queryKey: [`/api/rooms/${roomId}`],
    queryFn: async () => {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (!res.ok) throw new Error('Failed to fetch room');
      return res.json();
    },
    enabled: !!roomId,
  });

  // Fetch all bookings for this room
  const { data: roomBookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: [`/api/bookings`, { roomId }],
    queryFn: async () => {
      const res = await fetch(`/api/bookings?roomId=${roomId}`);
      if (!res.ok) throw new Error('Failed to fetch bookings');
      return res.json();
    },
    enabled: !!roomId,
  });

  // Fetch user's bookings
  const { data: userBookings, isLoading: userBookingsLoading } = useQuery<Booking[]>({
    queryKey: [`/api/bookings`, { userId }],
    queryFn: async () => {
      const res = await fetch(`/api/bookings?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch user bookings');
      return res.json();
    },
  });

  const formatPrice = (price: number) => {
    return `$${(price / 100).toFixed(0)}`;
  };

  const handleSelectTimeSlot = (date: string, time: string) => {
    setSelectedTime({ date, time });
    setShowModal(true);
  };

  const handleGoBack = () => {
    setLocation("/");
  };

  if (roomLoading || bookingsLoading || userBookingsLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-medium text-foreground">Consultorio no encontrado</h2>
          <p className="text-muted-foreground mt-2">El consultorio que estás buscando no existe.</p>
          <Button className="mt-4" onClick={handleGoBack}>
            Volver a la lista de consultorios
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" onClick={handleGoBack} className="p-0 mb-4">
          <ChevronLeft className="h-5 w-5 mr-1" /> 
          Volver a la lista
        </Button>
        <h2 className="text-2xl font-bold text-foreground">{room.name}</h2>
        <p className="text-muted-foreground mt-1">{room.description}</p>
      </div>

      <Card className="mb-6 overflow-hidden">
        <div className="w-full h-64 md:h-96 bg-muted">
          <img src={room.imageUrl} className="w-full h-full object-cover" alt={room.name} />
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold mb-3">Acerca de este consultorio</h3>
              <p className="text-muted-foreground">{room.description}</p>

              <Separator className="my-4" />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Ubicación</h4>
                  <p className="text-muted-foreground">Sede #{room.locationId}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-foreground mb-2">Precio</h4>
                  <p className="text-muted-foreground">{formatPrice(room.price)} por hora</p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <h4 className="font-medium text-foreground mb-2">Características</h4>
                <BadgeList items={room.features || []} />
              </div>
            </div>
            
            <div>
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold mb-3">Reservar este consultorio</h3>
                  <p className="text-muted-foreground mb-4">Selecciona una fecha y hora en el calendario de abajo para realizar tu reserva.</p>
                  <Button className="w-full" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>
                    Ver disponibilidad
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      <BookingCalendar 
        room={room} 
        bookings={roomBookings || []} 
        userBookings={userBookings || []}
        onSelectTimeSlot={handleSelectTimeSlot}
      />
      
      {showModal && selectedTime && (
        <BookingConfirmationModal
          open={showModal}
          onClose={() => setShowModal(false)}
          room={room}
          date={selectedTime.date}
          startTime={selectedTime.time}
          endTime={`${parseInt(selectedTime.time) + 1}:00`}
          userId={userId}
        />
      )}
    </div>
  );
}
