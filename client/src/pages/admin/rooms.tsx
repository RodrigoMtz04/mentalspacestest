import React, {useEffect, useState, useMemo, useCallback} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Room } from "@shared/schema";
import type { Booking } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {Plus, Search, Edit, Trash, CheckCircle, XCircle, MapPin, Image, CalendarIcon, X} from "lucide-react";
import RoomEditModal from "@/components/rooms/RoomEditModal";
import LocationEditModal from "@/components/rooms/LocationEditModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Location, User } from "@shared/schema";
import {formatDateForAPI, formatDateLocalized} from "@/lib/utils/date-utils.ts";
import {Calendar} from "@/components/ui/calendar.tsx";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function AdminRoomsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [activeTab, setActiveTab] = useState("rooms");
  const urlParams = new URLSearchParams(window.location.search);
  const ALL_VALUE = 'all'; // Valor sentinel para representar "Todos" (sin filtro)

  // Selector de características (igual que en RoomEditModal)
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState("");
  const handleAddFeature = () => {
    const value = newFeature.trim();
    if (!value) return;
    const exists = features.some((f) => f.toLowerCase() === value.toLowerCase());
    if (exists) {
      setNewFeature("");
      return;
    }
    setFeatures((prev) => [...prev, value]);
    setNewFeature("");
  };
  const handleRemoveFeature = (index: number) => {
    setFeatures((prev) => prev.filter((_, i) => i !== index));
  };

  // Estado para las ubicaciones
  const [futureBookingsCount, setFutureBookingsCount] = useState<number | null>(null);


    // Estado para las ubicaciones
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [isLocationEditModalOpen, setIsLocationEditModalOpen] = useState(false);

  // Nuevo: parámetros de fecha de inicio y fin
  const startDateParam = urlParams.get('startDate');
  const endDateParam = urlParams.get('endDate');

  // Helpers para parsear fechas seguras
  const parseDateOrToday = (value: string | null): Date => {
    if (!value) return new Date();
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Estados independientes para fecha de inicio y fin
  const [selectedStartDate, setSelectedStartDate] = useState<Date>(() => parseDateOrToday(startDateParam));
  const [selectedEndDate, setSelectedEndDate] = useState<Date>(() => {
    const parsed = parseDateOrToday(endDateParam);
    // Garantizar que endDate >= startDate al inicializar
    if (parsed < parseDateOrToday(startDateParam)) return parseDateOrToday(startDateParam);
    return parsed;
  });

  // Versiones formateadas para API
  const formattedStartDate = formatDateForAPI(selectedStartDate);
  const formattedEndDate = formatDateForAPI(selectedEndDate);

  // Persistencia en localStorage
  useEffect(() => {
    localStorage.setItem('selectedBookingStartDate', formattedStartDate);
  }, [formattedStartDate]);

  useEffect(() => {
    localStorage.setItem('selectedBookingEndDate', formattedEndDate);
  }, [formattedEndDate]);

  // Actualizar URL con ambas fechas
  const updateUrlDates = (start: Date, end: Date) => {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('startDate', formatDateForAPI(start));
    searchParams.set('endDate', formatDateForAPI(end));
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  // Handlers para cambiar fechas asegurando el orden cronológico
  const handleStartDateChange = (date: Date) => {
    setSelectedStartDate(date);
    let newEnd = selectedEndDate;
    if (date > selectedEndDate) {
      newEnd = date; // Ajustar fin si inicio sobrepasa
      setSelectedEndDate(date);
    }
    updateUrlDates(date, newEnd);
  };

  const handleEndDateChange = (date: Date) => {
    setSelectedEndDate(date);
    let newStart = selectedStartDate;
    if (date < selectedStartDate) {
      newStart = date; // Ajustar inicio si fin es anterior
      setSelectedStartDate(date);
    }
    updateUrlDates(newStart, date);
  };

  // Fetch locations
  const { data: locations} = useQuery<Location[]>({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/locations");
      if (!res.ok) throw new Error("Error al cargar ubicaciones");
      return (await res.json()) as Location[]; // forzamos el tipo
    },
  });
  // Fetch rooms
  const { data: rooms, isLoading } = useQuery<Room[]>({
    queryKey: ['/api/rooms'],
  });
  // Fetch users (terapeutas)
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  const therapists = users.filter(u => u.role !== 'admin');

  const filteredRooms = rooms?.filter(room =>
    room.name.toLowerCase().includes(search.toLowerCase()) ||
    room.description.toLowerCase().includes(search.toLowerCase()) ||
    room.locationId.toString().includes(search)
  );

  const handleCreateRoom = () => {
    setEditingRoom(null);
    setIsEditModalOpen(true);
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (room: Room) => {
    setRoomToDelete(room);
    setIsDeleteModalOpen(true);
  };

    // Consultar reservas futuras cuando se abre el modal de eliminación
    useEffect(() => {
        const fetchFutureBookings = async () => {
            if (!roomToDelete || !isDeleteModalOpen) return;

            try {
                const response: any = await apiRequest("GET", `/api/rooms/${roomToDelete.id}/future-bookings`);
                setFutureBookingsCount(response.count ?? 0);
            } catch (error) {
                console.error("Error obteniendo reservas futuras:", error);
                setFutureBookingsCount(null);
            }
        };

        fetchFutureBookings();
    }, [roomToDelete, isDeleteModalOpen]);


    // CUBÍCULO INACTIVO
    const handleDeleteRoom = async () => {
        if (!roomToDelete) return;

        try {
            const response: any = await apiRequest(
                "DELETE",
                `/api/rooms/${roomToDelete.id}`
            );

            const data: Record<string, any> =
                typeof response === "object" && response !== null ? response : {};

            toast({
                title: "Cubículo eliminado",
                description:
                    data?.message ?? "El consultorio ha sido eliminado exitosamente.",
            });

            queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
            setIsDeleteModalOpen(false);
        } catch (error: any) {
            console.error("Error al eliminar consultorio:", error);

            toast({
                title: "Error",
                description: "Este cubículo ya está inactivo",
                variant: "destructive",
            });
        }
    };



    const handleRoomUpdated = () => {
    // Invalidate and refetch rooms data
    queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price / 100);
  };

  // Función para manejar la edición de una ubicación
  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setIsLocationEditModalOpen(true);
  };

  // Función que se llama cuando una ubicación ha sido actualizada
  const handleLocationUpdated = () => {
    toast({
      title: "Ubicación actualizada",
      description: "La información de la ubicación ha sido actualizada exitosamente."
    });
    // En un caso real, aquí invalidaríamos la consulta de ubicaciones
  };

  // Estado para el filtro de estado de reserva
  const statusParam = urlParams.get('status');
  const [bookingStatus, setBookingStatus] = useState<string>(''); // iniciar sin estado seleccionado
  useEffect(() => {
    if (statusParam) {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.delete('status');
      const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [statusParam]);
  // Estado para el filtro de usuario
  const userIdParam = urlParams.get('userId');
  const [selectedUserId, setSelectedUserId] = useState<string>(userIdParam || "");
  // Estado para el filtro de cubículo
  const roomIdParam = urlParams.get('roomId');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(roomIdParam || "");

  // Estado de reservas filtradas y loading
  const [filteredBookings, setFilteredBookings] = useState<Booking[] | null>(null);
  const [isFetchingBookings, setIsFetchingBookings] = useState(false);

  /*
  Las reservanas seran consideradas huerfanas cuando el id del usuario o cubiculo que tengan ya no existan.
  Entonces, si se da de baja un psicologo, la reserva pasara a ser huerfana y no se mostrara en el menu.
  Esto lo pongo porque por alguna razon (al menos ahorita :p) no se dan de baja de la BD las reservas que teninan un usuario asignado
  Por si acaso, tambien aplica con los cubiculos. Si no existe ya su cubiculo, no se muestran. Pero eso si esta implementado ya en el sistema.
  */
  // Nota: ya no guardamos explícitamente las reservas huérfanas, sólo las filtramos fuera.

  const handleApplyFilters = async () => {
    // No aplicar aún si catálogos base no están listos (evita excluir todo por sets vacíos)
    if (!rooms || users.length === 0) {
      toast({
        title: "Cargando catálogos",
        description: "Espera a que se carguen cubículos y terapeutas para aplicar filtros.",
      });
      return;
    }

    // Construir query string para /api/bookings
    const params = new URLSearchParams();
    params.set("startDate", formattedStartDate);
    params.set("endDate", formattedEndDate);
    const effectiveUser = selectedUserId === ALL_VALUE ? '' : selectedUserId;
    const effectiveRoom = selectedRoomId === ALL_VALUE ? '' : selectedRoomId;
    const effectiveStatus = bookingStatus === ALL_VALUE ? '' : bookingStatus;
    if (effectiveUser) params.set("userId", effectiveUser);
    if (effectiveRoom) params.set("roomId", effectiveRoom);
    const allowedStatuses = new Set(["confirmed", "cancelled", "completed"]);
    if (effectiveStatus && allowedStatuses.has(effectiveStatus)) {
      params.set("status", effectiveStatus);
    }

    setIsFetchingBookings(true);
    try {
      const res = await apiRequest("GET", `/api/bookings?${params.toString()}`);
      if (!res.ok) {
        console.error("Error al cargar reservas", res.status, res.statusText);
        toast({
          title: "Error",
          description: "No se pudieron cargar las reservas filtradas",
          variant: "destructive",
        });
        setFilteredBookings([]);
        return;
      }
      let data = (await res.json()) as Booking[];

      // Filtro adicional por características (lado cliente)
      if (features.length > 0 && rooms) {
        const normalized = features.map((f) => f.trim().toLowerCase());
        data = data.filter((b) => {
          const room = rooms.find((r) => r.id === b.roomId);
          if (!room) return false;
          const rFeatures = (room.features || []).map((rf) => rf.toLowerCase());
            return normalized.every((f) => rFeatures.includes(f));
        });
      }

      // Excluir reservas cuyo room o user ya no existan (huérfanas)
      const validRoomIds = new Set((rooms || []).map(r => r.id));
      const validUserIds = new Set((users || []).map(u => u.id));
      data = data.filter(b => validRoomIds.has(b.roomId) && validUserIds.has(b.userId));

      // Guardar
      setFilteredBookings(data);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "No se pudieron cargar las reservas filtradas",
        variant: "destructive",
      });
      setFilteredBookings([]);
    } finally {
      setIsFetchingBookings(false);
    }
  };

  // Ordenar reservas por fecha y hora ASC (más antigua primero para agrupar como en ejemplo)
  const sortedBookings = useMemo(() => {
    if (!filteredBookings) return null;
    return [...filteredBookings].sort((a, b) => {
      const aDt = new Date(`${a.date}T${a.startTime}`);
      const bDt = new Date(`${b.date}T${b.startTime}`);
      return aDt.getTime() - bDt.getTime();
    });
  }, [filteredBookings]);

  // Formatear encabezado de fecha (ej: JUEVES, 6 DE NOVIEMBRE DE 2025)
  const formatDateHeading = useCallback((dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
  }, []);

  // Handler para cambio de estado de reserva
  const handleStatusChange = (value: string) => {
    const next = value === ALL_VALUE ? '' : value;
    setBookingStatus(next);
    const searchParams = new URLSearchParams(window.location.search);
    if (next) {
      searchParams.set('status', next);
    } else {
      searchParams.delete('status');
    }
    // Mantener fechas y otros filtros en la URL
    searchParams.set('startDate', formattedStartDate);
    searchParams.set('endDate', formattedEndDate);
    const userValue = selectedUserId === ALL_VALUE ? '' : selectedUserId;
    const roomValue = selectedRoomId === ALL_VALUE ? '' : selectedRoomId;
    if (userValue) searchParams.set('userId', userValue); else searchParams.delete('userId');
    if (roomValue) searchParams.set('roomId', roomValue); else searchParams.delete('roomId');
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  // Handler para cambio de usuario
  const handleUserChange = (value: string) => {
    const next = value === ALL_VALUE ? '' : value;
    setSelectedUserId(next);
    const searchParams = new URLSearchParams(window.location.search);
    if (next) {
      searchParams.set('userId', next);
    } else {
      searchParams.delete('userId');
    }
    // Mantener fechas y otros filtros actuales en la URL
    searchParams.set('startDate', formattedStartDate);
    searchParams.set('endDate', formattedEndDate);
    const statusValue = bookingStatus === ALL_VALUE ? '' : bookingStatus;
    const roomValue = selectedRoomId === ALL_VALUE ? '' : selectedRoomId;
    if (statusValue) searchParams.set('status', statusValue); else searchParams.delete('status');
    if (roomValue) searchParams.set('roomId', roomValue); else searchParams.delete('roomId');
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  // Handler para cambio de cubículo
  const handleRoomChange = (value: string) => {
    const next = value === ALL_VALUE ? '' : value;
    setSelectedRoomId(next);
    const searchParams = new URLSearchParams(window.location.search);
    if (next) {
      searchParams.set('roomId', next);
    } else {
      searchParams.delete('roomId');
    }
    // Mantener fechas y otros filtros
    searchParams.set('startDate', formattedStartDate);
    searchParams.set('endDate', formattedEndDate);
    const statusValue = bookingStatus === ALL_VALUE ? '' : bookingStatus;
    const userValue = selectedUserId === ALL_VALUE ? '' : selectedUserId;
    if (statusValue) searchParams.set('status', statusValue); else searchParams.delete('status');
    if (userValue) searchParams.set('userId', userValue); else searchParams.delete('userId');
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Cubículos</h1>
          <p className="text-gray-600 mt-1">Administra los cubículos y ubicaciones disponibles en SATI</p>
        </div>
      </div>

      {/* Tabs para Consultorios, Reservas y Ubicaciones */}
      <Tabs
        defaultValue="rooms"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full mb-6"
      >
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="rooms" className="text-sm">
            Cubículos
          </TabsTrigger>
          <TabsTrigger value="bookings" className="text-sm">
            Reservas
          </TabsTrigger>
          <TabsTrigger value="locations" className="text-sm">
            Ubicaciones (Sedes)
          </TabsTrigger>
        </TabsList>

          {/*Contenido de la pesta;a de Cubículos*/}
        <TabsContent value="rooms">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Cubículos individuales</h2>
            <Button onClick={handleCreateRoom}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cubículo
            </Button>
          </div>

          {/* Búsqueda y filtros */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    className="pl-10"
                    placeholder="Buscar cubículos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de cubículos */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle>Cubículos</CardTitle>
              <CardDescription>
                {filteredRooms?.length} cubículos encontrados
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead>Precio (por hora)</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-24">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRooms && filteredRooms.length > 0 ? (
                        filteredRooms.map((room) => (
                          <TableRow key={room.id}>
                            <TableCell className="font-medium">{room.name}</TableCell>
                            <TableCell>{room.locationId}</TableCell>
                            <TableCell>{formatPrice(room.price)}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {room.isActive ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                    <span>Activo</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 text-red-500 mr-1" />
                                    <span>Inactivo</span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditRoom(room)}
                                  title="Editar"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button // Botón para eliminar cubículo
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteClick(room)}
                                  title="Eliminar"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            No se encontraron cubículos
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

          {/*Contenido de la pestaña de Reservas*/}
          <TabsContent value="bookings">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Búsqueda de reservas</h2>
              </div>

            {/* Panel de filtros */}
            <Card className="mb-6">
                <CardContent className="p-4">
                    <h2 className="text font-semibold">
                      Filtros
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-grow">
                            <div className="flex flex-col gap-4">
                                {/*Las fechas desdes y hasta (start y end en el codigo)*/}
                                <div className="flex items-center gap-2">
                                    <div className="text-lg font-semibold">
                                        Desde el {formatDateLocalized(selectedStartDate)}
                                    </div>
                                    <div className="relative">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => {
                                                const popover = document.getElementById("start-date-picker-popover");
                                                if (popover) popover.classList.toggle('hidden');
                                            }}
                                            title="Seleccionar fecha inicio"
                                        >
                                            <CalendarIcon className="h-4 w-4" />
                                        </Button>
                                        <div id="start-date-picker-popover" className="absolute z-50 right-0 mt-2 hidden">
                                            <Calendar
                                                mode="single"
                                                selected={selectedStartDate}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        document.getElementById('start-date-picker-popover')?.classList.add('hidden');
                                                        handleStartDateChange(date);
                                                    }
                                                }}
                                                className="bg-white rounded-md border shadow-md p-3"
                                            />
                                        </div>
                                    </div>
                                    <div className="text-lg font-semibold">
                                        hasta el {formatDateLocalized(selectedEndDate)}
                                    </div>
                                    <div className="relative">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => {
                                                const popover = document.getElementById("end-date-picker-popover");
                                                if (popover) popover.classList.toggle('hidden');
                                            }}
                                            title="Seleccionar fecha fin"
                                        >
                                            <CalendarIcon className="h-4 w-4" />
                                        </Button>
                                        <div id="end-date-picker-popover" className="absolute z-50 right-0 mt-2 hidden">
                                            <Calendar
                                                mode="single"
                                                selected={selectedEndDate}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        document.getElementById('end-date-picker-popover')?.classList.add('hidden');
                                                        handleEndDateChange(date);
                                                    }
                                                }}
                                                className="bg-white rounded-md border shadow-md p-3"
                                            />
                                        </div>
                                    </div>
                                </div>
                                {/* Selector de estado de reserva */}
                                <div className="space-y-2">
                                  <Label htmlFor="bookingStatus">Estado de reserva</Label>
                                  <Select
                                    value={bookingStatus === '' ? ALL_VALUE : bookingStatus}
                                    onValueChange={handleStatusChange}
                                  >
                                    <SelectTrigger id="bookingStatus">
                                      <SelectValue placeholder="Seleccionar estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                                      <SelectItem value="confirmed">Confirmado</SelectItem>
                                      <SelectItem value="cancelled">Cancelado</SelectItem>
                                      <SelectItem value="completed">Completada</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {/* Selector de terapeuta/usuario */}
                                <div className="space-y-2">
                                  <Label htmlFor="bookingUser">Terapeuta</Label>
                                  <Select
                                    value={selectedUserId === '' ? ALL_VALUE : selectedUserId}
                                    onValueChange={handleUserChange}
                                    disabled={isLoadingUsers}
                                  >
                                    <SelectTrigger id="bookingUser">
                                      <SelectValue placeholder="Seleccionar terapeuta" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                                      {therapists.map((t) => (
                                        <SelectItem key={t.id} value={String(t.id)}>
                                          {t.fullName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {/* Selector de cubículo */}
                                <div className="space-y-2">
                                  <Label htmlFor="bookingRoom">Cubículo</Label>
                                  <Select
                                    value={selectedRoomId === '' ? ALL_VALUE : selectedRoomId}
                                    onValueChange={handleRoomChange}
                                  >
                                    <SelectTrigger id="bookingRoom">
                                      <SelectValue placeholder="Seleccionar cubículo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                                      {rooms?.filter(r => r.isActive).map(r => (
                                        <SelectItem key={r.id} value={String(r.id)}>
                                          {r.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {/* Selector de caracteristicas de cubiculo */}
                                <div className="space-y-2">
                                    <Label>Características de cubículos</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newFeature}
                                            onChange={(e) => setNewFeature(e.target.value)}
                                            placeholder="Ej: Wi-Fi, Aire acondicionado"
                                            className="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={handleAddFeature}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {features.map((feature, index) => (
                                            <div
                                                key={index}
                                                className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                                            >
                                                {feature}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveFeature(index)}
                                                    className="text-primary-700 hover:text-primary-900"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                        {features.length === 0 && (
                                            <p className="text-sm text-gray-500">
                                                Añade características para el cubículo
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {/* Botones de filtros */}
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    type="button"
                                    onClick={handleApplyFilters}
                                  >
                                    Aplicar filtros
                                  </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Panel de reservas filtradas */}
          <Card className="mb-6">
              <CardHeader className="pb-0">
                  {/* Webstorm hace los tabs bien raros (-_-; */}
                <CardTitle>Reservas</CardTitle>
                  <CardDescription>
                      {filteredBookings
                        ? (filteredBookings.length === 1
                            ? `${filteredBookings.length} reserva encontrada`
                            : `${filteredBookings.length} reservas encontradas`)
                        : "—"}
                  </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                  {isFetchingBookings ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-40">Fecha</TableHead>
                                    <TableHead className="w-20">Hora de Inicio</TableHead>
                                    <TableHead className="w-20">Hora de Fin</TableHead>
                                    <TableHead className="w-36">Cubículo</TableHead>
                                    <TableHead className="w-56">Nombre del terapeuta</TableHead>
                                    <TableHead className="w-32">Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sortedBookings && sortedBookings.length > 0 && sortedBookings.map((filteredBooking, idx) => {
                                const prev = sortedBookings[idx - 1];
                                const showDate = !prev || prev.date !== filteredBooking.date; // primera fila de cada fecha
                                return (
                                  <TableRow key={`${filteredBooking.id}-${filteredBooking.date}-${filteredBooking.startTime}`}>
                                    <TableCell className={showDate ? 'align-top font-semibold text-blue-600 uppercase text-sm' : 'align-top'}>
                                      {showDate ? formatDateHeading(filteredBooking.date) : ''}
                                    </TableCell>
                                    <TableCell>{filteredBooking.startTime}</TableCell>
                                    <TableCell>{filteredBooking.endTime}</TableCell>
                                    <TableCell>{rooms?.find(bookingRoom => bookingRoom.id === filteredBooking.roomId)?.name || ''}</TableCell>
                                    <TableCell>
                                      {(() => {
                                          const userId = filteredBooking.userId;
                                          const user = users?.find(bookingUser => String(bookingUser.id) === String(userId));
                                          return user ? user.fullName : 'Sin terapeuta';
                                      })()}
                                    </TableCell>
                                    <TableCell>{filteredBooking.status}</TableCell>
                                  </TableRow>
                                );
                              })}
                              {sortedBookings && sortedBookings.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center text-sm text-gray-500">No hay reservas para los filtros seleccionados.</TableCell>
                                </TableRow>
                              )}
                              {!sortedBookings && (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center text-sm text-gray-500">Aplica filtros para ver resultados.</TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                        </Table>
                    </div>
                  )}
              </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Administración de Ubicaciones</h2>
            <Button onClick={() => {
              setEditingLocation(null);
              setIsLocationEditModalOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Ubicación
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {locations?.map(location => (
              <Card key={location.id} className="overflow-hidden">
                <div className="h-48 overflow-hidden relative">
                  {location.imageUrl ? (
                    <img 
                      src={location.imageUrl} 
                      alt={location.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <Image className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <Badge className="absolute top-2 right-2 bg-primary/70">
                    {location.name}
                  </Badge>
                </div>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-bold mb-2">{location.name}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{location.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-start text-sm">
                      <MapPin className="h-4 w-4 text-gray-500 mr-2 mt-0.5" />
                      <span className="text-gray-700">{location.address}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => handleEditLocation(location)}
                  >
                    <Edit className="h-4 w-4" />
                    Editar Información
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de edición de cubículo */}
      <RoomEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        room={editingRoom || undefined}
        onRoomUpdated={handleRoomUpdated}
      />
      
      {/* Modal de edición de ubicación */}
      <LocationEditModal
        isOpen={isLocationEditModalOpen}
        onClose={() => setIsLocationEditModalOpen(false)}
        location={editingLocation}
        onLocationUpdated={handleLocationUpdated}
      />

      {/* Modal de confirmación de eliminación */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar cubículo?</DialogTitle>
              <DialogDescription>
                  Esta acción no se puede deshacer.<br />
                  ¿Estás seguro de que deseas eliminar el cubículo <strong>{roomToDelete?.name}</strong>?
                  {futureBookingsCount !== null && (
                      <>
                          <br />
                          <span className="text-red-600 font-medium">
  Las reservas actuales se borrarán.
</span>
                      </>
                  )}
              </DialogDescription>

          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteRoom}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
