import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function MobileNavigation() {
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate('/auth');
        setIsMenuOpen(false);
      }
    });
  };
  
  // Si no hay usuario autenticado o estamos en la página de autenticación, no mostramos la navegación
  if (!user || location === '/auth') {
    return null;
  }
  
  return (
    <nav className="md:hidden bg-card border-t border-border fixed bottom-0 left-0 right-0 z-10">
      <div className="grid grid-cols-5 h-16">
        <Link href="/">
          <div className={`flex flex-col items-center justify-center cursor-pointer ${
            location === "/" ? "text-primary border-t-2 border-primary" : "text-gray-500"
          }`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="text-xs mt-1">Inicio</span>
          </div>
        </Link>
        <Link href="/my-bookings">
          <div className={`flex flex-col items-center justify-center cursor-pointer ${
            location === "/my-bookings" ? "text-primary border-t-2 border-primary" : "text-gray-500"
          }`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="m8 18 3-3-3-3" />
              <path d="m13 12-3 3 3 3" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span className="text-xs mt-1">Mis Reservas</span>
          </div>
        </Link>
        <Link href="/bookings">
          <div className={`flex flex-col items-center justify-center cursor-pointer ${
            location === "/bookings" ? "text-primary border-t-2 border-primary" : "text-gray-500"
          }`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-xs mt-1">Calendario</span>
          </div>
        </Link>
        <Link href="/profile">
          <div className={`flex flex-col items-center justify-center cursor-pointer ${
            location === "/profile" ? "text-primary border-t-2 border-primary" : "text-gray-500"
          }`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="text-xs mt-1">Perfil</span>
          </div>
        </Link>
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <div className="flex flex-col items-center justify-center text-gray-500 cursor-pointer">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
              <span className="text-xs mt-1">Más</span>
            </div>
          </SheetTrigger>
          <SheetContent className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle>SATI Centro de Consulta</SheetTitle>
              <SheetDescription>
                Sesión iniciada como {user.fullName}
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-4">
              {user.role === 'admin' && (
                <>
                  <h3 className="font-semibold text-sm text-gray-500 uppercase">Administración</h3>
                  <div className="space-y-2">
                    <Link href="/admin/rooms">
                      <div className="flex items-center py-2 cursor-pointer text-gray-700 hover:text-primary">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="h-5 w-5 mr-3"
                        >
                          <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                          <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
                          <path d="M12 3v6" />
                        </svg>
                        Gestionar Consultorios
                      </div>
                    </Link>
                    
                    <Link href="/admin/users">
                      <div className="flex items-center py-2 cursor-pointer text-gray-700 hover:text-primary">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="h-5 w-5 mr-3"
                        >
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        Gestionar Usuarios
                      </div>
                    </Link>
                    
                    <Link href="/admin/config">
                      <div className="flex items-center py-2 cursor-pointer text-gray-700 hover:text-primary">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="h-5 w-5 mr-3"
                        >
                          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Reglas de Reserva y Servicios
                      </div>
                    </Link>
                    

                    
                    <Link href="/admin/monitoring">
                      <div className="flex items-center py-2 cursor-pointer text-gray-700 hover:text-primary">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="h-5 w-5 mr-3"
                        >
                          <path d="M3 3v18h18" />
                          <path d="m19 9-5 5-4-4-3 3" />
                        </svg>
                        Monitoreo y Alertas
                      </div>
                    </Link>
                    
                    <Link href="/admin/bookings">
                      <div className="flex items-center py-2 cursor-pointer text-gray-700 hover:text-primary">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="h-5 w-5 mr-3"
                        >
                          <path d="M2 4h20v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Z" />
                          <path d="M2 4h20" />
                          <path d="M4 9h16" />
                          <path d="M4 14h16" />
                          <path d="M9 4v4" />
                          <path d="M14 4v4" />
                        </svg>
                        Calendario
                      </div>
                    </Link>
                    
                    <Link href="/admin/payments">
                      <div className="flex items-center py-2 cursor-pointer text-gray-700 hover:text-primary">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="h-5 w-5 mr-3"
                        >
                          <rect x="2" y="5" width="20" height="14" rx="2" />
                          <line x1="2" y1="10" x2="22" y2="10" />
                        </svg>
                        Pagos
                      </div>
                    </Link>
                    
                    <Link href="/admin/access">
                      <div className="flex items-center py-2 cursor-pointer text-gray-700 hover:text-primary">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="h-5 w-5 mr-3"
                        >
                          <path d="M12 10v4" />
                          <path d="M18 8a6 6 0 0 0-12 0" />
                          <path d="M8 8h8" />
                          <rect x="7" y="12" width="10" height="8" rx="1" />
                        </svg>
                        Acceso
                      </div>
                    </Link>
                  </div>
                </>
              )}
              <h3 className="font-semibold text-sm text-gray-500 uppercase mt-6">Cuenta</h3>
              <div className="space-y-2">
                <div 
                  className="flex items-center py-2 cursor-pointer text-gray-700 hover:text-red-600"
                  onClick={handleLogout}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5 mr-3"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Cerrar sesión
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
