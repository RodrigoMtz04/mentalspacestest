import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { SystemConfig } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function AdminConfigSimplePage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    // Depuración en la consola
    console.log("AdminConfigSimplePage montado");
    console.log("Usuario:", user);
  }, [user]);
  
  // Consulta para obtener todas las configuraciones
  const { data: configs, isLoading, error } = useQuery<SystemConfig[]>({
    queryKey: ['/api/config'],
    enabled: mounted && user?.role === 'admin',
  });

  // Depuración para mostrar el estado
  useEffect(() => {
    console.log("Estado de carga:", { isLoading, error, configs });
  }, [isLoading, error, configs]);

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
        <pre className="mt-4 p-2 bg-gray-100 rounded overflow-auto">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }

  if (!configs || configs.length === 0) {
    return (
      <div className="p-4">
        <p>No se encontraron configuraciones en el sistema.</p>
        <p className="mt-4">Usuario: {user ? `${user.username} (${user.role})` : 'No autenticado'}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Configuración del Sistema</h1>
      <p className="text-gray-500 mb-8">
        Aquí puedes ver las reglas de reserva y otras configuraciones del sistema.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {configs.map((config) => (
          <Card key={config.key} className="shadow-md">
            <CardHeader>
              <CardTitle>{config.key}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{config.value}</div>
              <div className="text-sm text-gray-500 mt-2">{config.description}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}