import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, UseMutationResult } from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { rememberGet, rememberSet, rememberClear } from "@/lib/remember";
import { useIdleSession } from "@/hooks/use-idle-session";

type LoginData = Pick<InsertUser, "username" | "password"> & { remember?: boolean };

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, InsertUser>;
  logoutAll: () => Promise<void>;
  rememberedId: string | null;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [rememberedId, setRememberedId] = useState<string | null>(null);

  useEffect(() => {
    rememberGet().then(setRememberedId).catch(() => {});
  }, []);

  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser
  } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/user", {
          credentials: 'include',
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        if (res.status === 401) return null;
        if (!res.ok) throw new Error(`Error al obtener datos de usuario: ${res.statusText}`);
        return await res.json();
      } catch {
        return null;
      }
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 60000,
    refetchOnReconnect: true,
    retry: 2,
    staleTime: 30000,
    gcTime: 3600000
  });

  // Activar detector de inactividad solo cuando el usuario está autenticado
  useIdleSession({ enabled: !!user });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const { remember, ...creds } = credentials;
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
        credentials: "include"
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error de autenticación: ${res.status} ${errorText}`);
      }
      const userData: User = await res.json();
      if (remember) {
        await rememberSet(creds.username);
        setRememberedId(creds.username);
      } else {
        rememberClear();
        setRememberedId(null);
      }
      return userData;
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      setTimeout(() => {
        queryClient.invalidateQueries({queryKey: ["/api/user"]});
      }, 300);
      toast({ title: "Inicio de sesión exitoso", description: `Bienvenido/a, ${user.fullName}` });
    },
    onError: (error: Error) => {
      toast({ title: "Error al iniciar sesión", description: error.message || "Credenciales incorrectas", variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({ title: "Registro exitoso", description: `Bienvenido/a, ${user.fullName}` });
    },
    onError: (error: Error) => {
      toast({ title: "Error al registrar", description: error.message, variant: "destructive" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({ title: "Sesión cerrada", description: "Has cerrado sesión correctamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error al cerrar sesión", description: error.message, variant: "destructive" });
    },
  });

  async function logoutAll() {
    try {
      const res = await fetch('/api/logout/all', { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('No se pudo cerrar sesión globalmente');
      queryClient.setQueryData(["/api/user"], null);
      toast({ title: 'Cierre global exitoso', description: 'Has cerrado sesión en todos tus dispositivos.' });
    } catch (e: any) {
      toast({ title: 'Error en cierre global', description: e?.message || 'Error desconocido', variant: 'destructive' });
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        logoutAll,
        rememberedId
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}