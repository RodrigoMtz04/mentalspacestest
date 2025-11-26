import { ReactNode } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import MobileNavigation from "./MobileNavigation";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  
  // Si el usuario no está autenticado y no está en la página de autenticación,
  // muestra solo el contenido sin el layout
  if (!user && location !== '/auth') {
    return <>{children}</>;
  }
  
  // Si el usuario está en la página de autenticación, muestra solo el contenido sin el layout
  if (location === '/auth') {
    return <>{children}</>;
  }
  
  // En caso contrario, muestra el layout completo
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-col md:flex-row flex-1">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 overflow-auto pb-16 md:pb-6">
          <div className="container mx-auto">
            {children}
          </div>
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}
