import { useEffect, useState } from "react"; // Importa React y hooks
import { useAuth } from "@/hooks/use-auth"; //Hook personalizado de autenticación
import { useLocation } from "wouter"; // Para manejar navegación
import { useForm } from "react-hook-form"; // Librería para formularios
import { zodResolver } from "@hookform/resolvers/zod"; // Para usar validación con Zod
import { z } from "zod"; // Validación para las reglas de campo
import { insertUserSchema } from "@shared/schema"; // Asegurar que los datos sean correctos
import { Button } from "@/components/ui/button"; // Botón reutilizable
import { // Componentes del sistema de formularios

Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input"; // Input para mantener mismo estilo y orden
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Pestañas para Login y Registro
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"; // Ventanas modales
import { useToast } from "@/hooks/use-toast"; // Mensajes flotantes
import { Loader2, Eye, EyeOff } from "lucide-react"; // Iconos de carga y visibilidad de contraseña
import bcrypt from "bcryptjs";

// -------------------------
// Validación para Inicio de Sesion
// -------------------------
// loginSchema define las reglas de validación de los campos de inicio de sesión.
// Se usa con react-hook-form y zod para asegurar que el usuario no deje campos vacíos.
const loginSchema = z.object({
  username: z.string().min(1, "Usuario requerido"),
  password: z.string().min(1, "Contraseña requerida"),
  remember: z.boolean().optional()
});
// Esto asegura que los valores del formulario tengan la forma correcta
type LoginFormValues = z.infer<typeof loginSchema>;

// -------------------------
// Esquema de validación para registro
// -------------------------
// Tomamos el esquema base de usuario y quitamos rol
// Se usa para definir las reglas de validación del formulario de registro
const registerSchema = insertUserSchema.omit({ role: true }).extend({
  passwordConfirm: z.string().min(1, "Confirma tu contraseña"), // Agregamos un nuevo campo
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Las contraseñas no coinciden", // Una regla que verifica que ambas contraseñas sean iguales
  path: ["passwordConfirm"],
});
// Para que TypeScript conozca los campos del formulario y ver sus tipos
type RegisterFormValues = z.infer<typeof registerSchema>;

// -------------------------
// Componente: ForgotPasswordDialog
// -------------------------
// Este componente muestra una ventana para que el usuario recupere su contraseña
const ForgotPasswordDialog = ({ // Props que le pasamos al componente
  open, // Indica si la ventana debe mostrarse
  onOpenChange, // Función para abrir y cerrar ventana
  onSubmit, // Función para envíar correo
  isLoading // Indica si se está procesando el envío
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (email: string) => void;
  isLoading: boolean;
}) => {
  const [email, setEmail] = useState(""); // Estado local para guardar lo que el usuario escribe
  
  return (
      // Controla abrir y cerrar ventana
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md"> {/* Contenido principal de la ventana */}
        <DialogHeader> {/* Encabezado de la ventana */}
          <DialogTitle>Recuperar contraseña</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4"> {/* Cuerpo de la ventana */}
          <p className="text-sm text-muted-foreground"> {/* Explicación breve para el usuario */}
              Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
          </p>
          <div className="space-y-2"> {/* Campo para ingresar correo electrónico */}
            <label htmlFor="email" className="text-sm font-medium">
              Correo electrónico
            </label>
            <Input
              id="email" // Identificar correo
              type="email" // Validación del Email
              value={email} // Ver contenido
              onChange={(e) => setEmail(e.target.value)} // Actualiza contenido
              placeholder="nombre@ejemplo.com" // Cuándo está vacío el campo
            />
          </div>
        </div>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            {/* Botón para cerrar la ventana */}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
            {/* Botón para enviar correo de recuperación */}
          <Button
            type="button" 
            onClick={() => onSubmit(email)} // Llama a la función del envío
            disabled={isLoading || !email} // Evitar varios envíos seguidos
          >
            {isLoading ? ( // Si se está enviando
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {/* Icono de carga girando */}
                Enviando...
              </div>
            ) : (
              "Enviar instrucciones" // Texto cuando se está enviando
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Componente: ConfirmRegisterDialog
// --------------------------------------------
// Este componente muestra un cuadro de diálogo
// Para preguntar al usuario si desea registrar a un psicólogo antes de iniciar sesión.
// --------------------------------------------
const ConfirmRegisterDialog = ({
                                   open, // Indica si el diálogo está abierto
                                   onOpenChange, // Controla apertura/cierre
                                   onConfirmRegister, // Función para registrar al psicólogo
                                   usernamePreview, // Muestra el nombre de usuario introducido
                               }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirmRegister: () => void;
    usernamePreview?: string | null;
}) => {
    return ( // Interfaz de ventana emergente
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Confirmar registro de psicólogo</DialogTitle>
                </DialogHeader>

                <div className="py-2">
                    <p className="text-sm text-muted-foreground">
                        Vas a dar de alta al psicólogo con el usuario{" "}
                        <strong>{usernamePreview ?? ""}</strong>.
                        ¿Deseas continuar con el registro?
                    </p>
                </div>

                <DialogFooter className="flex justify-end space-x-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            onOpenChange(false);
                            onConfirmRegister();
                        }}
                    >
                        Confirmar alta
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
// -------------------------
// Estados locales
// Componente principal de la página de autenticación (login/registro)
// Para que los usuarios identifiquen rápidamente dónde se declaran los estados
// -------------------------
export default function AuthPage() {
  const [confirmRegisterOpen, setConfirmRegisterOpen] = useState(false); // Controla si el diálogo "confirmar" está abierto
  const [pendingLoginValues, setPendingLoginValues] = useState<LoginFormValues | null>(null); // Guarda los valores de campos "Iniciar Sesión"
  const [activeTab, setActiveTab] = useState<string>("login"); // Indica la pestaña activa
  const [showLoginPassword, setShowLoginPassword] = useState(false); // Controla visibilidad de contraseña en formulario
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const { toast } = useToast();
  const { user, loginMutation, registerMutation, rememberedId } = useAuth();
  const [, navigate] = useLocation();
    // -------------------------
    // Función: Manejar "Dar de alta" en registro
    // -------------------------
    const handleConfirmRegister = async () => {
        try { // Obtener valores actuales del formulario excepto passwordConfirm
            const { passwordConfirm, ...userData } = registerForm.getValues();

            // Ejecuta la mutación para registrar con los datos
            await registerMutation.mutateAsync({
                ...userData,
                role: "standard", // Rol por defecto
                professionalType: "psychologist", // Tipo de profesional
            });

            toast({ // Mostrar mensaje de éxito
                title: "Registro exitoso",
                description: "El psicólogo ha sido dado de alta.",
            });

            setConfirmRegisterOpen(false); // Cerrar diálogo
        } catch (error) {
            let message = "Ocurrió un error al registrar";

            if (error instanceof Error) {
                if (error.message.includes("Nombre de usuario ya existe")) {
                    message = "Este nombre de usuario ya está en uso. Intenta con otro.";
                } else {
                    message = error.message;
                }
            }

            toast({
                title: "No se pudo registrar",
                description: message,
                variant: "destructive",
            });
        }
    };

// Función: handleConfirmContinue
// --------------------------------------------
    /**
     * Intenta iniciar sesión con los datos guardados en pendingLoginValues.
     * Se usa cuando el usuario decide continuar sin registrar al psicólogo.
     * - Si el login es exitoso, redirige a la página principal.
     * - Si falla, muestra un mensaje de error.
     * - Limpia el estado de pendingLoginValues al finalizar.
     */
// --------------------------------------------
    const handleConfirmContinue = async () => {
        // Si no hay datos pendientes de login, termina la función.
        if (!pendingLoginValues) return;

        try { // Intenta iniciar sesión usando los datos almacenados.
            const userData = await loginMutation.mutateAsync(pendingLoginValues);
            console.log("Sesión iniciada correctamente.", userData);

            // Redirige al usuario a la página principal después de 1.5 segundos
            setTimeout(() => {
                navigate("/", { replace: true });
            }, 1500);
        } catch (error) {
            toast({
                title: "No se pudo registrar",
                description: "Correo electrónico repetido",
                variant: "destructive",
            });
        }
    };

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Formulario de login
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: rememberedId || "",
      password: "",
      remember: !!rememberedId
    },
  });

  useEffect(() => {
    // actualizar username si recordado llega tarde
    if (rememberedId && !loginForm.getValues("username")) {
      loginForm.setValue("username", rememberedId);
      loginForm.setValue("remember", true);
    }
  }, [rememberedId]);

  // Formulario de registro
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      passwordConfirm: "",
      fullName: "",
      email: "",
      phone: "",
      specialty: "",
      bio: "",
      profileImageUrl: "",
    },
  });

  // Función de login
  const onLoginSubmit = async (values: LoginFormValues) => {
    try {
      const enabled = localStorage.getItem('remember_enabled');
      const rememberAllowed = enabled !== 'false';
      const payload = { username: values.username, password: values.password, remember: rememberAllowed && !!values.remember } as any;
      const userData = await loginMutation.mutateAsync(payload);
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1500);
    } catch (error) {
      toast({
        title: "Error al iniciar sesión",
        description: error instanceof Error ? error.message : "Credenciales incorrectas",
        variant: "destructive",
        duration: 5000
      });
    }
  };



    // Recibe los valores del formulario de registro
    const onRegisterSubmit = (values: RegisterFormValues) => {
        setPendingLoginValues(values as unknown as LoginFormValues);
        setConfirmRegisterOpen(true);
    };

  // Función de recuperación de contraseña
  const handleForgotPassword = (email: string) => {
    setIsRecoveringPassword(true);

    // Simulación de envío de correo de recuperación
    setTimeout(() => {
      setIsRecoveringPassword(false);
      setForgotPasswordOpen(false);
      toast({
        title: "Correo enviado",
        description: `Se ha enviado un enlace de recuperación a ${email}`,
        duration: 5000,
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Formulario (izquierda) */}
      <div className="w-full md:w-1/2 p-8 flex items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">
              SATI Centro de Consulta
            </h1>
            <p className="text-muted-foreground mt-2">
              Sistema de Reserva de Consultorios
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>
            
            {/* Formulario de Login */}
            <TabsContent value="login" className="space-y-4 mt-4">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuario</FormLabel>
                        <FormControl>
                          <Input placeholder="tu_usuario" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center">
                          <FormLabel>Contraseña</FormLabel>
                          <button 
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => setForgotPasswordOpen(true)}
                          >
                            ¿Olvidaste tu contraseña?
                          </button>
                        </div>
                        <div className="relative">
                          <FormControl>
                            <Input 
                              type={showLoginPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              {...field} 
                            />
                          </FormControl>
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                          >
                            {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="remember"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <input id="remember" type="checkbox" checked={!!field.value} onChange={e => field.onChange(e.target.checked)} />
                          <label htmlFor="remember" className="text-sm">Recordar mis datos</label>
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full mt-4" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <div className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Iniciando sesión...
                      </div>
                    ) : (
                      "Iniciar Sesión"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            {/* Formulario de Registro */}
            <TabsContent value="register" className="space-y-4 mt-4">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Juan Pérez" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuario</FormLabel>
                        <FormControl>
                          <Input placeholder="juan_perez" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input 
                              type={showRegisterPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              {...field} 
                            />
                          </FormControl>
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          >
                            {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="passwordConfirm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Contraseña</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input 
                              type={showRegisterConfirmPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              {...field} 
                            />
                          </FormControl>
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                          >
                            {showRegisterConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo Electrónico</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="nombre@ejemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+52 55 1234 5678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="specialty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Especialidad (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej. Terapia Cognitivo-Conductual" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full mt-4" 
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <div className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registrando...
                      </div>
                    ) : (
                      "Registrarse"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Imagen / Hero (derecha) */}
      <div className="w-full md:w-1/2 bg-gradient-to-b from-primary/50 to-primary p-8 text-white flex items-center justify-center">
        <div className="max-w-md space-y-6">
          <h2 className="text-3xl font-bold">Bienvenido a SATI</h2>
          <p className="opacity-90">
            Plataforma de reserva de consultorios para profesionales de la salud mental.
          </p>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="bg-white/20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide-calendar">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Reserva fácil</h3>
                <p className="text-sm opacity-90">
                  Consulta disponibilidad y reserva consultorios en segundos.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-white/20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide-home">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Espacios confortables</h3>
                <p className="text-sm opacity-90">
                  Consultorios equipados y diseñados para terapia psicológica.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-white/20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide-shield-check">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Seguridad garantizada</h3>
                <p className="text-sm opacity-90">
                  Gestión profesional y confidencial de tus reservas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Diálogo de olvidé contraseña */}
      <ForgotPasswordDialog
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
        onSubmit={handleForgotPassword}
        isLoading={isRecoveringPassword}
      />

      {/* Diálogo de confirmación para alta de psicólogo */}
        <ConfirmRegisterDialog
            open={confirmRegisterOpen}
            onOpenChange={setConfirmRegisterOpen}
            onConfirmRegister={handleConfirmRegister}
            usernamePreview={pendingLoginValues?.username ?? null}
        />

    </div>
  );
}