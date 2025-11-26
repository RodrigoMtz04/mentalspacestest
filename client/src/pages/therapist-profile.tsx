import { useQuery } from "@tanstack/react-query";
import {
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Settings, User as UserIcon } from "lucide-react";

// Tipo local simplificado solo para esta página demo
type TherapistUser = {
  id: number;
  username: string;
  password: string;
  fullName: string;
  role: string;
};

export default function TherapistProfilePage() {
  // Hardcoded user ID for demo (normally would come from authentication)
  const userId = 1;

  // Fetch user details (demo, datos hardcodeados)
  const { data: user, isLoading } = useQuery<TherapistUser>({
    queryKey: ["/api/users", userId],
    queryFn: async () => {
      return {
        id: 1,
        username: "drrodriguez",
        password: "********", // Password would not be exposed in a real app
        fullName: "Dr. Rodriguez",
        role: "therapist",
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Perfil de Terapeuta</h2>
        <p className="text-gray-600 mt-1">Gestiona tu información profesional y preferencias</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-6 flex flex-col items-center">
              <div className="w-32 h-32 bg-primary rounded-full flex items-center justify-center mb-4">
                <span className="text-white text-4xl font-medium">DR</span>
              </div>
              <h3 className="text-xl font-bold text-center mb-1">{user?.fullName}</h3>
              <p className="text-gray-500 text-center mb-4">Terapeuta Psicológico</p>
              <Button className="w-full mb-2">Editar Perfil</Button>
              <Button variant="outline" className="w-full">Cambiar Contraseña</Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserIcon className="mr-2 h-5 w-5 text-primary" />
                Información Personal
              </CardTitle>
              <CardDescription>
                Actualiza tu información de perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="fullName">Nombre Completo</Label>
                  <Input id="fullName" defaultValue={user?.fullName} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="username">Nombre de Usuario</Label>
                  <Input id="username" defaultValue={user?.username} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input id="email" type="email" defaultValue="dr.rodriguez@example.com" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" defaultValue="+1 (555) 123-4567" className="mt-1" />
                </div>
              </div>
              <div className="mb-4">
                <Label htmlFor="bio">Biografía Profesional</Label>
                <Textarea 
                  id="bio" 
                  className="mt-1" 
                  rows={4} 
                  defaultValue="Terapeuta con más de 10 años de experiencia en terapia cognitivo-conductual y mindfulness. Especialista en trastornos de ansiedad y estrés."
                />
              </div>
              <Button>Guardar Cambios</Button>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5 text-primary" />
                Preferencias de Reserva
              </CardTitle>
              <CardDescription>
                Configura tus preferencias para las reservas de consultorios
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="preferredLocation">Ubicación Preferida</Label>
                  <Input id="preferredLocation" defaultValue="Centro Médico Alameda" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="preferredFeatures">Características Preferidas</Label>
                  <Input id="preferredFeatures" defaultValue="Insonorizado, Con ventana" className="mt-1" />
                </div>
                <Button>Guardar Preferencias</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
