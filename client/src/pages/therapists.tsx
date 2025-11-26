import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Phone, Mail, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import BookingModal from "@/components/booking-modal";

// Tipo local para los usuarios terapéutas que muestra esta página
interface TherapistUser {
  id: number;
  username: string;
  fullName?: string | null;
  role: string;
  specialty?: string | null;
}

export default function Therapists() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Fetch therapists
  const { data: users = [], isLoading } = useQuery<TherapistUser[]>({
    queryKey: ['/api/users'],
    staleTime: 3600000, // 1 hour
  });

  // Filter only therapists
  const therapists = users.filter((u) => u.role === 'standard' || u.role === 'trusted' || u.role === 'vip');

  // Filter by search term
  const filteredTherapists = therapists.filter((t) => {
    const name = t.fullName || t.username || '';
    const spec = t.specialty || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || spec.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleBookWithTherapist = () => {
    setIsBookingModalOpen(true);
  };

  return (
    <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Terapeutas</h1>
        <p className="text-muted-foreground mt-1">
          Conoce a nuestro equipo de profesionales
        </p>
      </div>

      <div className="bg-card rounded-lg shadow p-4 mb-6 border border-border">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o especialidad..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-0">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-muted" />
                  <div className="space-y-2">
                    <div className="h-5 bg-muted rounded w-24" />
                    <div className="h-4 bg-muted rounded w-32" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </div>
              </CardContent>
              <CardFooter>
                <div className="h-10 bg-muted rounded w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTherapists.map((therapist: any) => (
            <Card key={therapist.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center text-foreground text-xl font-semibold">
                    {(therapist.fullName || therapist.username).split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{therapist.fullName || therapist.username}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {therapist.specialty || "Psicólogo"}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-muted-foreground">+52 555 123 4567</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-muted-foreground">{therapist.username}@therapyspace.com</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-xs">
                      Adultos
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Depresión
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Ansiedad
                    </Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full"
                  variant="outline"
                  onClick={() => handleBookWithTherapist()}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Agendar Sesión
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        selectedDate={new Date()}
      />
    </main>
  );
}
