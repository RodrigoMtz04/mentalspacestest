import { Link, useLocation } from "wouter";
import { Menu, User, Building, Settings, Calendar, Receipt } from "lucide-react";

interface SidebarProps {
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export default function Sidebar({ isMobileMenuOpen, onToggleMobileMenu }: SidebarProps) {
  const [location] = useLocation();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-card border-r border-border">
        <div className="p-4 border-b border-border">
          <h1 className="text-2xl font-bold text-primary-600">TherapySpace</h1>
          <p className="text-sm text-muted-foreground">Sistema de Reservas</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/">
            <a
              className={`flex items-center px-4 py-2 rounded-md ${
                location === "/" 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Calendar className="h-5 w-5 mr-3" />
              Reservas
            </a>
          </Link>
          <Link href="/rooms">
            <a
              className={`flex items-center px-4 py-2 rounded-md ${
                location === "/rooms" 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Building className="h-5 w-5 mr-3" />
              Consultorios
            </a>
          </Link>
          <Link href="/therapists">
            <a
              className={`flex items-center px-4 py-2 rounded-md ${
                location === "/therapists" 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <User className="h-5 w-5 mr-3" />
              Terapeutas
            </a>
          </Link>
          <Link href="/settings">
            <a
              className={`flex items-center px-4 py-2 rounded-md ${
                location === "/settings" 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Settings className="h-5 w-5 mr-3" />
              Configuración
            </a>
          </Link>
          <Link href="/account-summary">
            <a
              className={`flex items-center px-4 py-2 rounded-md ${
                location === "/account-summary" 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Receipt className="h-5 w-5 mr-3" />
              Estado de Cuenta
            </a>
          </Link>
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center text-foreground">
              <span className="text-sm">DM</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">Dra. Martinez</p>
              <p className="text-xs text-muted-foreground">Administrador</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="bg-card border-b border-border lg:py-2 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground focus:outline-none"
              onClick={onToggleMobileMenu}
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="ml-3 text-xl font-semibold text-primary-600">TherapySpace</h1>
          </div>
          <div className="flex items-center">
            <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center text-foreground">
              <span className="text-sm">DM</span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <nav className={`flex border-t border-border overflow-x-auto ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
          <Link href="/">
            <a className={`flex-1 flex justify-center items-center py-3 px-2 text-sm font-medium ${
              location === "/" 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
            }`}>
              <Calendar className="h-5 w-5 mr-2" />
              Reservas
            </a>
          </Link>
          <Link href="/rooms">
            <a className={`flex-1 flex justify-center items-center py-3 px-2 text-sm font-medium ${
              location === "/rooms" 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
            }`}>
              <Building className="h-5 w-5 mr-2" />
              Consultorios
            </a>
          </Link>
          <Link href="/therapists">
            <a className={`flex-1 flex justify-center items-center py-3 px-2 text-sm font-medium ${
              location === "/therapists" 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
            }`}>
              <User className="h-5 w-5 mr-2" />
              Terapeutas
            </a>
          </Link>
          <Link href="/account-summary">
            <a className={`flex-1 flex justify-center items-center py-3 px-2 text-sm font-medium ${
              location === "/account-summary" 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
            }`}>
              <Receipt className="h-5 w-5 mr-2" />
              Estado
            </a>
          </Link>
        </nav>
      </header>
    </>
  );
}
