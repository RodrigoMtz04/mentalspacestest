import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function TestAuth() {
  const { user, loginMutation, logoutMutation } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => {
    // Verificar el estado de la sesión actual
    checkSessionStatus();
  }, []);

  const checkSessionStatus = async () => {
    try {
      console.log("Verificando autenticación de usuario...");
      const res = await fetch("/api/user");
      if (res.ok) {
        const userData = await res.json();
        console.log("Usuario autenticado:", userData);
        setSessionInfo({
          status: "authenticated",
          user: userData
        });
      } else {
        console.log("Usuario no autenticado (" + res.status + ")");
        const errorData = await res.json();
        setSessionInfo({
          status: "unauthenticated",
          error: errorData
        });
      }
    } catch (err) {
      console.error("Error al verificar autenticación:", err);
      setSessionInfo({
        status: "error",
        message: err instanceof Error ? err.message : String(err)
      });
    }
  };

  const handleLogin = async () => {
    try {
      setError(null);
      setApiResponse(null);
      
      console.log(`Iniciando sesión con: ${username} / ${password}`);
      
      // Método 1: Usando el hook de autenticación
      await loginMutation.mutateAsync({ username, password });
      
      // Actualizar información de sesión después del login
      checkSessionStatus();
    } catch (err) {
      console.error("Error en login:", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDirectApiLogin = async () => {
    try {
      setError(null);
      setApiResponse(null);
      
      console.log(`API Login directo con: ${username} / ${password}`);
      
      // Método 2: Llamada directa a la API
      const response = await apiRequest("POST", "/api/login", { username, password });
      const data = await response.json();
      
      setApiResponse({
        status: response.status,
        statusText: response.statusText,
        data
      });
      
      // Actualizar información de sesión después del login
      checkSessionStatus();
    } catch (err) {
      console.error("Error en API login directo:", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleLogout = async () => {
    try {
      setError(null);
      await logoutMutation.mutateAsync();
      // Actualizar información de sesión después del logout
      checkSessionStatus();
    } catch (err) {
      console.error("Error en logout:", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDirectApiLogout = async () => {
    try {
      setError(null);
      const response = await apiRequest("POST", "/api/logout");
      setApiResponse({
        status: response.status,
        statusText: response.statusText
      });
      // Actualizar información de sesión después del logout
      checkSessionStatus();
    } catch (err) {
      console.error("Error en API logout directo:", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">Prueba de Autenticación</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel de Estado */}
        <Card>
          <CardHeader>
            <CardTitle>Estado Actual</CardTitle>
            <CardDescription>
              Información del estado de autenticación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <strong>Estado:</strong> 
                {user ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Autenticado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    No autenticado
                  </span>
                )}
              </div>
              
              {user && (
                <div className="rounded-md bg-muted p-4">
                  <h3 className="font-medium mb-2">Datos del usuario:</h3>
                  <pre className="text-xs whitespace-pre-wrap break-all">
                    {JSON.stringify(user, null, 2)}
                  </pre>
                </div>
              )}
              
              {sessionInfo && (
                <div className="rounded-md bg-muted p-4">
                  <h3 className="font-medium mb-2">Información de sesión:</h3>
                  <pre className="text-xs whitespace-pre-wrap break-all">
                    {JSON.stringify(sessionInfo, null, 2)}
                  </pre>
                </div>
              )}
              
              {error && (
                <div className="rounded-md bg-red-50 p-4 border border-red-200">
                  <div className="flex items-center gap-2 text-red-600 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <h3 className="font-medium">Error:</h3>
                  </div>
                  <p className="text-red-700">{error}</p>
                </div>
              )}
              
              {apiResponse && (
                <div className="rounded-md bg-muted p-4">
                  <h3 className="font-medium mb-2">Respuesta API:</h3>
                  <pre className="text-xs whitespace-pre-wrap break-all">
                    {JSON.stringify(apiResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={checkSessionStatus} 
              variant="outline" 
              className="w-full"
            >
              Actualizar Estado
            </Button>
          </CardFooter>
        </Card>
        
        {/* Panel de Acciones */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones de Autenticación</CardTitle>
            <CardDescription>
              Prueba diferentes métodos de autenticación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <div className="flex flex-col gap-2 mt-4">
                <Button onClick={handleLogin}>
                  Iniciar Sesión (Hook)
                </Button>
                <Button onClick={handleDirectApiLogin} variant="outline">
                  Iniciar Sesión (API Directa)
                </Button>
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex flex-col gap-2">
                <Button onClick={handleLogout} variant="destructive">
                  Cerrar Sesión (Hook)
                </Button>
                <Button onClick={handleDirectApiLogout} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                  Cerrar Sesión (API Directa)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Guía de Depuración</h2>
        <div className="bg-muted rounded-md p-4">
          <ul className="list-disc list-inside space-y-2">
            <li>Credenciales de Admin: <code>admin / admin123</code></li>
            <li>Credenciales de Usuario: <code>drrodriguez / password123</code></li>
            <li>Si ocurre un error, verifica las consolas del navegador y del servidor</li>
            <li>Confirma que la sesión se mantiene después de navegar entre páginas</li>
          </ul>
        </div>
      </div>
    </div>
  );
}