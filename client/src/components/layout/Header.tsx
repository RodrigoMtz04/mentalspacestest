import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Moon, Sun } from "lucide-react";
import { getDarkMode, setDarkMode } from "@/lib/theme";

export default function Header() {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate('/auth');
      }
    });
  };
  
  // Si no hay usuario autenticado, no mostramos el header
  if (!user) {
    return null;
  }
  
  // Función para obtener las iniciales del nombre
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0].substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 dark:bg-neutral-900 dark:border-neutral-800">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary h-6 w-6"
          >
            <path d="M8.56 3.69a9 9 0 0 0-2.92 1.95" />
            <path d="M3.69 8.56A9 9 0 0 0 3 12" />
            <path d="M3.69 15.44a9 9 0 0 0 1.95 2.92" />
            <path d="M8.56 20.31A9 9 0 0 0 12 21" />
            <path d="M15.44 20.31a9 9 0 0 0 2.92-1.95" />
            <path d="M20.31 15.44A9 9 0 0 0 21 12" />
            <path d="M20.31 8.56a9 9 0 0 0-1.95-2.92" />
            <path d="M15.44 3.69A9 9 0 0 0 12 3" />
          </svg>
          <h1 className="font-bold text-primary text-xl">SATI Centro de Consulta</h1>
        </div>
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/">
            <span className="text-gray-600 hover:text-primary font-medium cursor-pointer">Consultorios</span>
          </Link>
          <Link href="/my-bookings">
            <span className="text-gray-600 hover:text-primary font-medium cursor-pointer">Mis Reservas</span>
          </Link>
          {user.role === 'admin' && (
            <Link href="/admin">
              <span className="text-gray-600 hover:text-primary font-medium cursor-pointer">Panel Admin</span>
            </Link>
          )}
          <a href="#" className="text-gray-600 hover:text-primary font-medium">Ayuda</a>
        </div>
        <div className="flex items-center space-x-4">
          <button
            className="text-gray-600 hover:text-primary dark:text-gray-300"
            aria-label="Alternar modo oscuro"
            onClick={() => {
              const next = !getDarkMode();
              setDarkMode(next);
            }}
          >
            <Moon className="h-5 w-5 hidden dark:block" />
            <Sun className="h-5 w-5 dark:hidden" />
          </button>
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">{getInitials(user.fullName)}</span>
                  </div>
                  <span className="hidden md:block text-sm font-medium">{user.fullName}</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
