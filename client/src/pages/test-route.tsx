import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function TestRoute() {
  const [, navigate] = useLocation();
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Prueba de Rutas</h1>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-2">Rutas de Administración</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button onClick={() => navigate("/admin/trust-level")} className="w-full">
            Nivel de Confianza
          </Button>
          
          <Button onClick={() => navigate("/admin/config")} className="w-full">
            Reglas de Reserva y Servicios
          </Button>
          
          <Button onClick={() => navigate("/admin/monitoring")} className="w-full">
            Monitoreo y Alertas
          </Button>
        </div>
        
        <div className="mt-8">
          <Button onClick={() => navigate("/")} variant="outline" className="w-full">
            Volver al Inicio
          </Button>
        </div>
      </div>
    </div>
  );
}