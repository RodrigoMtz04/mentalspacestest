import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

// Schema para agregar un nuevo usuario
const userAddSchema = z.object({
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  fullName: z.string().min(3, "El nombre completo debe tener al menos 3 caracteres"),
  email: z.string().email("Debe ser un correo electrónico válido"),
  role: z.enum(["admin", "standard", "trusted", "vip", "monthly"] as const, {
    errorMap: () => ({ message: 'Rol inválido' })
  }),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  bio: z.string().optional(),
  profileImageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  paymentStatus: z.enum(["active", "pending", "inactive"] as const).default("inactive"),
  professionalType: z.enum(["psychologist", "nutritionist", "doctor", "other"] as const).optional(),
  professionalTypeDetails: z.string().optional(),
  professionalLicense: z.string().optional(),
  identificationUrl: z.string().optional(),
  diplomaUrl: z.string().optional(),
  bookingCount: z.number().optional().default(0),
});

type UserAddFormValues = z.infer<typeof userAddSchema>;

interface UserAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserAddModal({ isOpen, onClose }: UserAddModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [identificationFile, setIdentificationFile] = useState<File | null>(null);
  const [diplomaFile, setDiplomaFile] = useState<File | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);

  // Formulario para agregar usuario
  const form = useForm<UserAddFormValues>({
    resolver: zodResolver(userAddSchema),
    defaultValues: {
      username: "",
      password: "",
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
  
  // Mutación para agregar usuario
  const addUserMutation = useMutation({
    mutationFn: async (data: UserAddFormValues) => {
      setIsSaving(true);
      const allowedMimesDocs = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      const allowedMimesImages = ["image/jpeg", "image/jpg", "image/png"];
      const maxSize = 5 * 1024 * 1024; // 5MB
      const validateLocalFile = (file: File | null, label: string, onlyImages = false) => {
        if (!file) return;
        const list = onlyImages ? allowedMimesImages : allowedMimesDocs;
        if (!list.includes(file.type)) {
          throw new Error(`Archivo de ${label} inválido. Tipos permitidos: ${onlyImages ? 'JPG, JPEG, PNG' : 'JPG, JPEG, PNG, PDF, DOC, DOCX'}.`);
        }
        if (file.size > maxSize) {
          throw new Error(`Archivo de ${label} excede 5MB.`);
        }
      };
      validateLocalFile(identificationFile, 'identificación');
      validateLocalFile(diplomaFile, 'diploma');
      validateLocalFile(profileImageFile, 'imagen de perfil', true);
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined && v !== null && !['identificationUrl','diplomaUrl','profileImageUrl'].includes(k)) {
          fd.append(k, String(v));
        }
      });
      if (!identificationFile && data.identificationUrl) fd.append('identificationUrl', data.identificationUrl);
      if (!diplomaFile && data.diplomaUrl) fd.append('diplomaUrl', data.diplomaUrl);
      if (!profileImageFile && data.profileImageUrl) fd.append('profileImageUrl', data.profileImageUrl);
      if (identificationFile) fd.append('identification', identificationFile);
      if (diplomaFile) fd.append('diploma', diplomaFile);
      if (profileImageFile) fd.append('profileImage', profileImageFile);
      const res = await fetch('/api/users', { method: 'POST', credentials: 'include', body: fd });
      if (!res.ok) { const text = await res.text(); throw new Error(text || res.statusText); }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      form.reset();
      setIdentificationFile(null);
      setDiplomaFile(null);
      setProfileImageFile(null);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear usuario",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });
  
  // Manejador para enviar formulario
  const onSubmit = (values: UserAddFormValues) => {
    addUserMutation.mutate(values);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Usuario</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de Usuario</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
                    <FormLabel>Teléfono (opcional)</FormLabel>
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
                    <FormLabel>Especialidad (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Reemplazar UI simulada de identificación por input real */}
              <FormField
                control={form.control}
                name="identificationUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identificación Oficial</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            setIdentificationFile(f);
                            if (!f) field.onChange("");
                          }}
                        />
                        {!identificationFile && (
                          <div className="flex gap-2">
                            <Input
                              placeholder="URL manual (opcional)"
                              value={field.value || ''}
                              onChange={field.onChange}
                            />
                            {field.value && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => field.onChange("")}>✕</Button>
                            )}
                          </div>
                        )}
                        {identificationFile && (
                          <p className="text-xs text-muted-foreground">Archivo seleccionado: {identificationFile.name} <Button type="button" variant="ghost" size="sm" onClick={() => { setIdentificationFile(null); }}>Quitar</Button></p>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="diplomaUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título Profesional / Diploma</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            setDiplomaFile(f);
                            if (!f) field.onChange("");
                          }}
                        />
                        {!diplomaFile && (
                          <div className="flex gap-2">
                            <Input
                              placeholder="URL manual (opcional)"
                              value={field.value || ''}
                              onChange={field.onChange}
                            />
                            {field.value && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => field.onChange("")}>✕</Button>
                            )}
                          </div>
                        )}
                        {diplomaFile && (
                          <p className="text-xs text-muted-foreground">Archivo seleccionado: {diplomaFile.name} <Button type="button" variant="ghost" size="sm" onClick={() => { setDiplomaFile(null); }}>Quitar</Button></p>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Carga de imagen de perfil real */}
              <FormField
                control={form.control}
                name="profileImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagen de Perfil</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            setProfileImageFile(f);
                            if (!f) field.onChange("");
                            else field.onChange(""); // se usará archivo, limpiar URL
                          }}
                        />
                        {!profileImageFile && (
                          <div className="flex gap-2">
                            <Input
                              placeholder="URL manual (opcional)"
                              value={field.value || ''}
                              onChange={field.onChange}
                            />
                            {field.value && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => field.onChange("")}>
                                ✕
                              </Button>
                            )}
                          </div>
                        )}
                        {profileImageFile && (
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full overflow-hidden bg-muted">
                              <img
                                src={URL.createObjectURL(profileImageFile)}
                                alt="Preview"
                                className="h-full w-full object-cover"
                                onLoad={(e) => URL.revokeObjectURL((e.currentTarget as HTMLImageElement).src)}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {profileImageFile.name}
                            </p>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setProfileImageFile(null)}>Quitar</Button>
                          </div>
                        )}
                      </div>
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
                    Creando...
                  </div>
                ) : (
                  "Crear Usuario"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}