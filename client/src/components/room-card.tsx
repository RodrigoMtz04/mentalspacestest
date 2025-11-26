import { Room } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Clock, Edit } from "lucide-react";

interface RoomCardProps {
  room: Room;
  nextAvailable?: string;
  availabilityStatus: "available" | "limited" | "unavailable";
  onViewDetails: (roomId: number) => void;
  onBookRoom: (roomId: number) => void;
  onEditRoom?: (room: Room) => void;
  isAdmin?: boolean;
}

export default function RoomCard({ 
  room, 
  nextAvailable, 
  availabilityStatus,
  onViewDetails,
  onBookRoom,
  onEditRoom,
  isAdmin = false
}: RoomCardProps) {
  
  const formatPrice = (price: number) => {
    return `$${(price / 100).toFixed(0)}`;
  };
  
  const getAvailabilityBadge = () => {
    switch(availabilityStatus) {
      case "available":
        return (
          <Badge className="bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700">
            Disponible
          </Badge>
        );
      case "limited":
        return (
          <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 hover:text-amber-700">
            Limitado
          </Badge>
        );
      case "unavailable":
        return (
          <Badge className="bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700">
            No disponible
          </Badge>
        );
    }
  };

  return (
    <Card className="overflow-hidden transition-transform duration-200 hover:shadow-md hover:-translate-y-1">
      <div className="relative w-full h-48 bg-muted">
        <img
          src={room.imageUrl} 
          className="w-full h-48 object-cover" 
          alt={room.name} 
        />
        {isAdmin && onEditRoom && (
          <Button 
            variant="outline" 
            size="icon" 
            className="absolute top-2 right-2 bg-card hover:bg-muted"
            onClick={() => onEditRoom(room)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-lg text-foreground">{room.name}</h3>
          <Badge className="bg-primary-50 text-primary-700 hover:bg-primary-50 hover:text-primary-700 whitespace-nowrap">
            {formatPrice(room.price)}/hora
          </Badge>
        </div>
        
        <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{room.description}</p>

        <div className="mt-3 space-y-2">
          <div className="flex items-start space-x-2">
            <MapPin className="text-muted-foreground mt-0.5 h-4 w-4" />
            <span className="text-sm text-muted-foreground">Sede #{room.locationId}</span>
          </div>
          
          {nextAvailable && (
            <div className="flex items-start space-x-2">
              <Clock className="text-muted-foreground mt-0.5 h-4 w-4" />
              <span className="text-sm text-muted-foreground">{nextAvailable}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <Calendar className="text-muted-foreground h-4 w-4" />
            <span className="text-sm text-muted-foreground">Estado: {getAvailabilityBadge()}</span>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2">
            {room.features?.map((feature, index) => (
              <Badge key={index} variant="outline" className="bg-muted text-foreground hover:bg-muted/80 hover:text-foreground">
                 {feature}
               </Badge>
            ))}
          </div>
        </div>
        
        <div className="mt-4 flex space-x-2">
          <Button 
            variant="outline" 
            className="flex-1 border-primary text-primary hover:bg-primary/10"
            onClick={() => onViewDetails(room.id)}
          >
            Ver Detalles
          </Button>
          <Button 
            className="flex-1" 
            onClick={() => onBookRoom(room.id)}
            disabled={availabilityStatus === "unavailable"}
          >
            Reservar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}