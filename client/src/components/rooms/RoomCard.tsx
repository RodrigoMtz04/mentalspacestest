import { useState } from "react";
import { Link } from "wouter";
import { Room, Booking } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TimeSlot from "@/components/ui/time-slot";
import BookingConfirmationModal from "@/components/booking/BookingConfirmationModal";
import { MapPin } from "lucide-react";

interface RoomCardProps {
  room: Room;
  bookings: Booking[];
  selectedDate: string;
  userId: number;
}

export default function RoomCard({ room, bookings, selectedDate, userId }: RoomCardProps) {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Generate available time slots (9 AM to 6 PM, hourly)
  const timeSlots = Array.from({ length: 9 }, (_, i) => {
    const hour = i + 9;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  // Check if a time slot is booked
  const isTimeSlotBooked = (time: string) => {
    return bookings.some(booking => {
      return (
        booking.status !== "cancelled" &&
        time >= booking.startTime && 
        time < booking.endTime
      );
    });
  };

  const formatPrice = (price: number) => {
    return `$${(price / 100).toFixed(0)}`;
  };

  const handleTimeSlotClick = (time: string) => {
    if (!isTimeSlotBooked(time)) {
      setSelectedTimeSlot(time);
    }
  };

  const handleReserveClick = () => {
    if (selectedTimeSlot) {
      setShowModal(true);
    }
  };

  return (
    <>
      <Card className="overflow-hidden transition-transform duration-200 hover:shadow-md hover:-translate-y-1">
        <div className="w-full h-48 bg-gray-200">
          <img 
            src={room.imageUrl} 
            className="w-full h-48 object-cover" 
            alt={room.name} 
          />
        </div>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-lg text-gray-800">{room.name}</h3>
            <Badge className="bg-primary-50 text-primary-700 hover:bg-primary-50 hover:text-primary-700 whitespace-nowrap">
              {formatPrice(room.price)}/hora
            </Badge>
          </div>
          <p className="text-gray-600 text-sm mt-1">{room.description}</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-start space-x-2">
              <MapPin className="text-gray-400 mt-0.5 h-4 w-4" />
              <span className="text-sm text-gray-600">{room.locationId}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {room.features?.map((feature, index) => (
                <Badge key={index} variant="outline" className="bg-gray-100 text-gray-700 hover:bg-gray-100 hover:text-gray-700">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Horarios disponibles {format(new Date(selectedDate), "dd 'de' MMMM", { locale: es })}:</h4>
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((time) => (
                <TimeSlot
                  key={time}
                  time={time}
                  isBooked={isTimeSlotBooked(time)}
                  isSelected={selectedTimeSlot === time}
                  onClick={() => handleTimeSlotClick(time)}
                />
              ))}
            </div>
          </div>
          <div className="mt-4 flex space-x-2">
            <Link href={`/rooms/${room.id}`}>
              <Button 
                variant="outline" 
                className="flex-1 border-primary text-primary hover:bg-primary-50"
              >
                Ver Detalles
              </Button>
            </Link>
            <Button 
              className="flex-1" 
              onClick={handleReserveClick}
              disabled={!selectedTimeSlot}
            >
              Reservar
            </Button>
          </div>
        </CardContent>
      </Card>

      {showModal && selectedTimeSlot && (
        <BookingConfirmationModal
          open={showModal}
          onClose={() => setShowModal(false)}
          room={room}
          date={selectedDate}
          startTime={selectedTimeSlot}
          endTime={`${parseInt(selectedTimeSlot) + 1}:00`}
          userId={userId}
        />
      )}
    </>
  );
}
