import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { BellRing, Clock, CreditCard, Mail, Save, User } from "lucide-react";

export default function Settings() {
  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground mt-1">
          Ajusta las preferencias de tu cuenta y plataforma
        </p>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="w-full max-w-lg mb-6">
          <TabsTrigger value="account" className="flex-1">
            <User className="h-4 w-4 mr-2" />
            Cuenta
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1">
            <BellRing className="h-4 w-4 mr-2" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex-1">
            <CreditCard className="h-4 w-4 mr-2" />
            Facturación
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Información de Cuenta</CardTitle>
              <CardDescription>
                Actualiza tu información personal y detalles de contacto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-foreground text-2xl font-semibold">
                    DM
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Dra. Martinez</h3>
                    <p className="text-sm text-muted-foreground">Administrador</p>
                    <Button variant="link" className="px-0 h-auto text-sm">
                      Cambiar foto
                    </Button>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input id="name" defaultValue="Carolina Martinez" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="username">Nombre de usuario</Label>
                  <Input id="username" defaultValue="drmartinez" />
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input id="email" type="email" defaultValue="martinez@therapyspace.com" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" type="tel" defaultValue="+52 555 123 4567" />
                </div>
              </div>
              
              <Separator />
              
              <div className="grid gap-4">
                <Label htmlFor="specialty">Especialidad</Label>
                <Input id="specialty" defaultValue="Administración Clínica" />
              </div>
              
              <div className="flex justify-end">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de notificaciones</CardTitle>
              <CardDescription>
                Configura cómo y cuándo recibes notificaciones sobre reservas y actualizaciones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Notificaciones por correo electrónico</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-bookings">Nuevas reservas</Label>
                    <p className="text-sm text-neutral-500">Recibe un correo cuando se crea una nueva reserva</p>
                  </div>
                  <Switch id="email-bookings" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-cancellations">Cancelaciones</Label>
                    <p className="text-sm text-neutral-500">Recibe un correo cuando se cancela una reserva</p>
                  </div>
                  <Switch id="email-cancellations" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-reminders">Recordatorios</Label>
                    <p className="text-sm text-neutral-500">Recibe recordatorios 24 horas antes de tus citas</p>
                  </div>
                  <Switch id="email-reminders" defaultChecked />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Recordatorios del sistema</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="reminder-time">Tiempo de recordatorio</Label>
                    <p className="text-sm text-neutral-500">Cuándo enviar recordatorios antes de una cita</p>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-neutral-500" />
                    <Input 
                      id="reminder-time" 
                      type="number" 
                      defaultValue="24" 
                      className="w-20 mr-2" 
                    />
                    <span className="text-sm text-neutral-500">horas</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Información de facturación</CardTitle>
              <CardDescription>
                Gestiona tus métodos de pago y revisa el historial de facturación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Método de pago actual</h3>
                <div className="flex items-center p-4 border rounded-md">
                  <div className="h-12 w-12 bg-muted rounded-md flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="ml-4">
                    <p className="font-medium">Visa terminada en 1234</p>
                    <p className="text-sm text-muted-foreground">Expira 12/2025</p>
                  </div>
                  <Button variant="outline" className="ml-auto">
                    Editar
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Historial de facturación</h3>
                  <Button variant="outline" size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar por correo
                  </Button>
                </div>
                
                <div className="border rounded-md divide-y">
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">Factura #12345</p>
                      <p className="text-sm text-neutral-500">Agosto 2023</p>
                    </div>
                    <p className="font-medium">$12,400 MXN</p>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">Factura #12344</p>
                      <p className="text-sm text-neutral-500">Julio 2023</p>
                    </div>
                    <p className="font-medium">$11,800 MXN</p>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">Factura #12343</p>
                      <p className="text-sm text-neutral-500">Junio 2023</p>
                    </div>
                    <p className="font-medium">$12,900 MXN</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
