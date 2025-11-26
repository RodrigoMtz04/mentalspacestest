import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Save } from "lucide-react";
import { SystemConfig } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function AdminConfigPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // Consulta para obtener todas las configuraciones
  const { data: configs, isLoading, error } = useQuery<SystemConfig[]>({
    queryKey: ['/api/config'],
    enabled: user?.role === 'admin',
  });

  // Mutación para actualizar una configuración
  const updateConfigMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await apiRequest("PUT", `/api/config/${key}`, { value });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/config'] });
      toast({
        title: "Configuración actualizada",
        description: "La configuración ha sido actualizada exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Función para iniciar edición
  const handleEdit = (config: SystemConfig) => {
    setEditMode({ ...editMode, [config.key]: true });
    setEditValues({ ...editValues, [config.key]: config.value });
  };

  // Función para guardar cambios
  const handleSave = (config: SystemConfig) => {
    updateConfigMutation.mutate({
      key: config.key,
      value: editValues[config.key] || config.value,
    });
    setEditMode({ ...editMode, [config.key]: false });
  };

  // Función para cancelar edición
  const handleCancel = (config: SystemConfig) => {
    setEditMode({ ...editMode, [config.key]: false });
    setEditValues({ ...editValues, [config.key]: config.value });
  };

  // Traducir claves de configuración a nombres más amigables
  const getConfigTitle = (key: string) => {
    const titles: Record<string, string> = {
      max_active_bookings: "Máximo de reservas activas por usuario",
      advance_booking_days: "Días de anticipación para reservar",
      cancellation_hours_notice: "Horas mínimas para cancelar reserva",
      max_booking_duration_hours: "Duración máxima de reserva (horas)",
      // Mantener compatibilidad con claves antiguas
      booking_min_hours_before: "Horas mínimas de anticipación para reservar",
      booking_max_active_per_user: "Máximo de reservas activas por usuario",
      booking_max_hours_duration: "Duración máxima de reserva (horas)",
      booking_min_hours_before_cancel: "Horas mínimas para cancelar reserva",
    };
    return titles[key] || key;
  };

  // Traducir claves de configuración a descripciones más amigables
  const getConfigDescription = (key: string) => {
    const descriptions: Record<string, string> = {
      max_active_bookings: "Cuántas reservas activas puede tener un usuario simultáneamente. Valor configurado: 8.",
      advance_booking_days: "Cuántos días antes debe realizarse una reserva. Valor configurado: 0 (sin anticipación).",
      cancellation_hours_notice: "Cuántas horas antes debe cancelarse una reserva. Valor recomendado: 24.",
      max_booking_duration_hours: "Cuántas horas puede durar una reserva como máximo. Valor configurado: 4.",
      // Mantener compatibilidad con claves antiguas
      booking_min_hours_before: "Cuántas horas antes debe realizarse una reserva. Valor recomendado: 24.",
      booking_max_active_per_user: "Cuántas reservas activas puede tener un usuario simultáneamente. Valor recomendado: 3.",
      booking_max_hours_duration: "Cuántas horas puede durar una reserva como máximo. Valor recomendado: 2.",
      booking_min_hours_before_cancel: "Cuántas horas antes debe cancelarse una reserva. Valor recomendado: 12.",
    };
    return descriptions[key] || "Sin descripción disponible.";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-500">Error al cargar la configuración: {(error as Error).message}</p>
      </div>
    );
  }

  if (!configs || configs.length === 0) {
    return (
      <div className="p-4">
        <p>No se encontraron configuraciones en el sistema.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Configuración del Sistema</h1>
      <p className="text-gray-500 mb-8">
        Aquí puedes configurar las reglas de reserva y otras configuraciones del sistema.
        Los cambios se aplicarán inmediatamente.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {configs.map((config) => (
          <Card key={config.key} className="shadow-md">
            <CardHeader>
              <CardTitle>{getConfigTitle(config.key)}</CardTitle>
              <CardDescription>{getConfigDescription(config.key)}</CardDescription>
            </CardHeader>
            <CardContent>
              {editMode[config.key] ? (
                <Input
                  type="number"
                  value={editValues[config.key] || config.value}
                  onChange={(e) => setEditValues({ ...editValues, [config.key]: e.target.value })}
                  min="1"
                  className="w-full"
                />
              ) : (
                <div className="text-2xl font-semibold">{config.value}</div>
              )}
              <div className="text-xs text-gray-500 mt-2">
                Última actualización: {new Date(config.updatedAt).toLocaleString()}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              {editMode[config.key] ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleCancel(config)}
                    disabled={updateConfigMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => handleSave(config)}
                    disabled={updateConfigMutation.isPending}
                  >
                    {updateConfigMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Guardar
                  </Button>
                </>
              ) : (
                <Button onClick={() => handleEdit(config)}>Editar</Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}