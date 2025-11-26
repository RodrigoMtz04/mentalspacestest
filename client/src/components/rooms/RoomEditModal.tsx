import {useState, useRef, useEffect} from "react";
import {Room, Location} from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X, Plus, Upload, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@radix-ui/react-select";

// Definir el esquema para la validación del formulario
const roomFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
    locationId: z.coerce.number().int().min(1, "Selecciona una sede válida"),
    price: z.coerce.number().min(1, "El precio debe ser mayor a 0"),
  imageUrl: z.string().url("Debe ser una URL válida"),
  features: z.array(z.string()),
  isActive: z.boolean().default(true),
});

type RoomFormValues = z.infer<typeof roomFormSchema>;

interface RoomEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  room?: Room;
  onRoomUpdated: () => void;
}

export default function RoomEditModal({ 
  isOpen, 
  onClose, 
  room, 
  onRoomUpdated 
}: RoomEditModalProps) {
  const { toast } = useToast();
  const [features, setFeatures] = useState<string[]>(room?.features || []);
  const [newFeature, setNewFeature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(room?.imageUrl || null);
  const [locations, setLocations] = useState<Location[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const res = await fetch("/api/locations");
                if (!res.ok) throw new Error("Error al obtener sedes");
                const data = await res.json();
                setLocations(data);
            } catch (err) {
                console.error(err);
                toast({
                    title: "Error",
                    description: "No se pudieron cargar las sedes disponibles.",
                    variant: "destructive",
                });
            }
        };
        fetchLocations();
    }, [toast]);

  // Inicializar el formulario con los valores actuales del consultorio
  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      name: room?.name || "",
      description: room?.description || "",
      locationId: room?.locationId ?? 0,
      price: room?.price ? room.price / 100 : 0, // Convertir de centavos a pesos
      imageUrl: room?.imageUrl || "",
      features: room?.features || [],
      isActive: room?.isActive !== undefined ? room.isActive : true,
    },
  });

    // Cargar datos del cubículo al abrir el modal
    useEffect(() => {
        if (room) {
            form.reset({
                name: room.name || "",
                description: room.description || "",
                locationId: room.locationId ?? 0,
                price: room.price ? room.price / 100 : 0,
                imageUrl: room.imageUrl || "",
                features: room.features || [],
                isActive: room.isActive ?? true,
            });
            setFeatures(room.features || []);
            setImagePreview(room.imageUrl || null);
        } else {
            // Limpiar el formulario si se crea un nuevo cubículo
            form.reset({
                name: "",
                description: "",
                locationId: 0,
                price: 0,
                imageUrl: "",
                features: [],
                isActive: true,
            });
            setFeatures([]);
            setImagePreview(null);
        }
    }, [room, isOpen, form]);

    // Manejar el envío del formulario
  const onSubmit = async (values: RoomFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Convertir el precio de pesos a centavos para almacenamiento
      const dataToSubmit = {
        ...values,
        price: Math.round(values.price * 100),
        features,
      };
      
      // Actualizar el consultorio existente, envía orden patch a routes
      if (room) {
        await apiRequest("PATCH", `/api/rooms/${room.id}`, dataToSubmit);
        
        toast({
          title: "Cubículo actualizado",
          description: "Los datos del cubículo han sido actualizados exitosamente.",
        });
      } else {
        // Crear un nuevo cubículo
        await apiRequest("POST", "/api/rooms", dataToSubmit);
        
        toast({
          title: "Cubículo creado",
          description: "El cubículo ha sido creado exitosamente.",
        });
      }
      
      // Notificar a la página padre y cerrar el modal
      onRoomUpdated();
      onClose();
      
    } catch (error) {
      console.error("Error al guardar el cubículo:", error);
      
      toast({
        title: "Error",
        description: "Hubo un problema al guardar los datos del cubículo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Añadir una característica al cubículo
  const handleAddFeature = () => {
    if (newFeature && !features.includes(newFeature)) {
      setFeatures([...features, newFeature]);
      setNewFeature("");
    }
  };
  
  // Eliminar una característica
  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-lg md:max-w-xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {room ? "Editar Cubículo" : "Nuevo Cubículo"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del cubículo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Cubículo A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descripción detallada del cubículo" 
                      rows={3} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sede</FormLabel>
                            <FormControl>
                                <select
                                    {...field}
                                    className="w-full h-10 border border-input rounded-md px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring bg-background"
                                    disabled={isSubmitting || locations.length === 0}
                                >
                                    <option value="">Selecciona una sede</option>
                                    {locations.map((loc) => (
                                        <option key={loc.id} value={loc.id}>
                                            {loc.name}
                                        </option>
                                    ))}
                                </select>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />


                <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio por hora ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ej: 150"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagen del cubículo</FormLabel>
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Subir imagen
                      </Button>
                      <Input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          // Manejar la carga de la imagen
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const result = event.target?.result as string;
                              setImagePreview(result);
                              field.onChange(result); // Actualizar el valor del campo con la URL de datos
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      
                      <Input 
                        placeholder="o ingresa URL de imagen" 
                        value={field.value} 
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          setImagePreview(e.target.value);
                        }}
                        className="flex-1"
                      />
                    </div>
                    
                    {imagePreview && (
                      <div className="mt-2 border rounded-md overflow-hidden h-40 bg-gray-50">
                        <img 
                          src={imagePreview} 
                          alt="Vista previa de la imagen" 
                          className="h-full w-full object-cover object-center"
                          onError={() => setImagePreview(null)}
                        />
                      </div>
                    )}
                    
                    {!imagePreview && (
                      <div className="mt-2 border rounded-md overflow-hidden h-40 bg-gray-50 flex items-center justify-center">
                        <div className="text-center text-gray-400">
                          <Image className="h-12 w-12 mx-auto mb-2" />
                          <p>Vista previa de la imagen</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <FormLabel>Características</FormLabel>
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
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 text-primary border-input rounded focus:ring-primary"
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer">Cubículo activo</FormLabel>
                </FormItem>
              )}
            />
            
            <DialogFooter className="flex sm:justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                type="button"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : room ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}