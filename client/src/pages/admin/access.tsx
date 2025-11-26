import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Key, Copy, ExternalLink, Clock, Search } from "lucide-react";
import { User } from "@shared/schema";

export default function AccessPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [expiryTime, setExpiryTime] = useState<string>("30");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Consulta para obtener todos los usuarios
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: user?.role === 'admin',
  });

  // Filtrar los usuarios basados en el término de búsqueda
  const filteredUsers = users?.filter(user => 
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Generar un código de acceso para la chapa electrónica
  const generateAccessCode = () => {
    // Simulamos la generación de un código
    setGeneratingCode(true);
    setTimeout(() => {
      // Generamos un código aleatorio de 6 dígitos
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setAccessCode(code);
      setGeneratingCode(false);
      
      toast({
        title: "Código generado",
        description: `Se ha generado un código de acceso válido por ${expiryTime} minutos.`,
      });
    }, 1500);
  };

  // Copiar el código al portapapeles
  const copyCodeToClipboard = () => {
    if (accessCode) {
      navigator.clipboard.writeText(accessCode);
      toast({
        title: "Código copiado",
        description: "El código de acceso se ha copiado al portapapeles.",
      });
    }
  };

  // Generar un código QR para el acceso (simulación)
  const generateQRCode = () => {
    toast({
      title: "QR generado",
      description: "Se ha generado el código QR para compartir.",
    });
  };

  // Formatear la fecha para mostrar el tiempo restante
  const formatExpiryTime = () => {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + parseInt(expiryTime) * 60000);
    return expiryDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoadingUsers) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Control de Acceso</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Generar Código de Acceso</CardTitle>
              <CardDescription>
                Genera códigos temporales para las chapas electrónicas de los consultorios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Seleccionar Terapeuta</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Buscar terapeuta..."
                        className="pl-10 mb-2"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="max-h-60 overflow-auto border rounded-md">
                      {filteredUsers && filteredUsers.length > 0 ? (
                        filteredUsers.filter(u => u.role !== 'admin').map((user) => (
                          <div 
                            key={user.id}
                            className={`p-3 border-b cursor-pointer hover:bg-muted/50 ${
                              selectedUser === user.id ? 'bg-primary-50 border-primary' : ''
                            }`}
                            onClick={() => setSelectedUser(user.id)}
                          >
                            <div className="font-medium">{user.fullName}</div>
                            <div className="text-sm text-muted-foreground">{user.username}</div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-muted-foreground">
                          {searchTerm ? "No se encontraron terapeutas" : "No hay terapeutas disponibles"}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Duración del código</label>
                    <Select value={expiryTime} onValueChange={setExpiryTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar duración" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="120">2 horas</SelectItem>
                        <SelectItem value="480">8 horas</SelectItem>
                        <SelectItem value="1440">24 horas</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="mt-6">
                      <Button 
                        className="w-full" 
                        onClick={generateAccessCode}
                        disabled={!selectedUser || generatingCode}
                      >
                        {generatingCode ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generando código...
                          </>
                        ) : (
                          <>
                            <Key className="mr-2 h-4 w-4" />
                            Generar Código de Acceso
                          </>
                        )}
                      </Button>
                    </div>

                    {accessCode && (
                      <div className="mt-4 p-4 border rounded-md bg-muted/30">
                        <div className="text-center mb-2">
                          <span className="text-sm text-muted-foreground">Código generado:</span>
                        </div>
                        <div className="flex justify-center">
                          <div className="text-3xl font-mono tracking-widest bg-card px-4 py-2 rounded-md border border-border">
                            {accessCode}
                          </div>
                        </div>
                        <div className="flex justify-center mt-3 space-x-2">
                          <Button size="sm" variant="outline" onClick={copyCodeToClipboard}>
                            <Copy className="h-3 w-3 mr-1" />
                            Copiar
                          </Button>
                          <Button size="sm" variant="outline" onClick={generateQRCode}>
                            <ExternalLink className="h-3 w-3 mr-1" />
                            QR
                          </Button>
                        </div>
                        <div className="text-center mt-3 text-sm text-muted-foreground">
                          <Clock className="inline h-3 w-3 mr-1" />
                          Válido hasta las {formatExpiryTime()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Estado de Pago</CardTitle>
              <CardDescription>
                Verificación de pagos para acceso
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedUser ? (
                <div className="space-y-4">
                  <div className="p-4 border rounded-md bg-green-50 text-green-800">
                    <div className="flex items-center">
                      <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <span className="font-medium">Pago Verificado</span>
                        <p className="text-sm">El terapeuta está al día con sus pagos</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Plan actual:</span>
                      <span className="font-medium">Plan Estándar</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Próximo pago:</span>
                      <span className="font-medium">15/04/2025</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monto:</span>
                      <span className="font-medium">$349.00 MXN</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <p>Selecciona un terapeuta para ver su estado de pago</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t bg-muted/30 flex justify-center">
              <Button variant="outline" size="sm" className="mt-4">
                <ExternalLink className="h-3 w-3 mr-1" />
                Ver historial de pagos
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Historial de Accesos</CardTitle>
              <CardDescription>
                Últimos accesos registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-60 overflow-auto">
                {selectedUser ? (
                  <>
                    <div className="flex justify-between items-center text-sm border-b pb-2">
                      <span>Hoy, 09:45 AM</span>
                      <Badge variant="outline" className="text-xs">Consultorio 1</Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b pb-2">
                      <span>Ayer, 14:30 PM</span>
                      <Badge variant="outline" className="text-xs">Consultorio 2</Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b pb-2">
                      <span>07/03/2025, 11:15 AM</span>
                      <Badge variant="outline" className="text-xs">Consultorio 1</Badge>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center text-muted-foreground">
                    <p>Sin datos para mostrar</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Registro de Códigos de Acceso</CardTitle>
          <CardDescription>
            Historial de códigos generados para los consultorios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Terapeuta</TableHead>
                  <TableHead>Generado</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Utilizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessCode ? (
                  <TableRow>
                    <TableCell className="font-mono">{accessCode}</TableCell>
                    <TableCell>
                      {users?.find(u => u.id === selectedUser)?.fullName || "Desconocido"}
                    </TableCell>
                    <TableCell>{new Date().toLocaleString('es-MX')}</TableCell>
                    <TableCell>{formatExpiryTime()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        Activo
                      </Badge>
                    </TableCell>
                    <TableCell>No</TableCell>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No hay códigos de acceso generados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}