import {useState, useRef, useEffect} from "react";
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogHeader, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, Image } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {Select} from "@radix-ui/react-select";
import {SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import type { Location, LocationAvailability} from "@shared/schema";


// Horas de operación (de 8:00 AM a 8:00 PM)
const OPERATING_HOURS = [
    "8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00",
    "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
];
// Schema para el formulario de edición de ubicación
const locationFormSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    description: z.string().min(1, "La descripción es requerida"),
    address: z.string().min(1, "La dirección es requerida"),
    imageUrl: z.string().url("La URL de la imagen debe ser válida").optional(),
    isActive: z.boolean().default(true),
    availability: z.array(
        z.object({
            enabled: z.boolean().default(false),
            dayOfWeek: z.number().min(1).max(7),
            openTime: z.string().optional(),
            closeTime: z.string().optional(),
        })
    )
        .default([
            { enabled: false, dayOfWeek: 1, openTime: "", closeTime: "" },
            { enabled: false, dayOfWeek: 2, openTime: "", closeTime: "" },
            { enabled: false, dayOfWeek: 3, openTime: "", closeTime: "" },
            { enabled: false, dayOfWeek: 4, openTime: "", closeTime: "" },
            { enabled: false, dayOfWeek: 5, openTime: "", closeTime: "" },
            { enabled: false, dayOfWeek: 6, openTime: "", closeTime: "" },
            { enabled: false, dayOfWeek: 7, openTime: "", closeTime: "" },
        ])
        .superRefine((days, ctx) => {
            days.forEach((day, index) => {
                if (day.enabled) {
                    if (!day.openTime) ctx.addIssue({
                        path: [index, "openTime"],
                        message: "Hora de inicio requerida",
                        code: "custom"
                    });
                    if (!day.closeTime) ctx.addIssue({
                        path: [index, "closeTime"],
                        message: "Hora de fin requerida",
                        code: "custom"
                    });
                }
            });
        })
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

interface LocationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: Location | null;
  onLocationUpdated: () => void;
}

export default function LocationEditModal({
  isOpen,
  onClose,
  location,
  onLocationUpdated
}: LocationEditModalProps) {
  const queryClient = useQueryClient();
  const [imagePreview, setImagePreview] = useState<string | null>(
    location?.imageUrl || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);


    const [availability, setAvailability] = useState<LocationAvailability[]>([]);


    useEffect(() => {
        if (location && isOpen) {
            const fetchAvailability = async () => {
                try {
                    const res = await fetch(`/api/locations/${location.id}/availability`);
                    if (!res.ok) throw new Error("Error al cargar disponibilidad");
                    const data: LocationAvailability[] = await res.json();
                    setAvailability(data);


                    const mappedAvailability = Array.from({ length: 7 }, (_, i) => {
                        const dayData = data.find(d => d.dayOfWeek === i + 1);
                        return {
                            enabled: !!dayData, // true si hay datos para ese día
                            dayOfWeek: i + 1,
                            openTime: dayData?.openTime || "",
                            closeTime: dayData?.closeTime || "",
                        };
                    });
                    // Resetear formulario con location + disponibilidad cargada
                    form.reset({
                        name: location.name,
                        description: location.description,
                        address: location.address,
                        imageUrl: location.imageUrl || "",
                        availability: mappedAvailability.length > 0 ? mappedAvailability : [
                            { enabled: false, dayOfWeek: 1, openTime: "", closeTime: "" },
                            { enabled: false, dayOfWeek: 2, openTime: "", closeTime: "" },
                            { enabled: false, dayOfWeek: 3, openTime: "", closeTime: "" },
                            { enabled: false, dayOfWeek: 4, openTime: "", closeTime: "" },
                            { enabled: false, dayOfWeek: 5, openTime: "", closeTime: "" },
                            { enabled: false, dayOfWeek: 6, openTime: "", closeTime: "" },
                            { enabled: false, dayOfWeek: 7, openTime: "", closeTime: "" },
                        ],
                    });

                    setImagePreview(location.imageUrl || null);
                } catch (error) {
                    toast({
                        title: "Error",
                        description: "No se pudo cargar la disponibilidad de la ubicación",
                        variant: "destructive",
                    });
                }
            };

            fetchAvailability();
        } else if (!location && isOpen) {
            // Limpiar availability para modo "crear"
            setAvailability([]);
            form.reset({
                name: "",
                description: "",
                address: "",
                imageUrl: "",
                availability: [
                    { enabled: false, dayOfWeek: 1, openTime: "", closeTime: "" },
                    { enabled: false, dayOfWeek: 2, openTime: "", closeTime: "" },
                    { enabled: false, dayOfWeek: 3, openTime: "", closeTime: "" },
                    { enabled: false, dayOfWeek: 4, openTime: "", closeTime: "" },
                    { enabled: false, dayOfWeek: 5, openTime: "", closeTime: "" },
                    { enabled: false, dayOfWeek: 6, openTime: "", closeTime: "" },
                    { enabled: false, dayOfWeek: 7, openTime: "", closeTime: "" },
                ],
            });
            setImagePreview(null);
        }
    }, [location, isOpen]);
  // Configuración del formulario con valores por defecto
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: location?.name || "",
      description: location?.description || "",
      address: location?.address || "",
      imageUrl: location?.imageUrl || "",
        availability: availability.length > 0
            ? availability
            : [
                    { enabled: false, dayOfWeek: 1, openTime: "", closeTime: "" },
                    { enabled: false, dayOfWeek: 2, openTime: "", closeTime: "" },
                    { enabled: false, dayOfWeek: 3, openTime: "", closeTime: "" },
                    { enabled: false, dayOfWeek: 4, openTime: "", closeTime: "" },
                    { enabled: false, dayOfWeek: 5, openTime: "", closeTime: "" },
                    { enabled: false, dayOfWeek: 6, openTime: "", closeTime: "" },
                    { enabled: false, dayOfWeek: 7, openTime: "", closeTime: "" },
                ],
    },
        //contactPhone: location?.contactPhone || "",
      //contactEmail: location?.contactEmail || "",
      //openingHours: location?.openingHours || "", //TODO: ESTE SE SUPONE QUE SI DEBERIA DE LLEVARLo
  });


  // Mutación para actualizar la ubicación
  const updateLocationMutation = useMutation({
    mutationFn: async (data: LocationFormValues) => {
      // Si estamos editando, usamos PATCH, si estamos creando usamos POST
      const method = location ? "PATCH" : "POST";
      const endpoint = location ? `/api/locations/${location.id}` : "/api/locations";
      
      const res = await apiRequest(method, endpoint, data);
      if (!res.ok) {
        throw new Error(location ? "Error al actualizar la ubicación" : "Error al crear la ubicación");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      toast({
        title: location ? "Ubicación actualizada" : "Ubicación creada",
        description: location ? "La ubicación se ha actualizado exitosamente" : "La ubicación se ha creado exitosamente",
      });
      resetForm()
      onLocationUpdated();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
      form.reset();
      setImagePreview(null);
  }
  // Función para manejar la actualización de la URL de la imagen
  const handleImageUrlChange = (url: string) => {
    setImagePreview(url);
    form.setValue("imageUrl", url);
  };

  // Función de envío del formulario
  const onSubmit = (values: LocationFormValues) => {
    updateLocationMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{location ? "Editar Ubicación" : "Nueva Ubicación"}</DialogTitle>
          <DialogDescription>
            {location 
              ? `Actualiza la información de la ubicación ${location.name}` 
              : "Agrega una nueva ubicación o sede a la plataforma"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de la ubicación" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input placeholder="Dirección completa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                {/*
                <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono de contacto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. +52 123 456 7890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              */}


                {/*
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input placeholder="ejemplo@mail.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              */}

                {/*
              <FormField
                control={form.control}
                name="openingHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horario</FormLabel>
                    <FormControl>
                      <Input placeholder="Lun-Vie: 9am-7pm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              */}
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Imagen de la ubicación</FormLabel>
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
                          value={field.value || ""}
                          onChange={(e) => handleImageUrlChange(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <div className="mb-4">
                    <Label className="block mb-2 font-semibold">Días disponibles</Label>
                    <div className="flex flex-col space-y-2">
                        {[
                            "Lunes",
                            "Martes",
                            "Miércoles",
                            "Jueves",
                            "Viernes",
                            "Sábado",
                            "Domingo",
                        ].map((day, index) => (
                            <div key={day} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id={`day-${index}`}
                                    checked={form.watch(`availability.${index}.enabled`) || false}
                                    onChange={(e) =>
                                        form.setValue(`availability.${index}.enabled`, e.target.checked)
                                    }
                                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                                />
                                <Label htmlFor={`day-${index}`} className="text-sm cursor-pointer">
                                    {day}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Campos de horario solo para días seleccionados */}
                <div className="space-y-4">
                    {[
                        "Lunes",
                        "Martes",
                        "Miércoles",
                        "Jueves",
                        "Viernes",
                        "Sábado",
                        "Domingo",
                    ].map((day, index) => {
                        const enabled = form.watch(`availability.${index}.enabled`);
                        if (!enabled) return null;

                        return (
                            <div key={day} className="border rounded-md p-4">
                                <Label className="block mb-2 font-semibold">{day}</Label>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Hora de inicio */}
                                    <FormField
                                        control={form.control}
                                        name={`availability.${index}.openTime`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Inicio</FormLabel>
                                                <Select
                                                    value={field.value || ""}
                                                    onValueChange={(value) => {
                                                        field.onChange(value);
                                                        const startIndex = OPERATING_HOURS.indexOf(value);
                                                        if (
                                                            startIndex >= 0 &&
                                                            startIndex < OPERATING_HOURS.length - 1
                                                        ) {
                                                            form.setValue(
                                                                `availability.${index}.closeTime`,
                                                                OPERATING_HOURS[startIndex + 1]
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccionar hora de inicio" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="max-h-[300px] overflow-y-auto">
                                                        {OPERATING_HOURS.slice(0, -1).map((time) => (
                                                            <SelectItem key={time} value={time}>
                                                                {time}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Hora de fin */}
                                    <FormField
                                        control={form.control}
                                        name={`availability.${index}.closeTime`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Fin</FormLabel>
                                                <Select
                                                    value={field.value || ""}
                                                    onValueChange={field.onChange}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccionar hora de fin" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="max-h-[300px] overflow-y-auto">
                                                        {OPERATING_HOURS
                                                            .filter((time) => {
                                                                const startTime = form.getValues(
                                                                    `availability.${index}.openTime`
                                                                );
                                                                if (!startTime) return false;
                                                                const startHour = parseInt(startTime.split(":")[0]);
                                                                const currentHour = parseInt(time.split(":")[0]);
                                                                return currentHour > startHour;
                                                            })
                                                            .map((time) => (
                                                                <SelectItem key={time} value={time}>
                                                                    {time}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descripción detallada de la ubicación" 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {imagePreview ? (
              <div className="mt-2">
                <Label>Vista previa de la imagen</Label>
                <div className="mt-1 border rounded-md overflow-hidden h-40 bg-gray-50">
                  <img 
                    src={imagePreview} 
                    alt="Vista previa" 
                    className="h-full w-full object-cover object-center"
                    onError={() => setImagePreview(null)}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <Label>Vista previa de la imagen</Label>
                <div className="mt-1 border rounded-md overflow-hidden h-40 bg-gray-50 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Image className="h-12 w-12 mx-auto mb-2" />
                    <p>Vista previa de la imagen</p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                variant="outline" 
                type="button" 
                onClick={onClose}
                className="mr-2"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updateLocationMutation.isPending}
              >
                {updateLocationMutation.isPending 
                  ? "Guardando..." 
                  : location 
                    ? "Guardar cambios" 
                    : "Crear ubicación"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}