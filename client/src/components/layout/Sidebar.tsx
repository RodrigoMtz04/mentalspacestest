import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const itemBase = "flex items-center space-x-3 px-3 py-3 rounded-lg cursor-pointer";
  const itemIdle = "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
  const active = "bg-sidebar-primary text-sidebar-primary-foreground";

  return (
    <aside className="hidden md:block w-72 bg-sidebar border-r border-sidebar-border p-4">
      <div className="mb-6">
        <h2 className="font-bold text-primary text-xl">SATI</h2>
        <p className="text-sm text-muted-foreground">Centro de Consulta</p>
      </div>
      <nav className="space-y-1">
        <Link href="/">
          <div className={`${itemBase} ${location === "/" ? active : itemIdle}`}>
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
            <span className="font-medium">Inicio</span>
          </div>
        </Link>
        <Link href="/my-bookings">
          <div className={`${itemBase} ${location === "/my-bookings" ? active : itemIdle}`}>
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
            <span className="font-medium">Mis Reservas</span>
          </div>
        </Link>
        <Link href="/profile">
          <div className={`${itemBase} ${location === "/profile" ? active : itemIdle}`}>
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
            <span className="font-medium">Mi Perfil</span>
          </div>
        </Link>

        {user && (
          <Link href="/documents">
            <div className={`${itemBase} ${location === "/documents" ? active : itemIdle}`}>
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
              <span className="font-medium">Mis Documentos</span>
            </div>
          </Link>
        )}

        {user && (
          <Link href="/my-payments">
            <div className={`${itemBase} ${location === "/my-payments" ? active : itemIdle}`}>
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
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <span className="font-medium">Mis Pagos</span>
            </div>
          </Link>
        )}

        {user && (
          <Link href="/account-summary">
            <div className={`${itemBase} ${location === "/account-summary" ? active : itemIdle}`}>
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
                <path d="M4 4h16v4H4z" />
                <path d="M4 8h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" />
                <path d="M8 12h8" />
                <path d="M8 16h6" />
              </svg>
              <span className="font-medium">Estado de Cuenta</span>
            </div>
          </Link>
        )}


        {/* Sección de administración - solo visible para administradores */}
        {user?.role === 'admin' && (
          <>
            <div className="mt-6 mb-2">
              <h3 className="text-xs uppercase font-semibold text-muted-foreground px-3">Administración</h3>
            </div>
            
            <Link href="/admin/logs">
              <div className={`${itemBase} ${location === "/admin/logs" ? active : itemIdle}`}>
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
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
                <span className="font-medium">Logs de auditoría</span>
              </div>
            </Link>

            <Link href="/admin/rooms">
              <div className={`${itemBase} ${location === "/admin/rooms" ? active : itemIdle}`}>
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
                  <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                  <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
                  <path d="M12 3v6" />
                </svg>
                <span className="font-medium">Gestionar Consultorios</span>
              </div>
            </Link>
            
            <Link href="/admin/users">
              <div className={`${itemBase} ${location === "/admin/users" ? active : itemIdle}`}>
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
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span className="font-medium">Gestionar Usuarios</span>
              </div>
            </Link>
            
            <Link href="/admin/config">
              <div className={`${itemBase} ${location === "/admin/config" ? active : itemIdle}`}>
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
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span className="font-medium">Reglas de Reserva y Servicios</span>
              </div>
            </Link>
            
            <Link href="/admin/trust-level">
              <div className={`${itemBase} ${location === "/admin/trust-level" ? active : itemIdle}`}>
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
                  <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                  <path d="M20 10a8 8 0 0 0-8-8" />
                  <path d="M20 10a8 8 0 0 1-8 8" />
                  <path d="M12 20A10 10 0 0 1 2 10" />
                </svg>
                <span className="font-medium">Niveles de Confianza</span>
              </div>
            </Link>
            
            <Link href="/admin/monitoring">
              <div className={`${itemBase} ${location === "/admin/monitoring" ? active : itemIdle}`}>
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
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
                <span className="font-medium">Monitoreo y Alertas</span>
              </div>
            </Link>
            
            <Link href="/admin/config-full">
              <div className={`${itemBase} ${location === "/admin/config-full" ? active : itemIdle}`}>
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
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span className="font-medium">Reglas de Reserva (Completo)</span>
              </div>
            </Link>
            
            <Link href="/admin/bookings">
              <div className={`${itemBase} ${location === "/admin/bookings" ? active : itemIdle}`}>
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
                  <path d="M2 4h20v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Z" />
                  <path d="M2 4h20" />
                  <path d="M4 9h16" />
                  <path d="M4 14h16" />
                  <path d="M9 4v4" />
                  <path d="M14 4v4" />
                </svg>
                <span className="font-medium">Calendario</span>
              </div>
            </Link>
            
            <Link href="/admin/reports">
              <div className={`${itemBase} ${location === "/admin/reports" ? active : itemIdle}`}>
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
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
                <span className="font-medium">Reportes</span>
              </div>
            </Link>

            <Link href="/admin/payments">
              <div className={`${itemBase} ${location === "/admin/payments" ? active : itemIdle}`}>
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
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <span className="font-medium">Pagos</span>
              </div>
            </Link>

            <Link href="/admin/access">
              <div className={`${itemBase} ${location === "/admin/access" ? active : itemIdle}`}>
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
                  <path d="M12 10v4" />
                  <path d="M18 8a6 6 0 0 0-12 0" />
                  <path d="M8 8h8" />
                  <rect x="7" y="12" width="10" height="8" rx="1" />
                </svg>
                <span className="font-medium">Acceso</span>
              </div>
            </Link>
          </>
        )}
        
        <a href="#" className={`${itemBase} ${itemIdle}`}>
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
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
          <span className="font-medium">Ayuda y Soporte</span>
        </a>
      </nav>
    </aside>
  );
}
