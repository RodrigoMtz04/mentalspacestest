import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import { Room, Booking } from "@shared/schema";
import RoomFilters from "@/components/rooms/RoomFilters";
import RoomCard from "@/components/room-card";
import RoomEditModal from "@/components/rooms/RoomEditModal";
import BookingModal from "@/components/booking/BookingModal";
import CalendarView from "@/components/ui/calendar-view";
import { calculateRoomAvailability } from "@/lib/utils/date-utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar, Home } from "lucide-react";

export default function RoomsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [filters, setFilters] = useState({
    date: today,
    duration: "1 hora",
    features: "Cualquiera",
    maxPrice: "200"
  });
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Obtener la información del usuario autenticado
  const { user } = useAuth();
  const userId = user?.id || 0;
  const isAdmin = user?.role === 'admin';

  // Fetch rooms
  const { data: rooms, isLoading: roomsLoading } = useQuery<Room[]>({
    queryKey: ['/api/rooms'],
    queryFn: async () => {
      const res = await fetch(`/api/rooms`);
      if (!res.ok) throw new Error('Failed to fetch rooms');
      return res.json();
},
  });

  // Fetch bookings for the selected date
  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ['/api/bookings', { date: selectedDate }],
    queryFn: async () => {
      const res = await fetch(`/api/bookings?date=${selectedDate}`);
      if (!res.ok) throw new Error('Failed to fetch bookings');
      return res.json();
    },
  });

  const handleFilterChange = (newFilters: {
    date: string;
    duration: string;
    features: string;
    maxPrice: string;
  }) => {
    setFilters(newFilters);
    setSelectedDate(newFilters.date);
  };

  // Filter rooms based on criteria
  const filteredRooms = rooms?.filter(room => {
    // Filter by price if specified
    if (filters.maxPrice !== "Cualquiera") {
      const maxPrice = parseInt(filters.maxPrice) * 100; // Convert to cents
      if (maxPrice < room.price) return false;
    }

    // Filter by features if specified
    if (filters.features !== "Cualquiera") {
      if (!room.features?.includes(filters.features)) return false;
    }

    return true;
  });

  const roomBookings = (roomId: number) => {
    return bookings?.filter(booking => booking.roomId === roomId) || [];
  };
  
  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setIsEditModalOpen(true);
  };
  
  const handleRoomUpdated = () => {
    // Invalidate and refetch rooms data
    queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
  };
  
  // Estado para manejar el modal de reservas
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<number | undefined>(undefined);
  
  const handleViewDetails = (roomId: number) => {
    // Mostrar detalles del consultorio en un modal o redirigir a la página de detalles
    window.location.href = `/rooms/${roomId}`;
  };
  
  const handleBookRoom = (roomId: number) => {
    console.log("Solicitando reserva para consultorio:", roomId);
    
    // Guardar el consultorio seleccionado
    setSelectedRoomForBooking(roomId);
    
    // Usar setTimeout para asegurar que el estado se actualice correctamente
    // antes de abrir el modal
    setTimeout(() => {
      console.log("Abriendo modal con consultorio ID:", roomId);
      setIsBookingModalOpen(true);
    }, 100);
  };
  
  const handleBookingSuccess = () => {
    // Cerrar el modal y refrescar los datos si es necesario
    setIsBookingModalOpen(false);
    setSelectedRoomForBooking(undefined);
    
    // Refrescar los datos de reservas para mostrar la nueva reserva
    // Invalidar todas las consultas relacionadas con reservas
    queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
    
    // Invalidar consultas específicas por fecha
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        return query.queryKey[0] === '/api/bookings' && 
          query.queryKey.length > 1 && 
          typeof query.queryKey[1] === 'object';
      }
    });
    
    // Mostrar mensaje de éxito y sugerir que vaya a la página de reservas
    toast({
      title: "Reserva creada",
      description: "Tu reserva ha sido creada exitosamente. Puedes verla en la página de reservas.",
      action: (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.location.href = '/bookings'}
        >
          Ver Reservas
        </Button>
      ),
    });
  };

  // Estado para manejar la vista (lista o calendario)
  // Por defecto mostramos la vista de lista primero
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Función para manejar la selección de fecha desde el calendario
  const handleDateSelect = (date: Date) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    setSelectedDate(formattedDate);
    setFilters(prev => ({ ...prev, date: formattedDate }));
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Centros de Consulta</h2>
          <p className="mt-1 text-muted-foreground">Selecciona un centro para ver la disponibilidad de sus cubículos</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => window.location.href = '/my-bookings'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Mis Reservas
          </Button>
          <Button 
            variant="default" 
            className="flex items-center gap-2"
            onClick={() => window.location.href = '/bookings'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Calendario
          </Button>
        </div>
      </div>

      {/* Filtros eliminados a petición del usuario */}

      {roomsLoading || bookingsLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Ubicación: Vistahermosa */}
          <div className="bg-card rounded-lg shadow-md overflow-hidden border border-border">
            <div className="h-48 bg-gradient-to-r from-primary-500 to-primary-600 relative">
              <img 
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c" 
                alt="Vistahermosa" 
                className="w-full h-full object-cover opacity-50"
              />
              <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                <h3 className="text-2xl font-bold">Vistahermosa</h3>
                <p className="mt-2">Centro Médico Alameda, Piso 3</p>
              </div>
            </div>
            <div className="p-6">
              <p className="text-muted-foreground mb-4">Nuestros consultorios en Vistahermosa cuentan con espacios diseñados para terapia individual y cubículos especiales para terapia infantil.</p>
              <div className="flex space-x-4 mt-4">
                <Button 
                  variant="default"
                  onClick={() => {
                    // Redirigir siempre a la misma vista de calendario
                      //TODO ESTO ESTA HORRIBLEMENTE HARDCODEADO
                    window.location.href = `/bookings?location=Vistahermosa`;
                  }}
                >
                  Ver disponibilidad
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    console.log("Botón Reservar Vistahermosa clickeado");
                    console.log("Consultorios disponibles:", rooms);
                    // Buscar el primer consultorio disponible de esta ubicación
                    const vhRoom = rooms?.find(room => room.features?.includes("guerrero"));
                    console.log("Consultorio seleccionado:", vhRoom);
                    
                    if (vhRoom) {
                      console.log("Abriendo modal para consultorio:", vhRoom.id);
                      // Establecer directamente el roomId y el estado del modal
                      setSelectedRoomForBooking(vhRoom.id);
                      setIsBookingModalOpen(true);
                    } else {
                      console.error("No se encontró ningún consultorio de Vistahermosa");
                    }
                  }}
                >
                  Reservar
                </Button>
              </div>
            </div>
          </div>
          
          {/* Ubicación: Santa Monica */}
          <div className="bg-card rounded-lg shadow-md overflow-hidden border border-border">
            <div className="h-48 bg-gradient-to-r from-secondary-500 to-secondary-600 relative">
              <img 
                src="https://images.unsplash.com/photo-1598928506311-c55ded91a20c" 
                alt="Santa Monica" 
                className="w-full h-full object-cover opacity-50"
              />
              <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                <h3 className="text-2xl font-bold">Santa Monica</h3>
                <p className="mt-2">Edificio Bienestar, Piso 1</p>
              </div>
            </div>
            <div className="p-6">
              <p className="text-muted-foreground mb-4">Nuestros espacios en Santa Monica ofrecen un ambiente tranquilo y profesional con cubículos individuales y un área especializada para niños.</p>
              <div className="flex space-x-4 mt-4">
                <Button 
                  variant="default"
                  onClick={() => {
                    // Redirigir siempre a la misma vista de calendario
                    window.location.href = `/bookings?location=Santa Monica`;
                  }}
                >
                  Ver disponibilidad
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    console.log("Botón Reservar Santa Monica clickeado");
                    console.log("Consultorios disponibles:", rooms);
                    // Buscar el primer consultorio disponible de esta ubicación
                    const smRoom = rooms?.find(room => room.features?.includes("Santa Monica"));
                    console.log("Consultorio seleccionado:", smRoom);
                    
                    if (smRoom) {
                      console.log("Abriendo modal para consultorio:", smRoom.id);
                      // Establecer directamente el roomId y el estado del modal
                      setSelectedRoomForBooking(smRoom.id);
                      setIsBookingModalOpen(true);
                    } else {
                      console.error("No se encontró ningún consultorio de Santa Monica");
                    }
                  }}
                >
                  Reservar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de edición */}
      {editingRoom && (
        <RoomEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          room={editingRoom}
          onRoomUpdated={handleRoomUpdated}
        />
      )}

      {/* Modal de reserva */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        selectedRoomId={selectedRoomForBooking}
        selectedDate={selectedDate ? new Date(selectedDate) : undefined}
        onSuccess={handleBookingSuccess}
      />
    </div>
  );
}