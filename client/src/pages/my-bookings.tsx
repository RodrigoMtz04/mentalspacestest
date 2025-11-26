import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Booking, Room, SystemConfig } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Clock, Calendar, X, Info, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function MyBookingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upcoming");
  
  // Obtener información del usuario autenticado
  const { user } = useAuth();
  const userId = user?.id || 0;

  // Verificar autenticación y mostrar mensaje si no hay usuario
  useEffect(() => {
    if (!user) {
      console.error("No hay usuario autenticado en MyBookingsPage");
    }
  }, [user]);

  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Función de consulta para obtener las reservas del usuario
  const fetchUserBookings = async () => {
    if (!userId) {
      console.error("Usuario no identificado, no podemos obtener reservas");
      return [];
    }
      
    console.log("Consultando reservas para:", user?.username || "usuario " + userId);
    try {
      const res = await fetch(`/api/users/${userId}/bookings`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
        
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error al cargar las reservas:", errorText);
        throw new Error(`Error al cargar las reservas: ${errorText}`);
      }
        
      const data = await res.json();
      console.log("Reservas de usuario cargadas:", data);
      return data;
    } catch (error) {
      console.error("Error en la consulta de reservas:", error);
      throw error;
    }
  };

  // Fetch user's bookings - utilizar la nueva ruta API específica para obtener las reservas del usuario
  const { 
    data: bookings, 
    isLoading: bookingsLoading, 
    refetch: refetchBookings,
    isRefetching
  } = useQuery<Booking[]>({
    queryKey: [`/api/users/${userId}/bookings`, lastUpdateTime.getTime()],
    queryFn: fetchUserBookings,
    enabled: !!userId, // Solo ejecutar cuando tengamos un userId válido
    staleTime: 0, // Considerar los datos obsoletos inmediatamente
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Refrescar cada 5 segundos automáticamente
    refetchOnMount: "always", // Siempre volver a cargar al montar
    refetchOnReconnect: true,
    retry: 3, // Intentar hasta 3 veces si falla
  });
  
  // Función para forzar la actualización de las reservas
  const forceRefresh = () => {
    setLastUpdateTime(new Date());
    refetchBookings();
  };
  
  // Actualizar las reservas al cargar la página
  useEffect(() => {
    if (userId) {
      forceRefresh();
    }
  }, [userId]);

  // Fetch all rooms (to get room details for each booking)
  const { data: rooms, isLoading: roomsLoading } = useQuery<Room[]>({
    queryKey: ['/api/rooms'],
  });
  
  // Fetch system configuration (for booking rules)
  const { data: configs, isLoading: configsLoading } = useQuery<SystemConfig[]>({
    queryKey: ['/api/config'],
  });

  const handleCancelBooking = async (bookingId: number) => {
    try {
      const response = await apiRequest("PATCH", `/api/bookings/${bookingId}/status`, { status: "cancelled" });
      
      if (response.ok) {
        // Usar la respuesta para actualizar la caché directamente
        await response.json();

        // Invalidar y refrescar todas las consultas relacionadas con reservas
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/bookings`] }),
          queryClient.invalidateQueries({ queryKey: ['/api/bookings'] })
        ]);
        
        // Recargar explícitamente después
        await refetchBookings();
        
        // Forzar un re-renderizado actualizando el componente
        setActiveTab(activeTab === "upcoming" ? "upcoming" : activeTab);
        
        toast({
          title: "Reserva cancelada",
          description: "Tu reserva ha sido cancelada exitosamente.",
          variant: "default",
        });
      }
    } catch (error: any) {
      // Intentar obtener un mensaje de error específico del backend
      let errorMessage = "Ocurrió un error al cancelar tu reserva.";
      
      if (error.message && error.message.includes('body:')) {
        try {
          const errorResponse = JSON.parse(error.message.split('body: ')[1]);
          if (errorResponse && errorResponse.message) {
            errorMessage = errorResponse.message;
          }
        } catch (e) {
          // Si no podemos parsear el mensaje, usamos el genérico
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error al cancelar la reserva",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Filter and sort bookings
  const getFilteredBookings = (): Booking[] => {
    if (!bookings) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return (bookings as Booking[])
      .filter((booking: Booking) => {
        const bookingDate = new Date(booking.date);
        bookingDate.setHours(0, 0, 0, 0);
        
        if (activeTab === "upcoming") {
          return booking.status === "confirmed" && bookingDate >= today;
        } else if (activeTab === "past") {
          return booking.status === "confirmed" && bookingDate < today;
        } else if (activeTab === "cancelled") {
          return booking.status === "cancelled";
        }
        return false;
      })
      .sort((a: Booking, b: Booking) => {
        // Sort by date (ascending for upcoming, descending for past and cancelled)
        const dateA = new Date(a.date + "T" + a.startTime);
        const dateB = new Date(b.date + "T" + b.startTime);
        
        return activeTab === "upcoming" 
          ? dateA.getTime() - dateB.getTime() 
          : dateB.getTime() - dateA.getTime();
      });
  };

  const getRoomById = (roomId: number) => {
    return rooms?.find(room => room.id === roomId);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "EEEE, d 'de' MMMM, yyyy", { locale: es });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes || '00'}`;
  };

  // Extraer valores de configuración
  const getConfigValue = (key: string, defaultValue: string) => {
    if (!configs) return defaultValue;
    const config = configs.find(c => c.key === key);
    return config ? config.value : defaultValue;
  };
  
  // Usar las nuevas claves de configuración
  const maxActiveBookings = getConfigValue('max_active_bookings', '8');
  const advanceBookingDays = getConfigValue('advance_booking_days', '0');
  const maxHoursDuration = getConfigValue('max_booking_duration_hours', '4');
  const minHoursBeforeCancel = getConfigValue('cancellation_hours_notice', '24');
  
  const filteredBookings = getFilteredBookings();
  const isLoading = bookingsLoading || roomsLoading || configsLoading;

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Mis Reservas</h2>
            <p className="text-muted-foreground mt-1">Gestiona tus reservas de consultorios</p>
          </div>
          <div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={forceRefresh}
              disabled={isRefetching}
              className="gap-2"
            >
              {isRefetching ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  <span>Actualizando...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"></path>
                  </svg>
                  <span>Actualizar</span>
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Información de políticas */}
        <div className="mt-4 p-3 border rounded-md bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900">
          <div className="flex items-center font-medium mb-2 text-amber-800 dark:text-amber-200">
            <AlertCircle className="h-5 w-5 mr-2" />
            Políticas de Reserva
          </div>
          <div className="space-y-2">
            <div className="flex items-start">
              <Info className="h-4 w-4 mr-2 mt-0.5 text-amber-700 dark:text-amber-300" />
              <p className="text-sm text-amber-700 dark:text-amber-100">
                Puedes tener hasta <strong>{maxActiveBookings} reservas</strong> activas simultáneamente.
              </p>
            </div>
            <div className="flex items-start">
              <Info className="h-4 w-4 mr-2 mt-0.5 text-amber-700 dark:text-amber-300" />
              <p className="text-sm text-amber-700 dark:text-amber-100">
                Las reservas pueden realizarse <strong>{parseInt(advanceBookingDays) === 0 ? 'sin anticipación requerida' : `con ${advanceBookingDays} días de anticipación`}</strong>.
              </p>
            </div>
            <div className="flex items-start">
              <Info className="h-4 w-4 mr-2 mt-0.5 text-amber-700 dark:text-amber-300" />
              <p className="text-sm text-amber-700 dark:text-amber-100">
                La duración máxima de una reserva es de <strong>{maxHoursDuration} horas</strong>.
              </p>
            </div>
            <div className="flex items-start">
              <Info className="h-4 w-4 mr-2 mt-0.5 text-amber-700 dark:text-amber-300" />
              <p className="text-sm text-amber-700 dark:text-amber-100">
                Las cancelaciones deben realizarse con al menos <strong>{minHoursBeforeCancel} horas</strong> de anticipación.
              </p>
            </div>
          </div>
        </div>
      </div>

        {/*Division de las citas proximas, pasadas y canceladas*/}
      <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="upcoming">Próximas</TabsTrigger>
          <TabsTrigger value="past">Pasadas</TabsTrigger>
          <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  {activeTab === "upcoming" ? (
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  ) : activeTab === "past" ? (
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  ) : (
                    <X className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No hay reservas</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {activeTab === "upcoming"
                    ? "No tienes próximas reservas. ¿Por qué no reservas un consultorio ahora?"
                    : activeTab === "past"
                    ? "No tienes reservas pasadas."
                    : "No tienes reservas canceladas."}
                </p>
                {activeTab === "upcoming" && (
                  <Button className="mt-4" onClick={() => window.location.href = "/"}>
                    Buscar Consultorios
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking: Booking) => {
                const room = getRoomById(booking.roomId);
                if (!room) return null;

                return (
                  <Card key={booking.id} className="overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-4">
                      <div className="h-32 md:h-auto bg-muted">
                        <img
                          src={room.imageUrl || "/placeholder-room.jpg"} 
                          className="w-full h-full object-cover md:h-full" 
                          alt={room.name}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/placeholder-room.jpg"; 
                            target.onerror = null;
                          }}
                        />
                      </div>
                      <div className="col-span-3 p-5">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-bold text-foreground">{room.name}</h3>
                            <div className="flex items-center text-muted-foreground mt-1">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span className="text-sm">{room.locationId}</span>
                            </div>
                          </div>
                          {activeTab === "upcoming" && (
                            <Badge className="bg-primary-50 text-primary-700 hover:bg-primary-50">
                              Confirmada
                            </Badge>
                          )}
                          {activeTab === "past" && (
                            <Badge className="bg-muted text-foreground hover:bg-muted">
                              Completada
                            </Badge>
                          )}
                          {activeTab === "cancelled" && (
                            <Badge className="bg-red-50 text-red-700 hover:bg-red-50">
                              Cancelada
                            </Badge>
                          )}
                        </div>
                        
                        <Separator className="my-3" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm text-foreground">{formatDate(booking.date)}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm text-foreground">
                              {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                            </span>
                          </div>
                        </div>
                        
                        {booking.notes && (
                          <div className="mt-3 p-2 bg-muted rounded-md">
                            <p className="text-sm text-muted-foreground">{booking.notes}</p>
                          </div>
                        )}
                        
                        {activeTab === "upcoming" && (
                          <div className="mt-4 flex justify-end">
                              <CancelBookingButton bookingId={booking.id} onCancel={handleCancelBooking} />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente para la confirmación de cancelación
function CancelBookingButton({
                                 bookingId,
                                 onCancel,
                             }: {
    bookingId: number;
    onCancel: (id: number) => void;
}) {
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <div className="relative">
            <Button
                variant="outline"
                className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300"
                onClick={() => setShowConfirm(true)}
            >
                Cancelar Reserva
            </Button>

            {showConfirm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                    <div className="bg-card text-card-foreground rounded-xl shadow-lg p-6 w-[90%] max-w-sm text-center border border-border">
                        <AlertCircle className="mx-auto mb-2 text-red-600 w-10 h-10" />
                        <h2 className="text-lg font-semibold mb-2 text-foreground">¿Cancelar esta cita?</h2>
                        <p className="text-sm text-muted-foreground mb-5">
                            Esta acción no se puede deshacer. La cita será marcada como cancelada.
                        </p>
                        <div className="flex justify-center gap-4">
                            <Button
                                variant="outline"
                                onClick={() => setShowConfirm(false)}
                            >
                                Volver
                            </Button>
                            <Button
                                className="bg-red-600 text-white hover:bg-red-700"
                                onClick={() => {
                                    setShowConfirm(false);
                                    onCancel(bookingId);
                                }}
                            >
                                Sí, cancelar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
