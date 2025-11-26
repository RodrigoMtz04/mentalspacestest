// src/pages/bookings/index.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Booking } from "@shared/schema.ts"; // tipo real desde Drizzle
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

type BookingRow = Booking & {
    userName?: string;
    roomName?: string;
};

export default function BookingsPage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const [filterRoom, setFilterRoom] = useState("");
    const [filterUser, setFilterUser] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "confirmed" | "completed" | "cancelled">("all");

    const { data: bookings = [], isLoading } = useQuery({
        queryKey: ["bookings"],
        queryFn: async (): Promise<BookingRow[]> => {
            const res = await fetch("/api/bookings");
            if (!res.ok) throw new Error("Error al obtener reservas");
            return res.json();
        },
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: number; status: "confirmed" | "completed" | "cancelled" }) => {
            const res = await fetch(`/api/bookings/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(text || "No se pudo actualizar el estado");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
            toast({ title: "Estado actualizado correctamente" });
        },
        onError: (err: any) => {
            toast({
                title: "Error al actualizar",
                description: err?.message || String(err),
                variant: "destructive",
            });
        },
    });

    const filteredBookings = (bookings as BookingRow[]).filter((b) => {
        const roomLabel = (b.roomName ?? String(b.roomId)).toLowerCase();
        const userLabel = (b.userName ?? String(b.userId)).toLowerCase();
        const matchRoom = filterRoom ? roomLabel.includes(filterRoom.toLowerCase()) : true;
        const matchUser = filterUser ? userLabel.includes(filterUser.toLowerCase()) : true;
        const matchStatus = filterStatus === "all" ? true : b.status === filterStatus;
        return matchRoom && matchUser && matchStatus;
    });

    return (
        <div className="p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Reservas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Filtros */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Input
                            placeholder="Filtrar por sala..."
                            value={filterRoom}
                            onChange={(e) => setFilterRoom(e.target.value)}
                        />
                        <Input
                            placeholder="Filtrar por usuario..."
                            value={filterUser}
                            onChange={(e) => setFilterUser(e.target.value)}
                        />
                        <Select
                            value={filterStatus}
                            onValueChange={(v) => setFilterStatus(v as any)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="confirmed">Confirmada</SelectItem>
                                <SelectItem value="completed">Completada</SelectItem>
                                <SelectItem value="cancelled">Cancelada</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setFilterRoom("");
                                setFilterUser("");
                                setFilterStatus("all");
                            }}
                        >
                            Limpiar filtros
                        </Button>
                    </div>

                    {/* Tabla */}
                    <div className="overflow-x-auto rounded-md border">
                        <table className="min-w-full text-sm">
                            <thead className="bg-muted">
                            <tr>
                                <th className="px-3 py-2 text-left">Sala</th>
                                <th className="px-3 py-2 text-left">Usuario</th>
                                <th className="px-3 py-2 text-left">Fecha</th>
                                <th className="px-3 py-2 text-left">Horario</th>
                                <th className="px-3 py-2 text-left">Estado</th>
                                <th className="px-3 py-2 text-center">Acciones</th>
                            </tr>
                            </thead>
                            <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-4">
                                        Cargando...
                                    </td>
                                </tr>
                            ) : filteredBookings.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-4 text-muted-foreground">
                                        No hay reservas registradas
                                    </td>
                                </tr>
                            ) : (
                                filteredBookings.map((b) => (
                                    <tr key={b.id} className="border-t">
                                        <td className="px-3 py-2">{b.roomName ?? `#${b.roomId}`}</td>
                                        <td className="px-3 py-2">{b.userName ?? `#${b.userId}`}</td>
                                        <td className="px-3 py-2">{b.date}</td>
                                        <td className="px-3 py-2">
                                            {b.startTime} - {b.endTime}
                                        </td>
                                        <td className="px-3 py-2">
                                            <Badge
                                                variant={
                                                    b.status === "confirmed"
                                                        ? "default"
                                                        : b.status === "completed"
                                                            ? "secondary"
                                                            : "destructive"
                                                }
                                            >
                                                {b.status === "confirmed"
                                                    ? "Confirmada"
                                                    : b.status === "completed"
                                                        ? "Completada"
                                                        : "Cancelada"}
                                            </Badge>
                                        </td>
                                        <td className="px-3 py-2 text-center space-x-2">
                                            {b.status !== "confirmed" && (
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        updateStatus.mutate({ id: b.id, status: "confirmed" })
                                                    }
                                                >
                                                    Confirmar
                                                </Button>
                                            )}
                                            {b.status === "confirmed" && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() =>
                                                        updateStatus.mutate({ id: b.id, status: "completed" })
                                                    }
                                                >
                                                    Completar
                                                </Button>
                                            )}
                                            {b.status !== "cancelled" && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() =>
                                                        updateStatus.mutate({ id: b.id, status: "cancelled" })
                                                    }
                                                >
                                                    Cancelar
                                                </Button>

                                            )}
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={async () => {
                                                    if (!confirm("¿Confirmar que el cliente no asistió? Se aplicará una penalización."))
                                                        return;
                                                    try {
                                                        const res = await fetch(`/api/bookings/${b.id}/penalize`, {
                                                            method: "POST",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({ percentage: 50 }), // Por ejemplo, 50% de penalización
                                                        });
                                                        if (!res.ok) throw new Error("Error al aplicar penalización");
                                                        toast({ title: "Penalización aplicada correctamente" });
                                                    } catch (err: any) {
                                                        toast({ title: "Error", description: err.message, variant: "destructive" });
                                                    }
                                                }}
                                            >
                                                No asistió
                                            </Button>

                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
