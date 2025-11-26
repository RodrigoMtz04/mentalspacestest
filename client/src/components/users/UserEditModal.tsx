import { useState, useEffect } from "react";
import { User } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

// Definición de tipos seguros
type PaymentStatus = "active" | "pending" | "inactive";
type UserRole = "admin" | "standard" | "trusted" | "vip" | "monthly";
type ProfessionalType = "psychologist" | "nutritionist" | "doctor" | "other";

// Schema para edición de usuario
const userEditSchema = z.object({
  fullName: z.string().min(3, "El nombre completo debe tener al menos 3 caracteres"),
  email: z.string().email("Debe ser un correo electrónico válido"),
  role: z.enum(["admin", "standard", "trusted", "vip", "monthly"] as const, {
    errorMap: () => ({ message: 'Rol inválido' })
  }),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  professionalType: z.enum(["psychologist", "nutritionist", "doctor", "other"] as const).optional(),
  professionalTypeDetails: z.string().optional(),
  professionalLicense: z.string().optional(),
  identificationUrl: z.string().optional(),
  diplomaUrl: z.string().optional(),
  bookingCount: z.number().optional(),
  bio: z.string().optional(),
  profileImageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  paymentStatus: z.enum(["active", "pending", "inactive"] as const).default("inactive"),
});

type UserEditFormValues = z.infer<typeof userEditSchema>;

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export default function UserEditModal({ isOpen, onClose, user }: UserEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  
  // Formulario de edición de usuario
  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "standard",
      phone: "",
      specialty: "",
      bio: "",
      profileImageUrl: "",
      isActive: true,
      paymentStatus: "inactive",
      professionalType: "psychologist",
      professionalTypeDetails: "",
      professionalLicense: "",
      identificationUrl: "",
      diplomaUrl: "",
      bookingCount: 0,
    },
  });
  
  // Actualizar el formulario cuando cambie el usuario seleccionado
  useEffect(() => {
    if (user) {
      form.reset({
        fullName: user.fullName,
        email: user.email,
        role: user.role as UserRole,
        phone: user.phone || "",
        specialty: user.specialty || "",
        bio: user.bio || "",
        profileImageUrl: user.profileImageUrl || "",
        isActive: user.isActive,
        paymentStatus: (user.paymentStatus as PaymentStatus) || "inactive",
        professionalType: (user.professionalType as ProfessionalType) || undefined,
        professionalTypeDetails: user.professionalTypeDetails || "",
        professionalLicense: user.professionalLicense || "",
        identificationUrl: user.identificationUrl || "",
        diplomaUrl: user.diplomaUrl || "",
        bookingCount: user.bookingCount || 0,
      });
    }
  }, [user, form]);
  
  // Mutación para actualizar usuario
  const updateUserMutation = useMutation({
    mutationFn: async (data: UserEditFormValues) => {
      if (!user) throw new Error("No hay usuario seleccionado");
      setIsSaving(true);
      const res = await apiRequest("PATCH", `/api/users/${user.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuario actualizado",
        description: "La información del usuario ha sido actualizada correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar usuario",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });
  
  // Manejador para enviar formulario
  const onSubmit = (values: UserEditFormValues) => {
    updateUserMutation.mutate(values);
  };
  
  if (!user) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="standard">Estándar</SelectItem>
                        <SelectItem value="trusted">Confiable</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="professionalType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo Profesional</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="psychologist">Psicólogo</SelectItem>
                        <SelectItem value="nutritionist">Nutricionista</SelectItem>
                        <SelectItem value="doctor">Médico</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="professionalTypeDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detalles Profesionales</FormLabel>
                    <FormControl>
                      <Input placeholder="Especialización/detalles adicionales" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="professionalLicense"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cédula Profesional</FormLabel>
                    <FormControl>
                      <Input placeholder="Número de cédula" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialidad</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="identificationUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identificación Oficial</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input 
                          value={field.value || ''} 
                          onChange={field.onChange}
                          className="hidden"
                        />
                      </FormControl>
                      <div className="grid w-full gap-1.5">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              // Simulamos la subida estableciendo una URL de ejemplo
                              field.onChange("https://example.com/id-" + Date.now() + ".jpg");
                            }}
                            className="w-full"
                          >
                            Cargar INE/Pasaporte
                          </Button>
                          {field.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => field.onChange("")}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                            </Button>
                          )}
                        </div>
                        {field.value && (
                          <p className="text-xs text-muted-foreground">
                            Documento cargado
                          </p>
                        )}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="diplomaUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título Profesional</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input 
                          value={field.value || ''} 
                          onChange={field.onChange}
                          className="hidden"
                        />
                      </FormControl>
                      <div className="grid w-full gap-1.5">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              field.onChange("https://example.com/diploma-" + Date.now() + ".jpg");
                            }}
                            className="w-full"
                          >
                            Cargar Título/Diploma
                          </Button>
                          {field.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => field.onChange("")}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                            </Button>
                          )}
                        </div>
                        {field.value && (
                          <p className="text-xs text-muted-foreground">
                            Documento cargado
                          </p>
                        )}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="profileImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagen de Perfil</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input 
                          value={field.value || ''} 
                          onChange={field.onChange}
                          className="hidden"
                        />
                      </FormControl>
                      <div className="grid w-full gap-1.5">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              field.onChange("https://ui-avatars.com/api/?name=" + 
                                form.getValues().fullName.split(' ').join('+') + 
                                "&background=2E8B57&color=fff");
                            }}
                            className="w-full"
                          >
                            Cargar Foto Profesional
                          </Button>
                          {field.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => field.onChange("")}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                            </Button>
                          )}
                        </div>
                        {field.value && (
                          <div className="flex items-center gap-2">
                            <div className="h-10 w-10 overflow-hidden rounded-full">
                              <img src={field.value} alt="Preview" className="h-full w-full object-cover" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Imagen cargada
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="bookingCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reservas Completadas</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado de Pago</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Estado de pago" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Usuario Activo</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biografía (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describa la formación y experiencia del usuario" 
                      className="resize-none" 
                      rows={4} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving}
              >
                {isSaving ? (
                  <div className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </div>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}