import { useState } from "react";
import { 
  addDays, 
  format, 
  startOfWeek, 
  isBefore, 
  isSameDay, 
  isWithinInterval,
  parseISO
} from "date-fns";
import { es } from "date-fns/locale";
import { Booking, Room } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BookingCalendarProps {
  room: Room;
  bookings: Booking[];
  userBookings: Booking[];
  onSelectTimeSlot: (date: string, time: string) => void;
}

export default function BookingCalendar({ room, bookings, userBookings, onSelectTimeSlot }: BookingCalendarProps) {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(startOfWeek(today, { weekStartsOn: 1 }));
  
  // Generate week days from the start of week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Generate time slots from 9 AM to 6 PM
  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = i + 9;
    return `${hour < 10 ? '0' + hour : hour}:00`;
  });

  const goToPreviousWeek = () => {
    setWeekStart(addDays(weekStart, -7));
  };

  const goToNextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
  };

  const goToCurrentWeek = () => {
    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
  };

  const isTimeslotAvailable = (day: Date, time: string) => {
    const dateStr = format(day, "yyyy-MM-dd");
    
    // Check if day is in the past
    if (isBefore(day, today) && !isSameDay(day, today)) {
      return "closed";
    }
    
    // If it's today, check if the time is in the past
    if (isSameDay(day, today)) {
      const [hours] = time.split(':').map(Number);
      const currentHour = new Date().getHours();
      if (hours <= currentHour) {
        return "closed";
      }
    }
    
    // Check if it's a weekend (0 = Sunday, 6 = Saturday)
    const dayOfWeek = day.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return "closed";
    }
    
    // Check if the timeslot is already booked
    const [timeHour] = time.split(':').map(Number);
    const endTime = `${(timeHour + 1).toString().padStart(2, '0')}:00`;
    
    const isBooked = bookings.some(booking => {
      return booking.date === dateStr && 
             booking.status !== 'cancelled' &&
             ((time >= booking.startTime && time < booking.endTime) ||
              (endTime > booking.startTime && endTime <= booking.endTime));
    });
    
    if (isBooked) {
      return "booked";
    }
    
    // Check if the user has this timeslot booked
    const isUserBooking = userBookings.some(booking => {
      return booking.date === dateStr && 
             booking.status !== 'cancelled' &&
             ((time >= booking.startTime && time < booking.endTime) ||
              (endTime > booking.startTime && endTime <= booking.endTime));
    });
    
    if (isUserBooking) {
      return "user-booking";
    }
    
    return "available";
  };

  const handleTimeslotClick = (day: Date, time: string) => {
    const status = isTimeslotAvailable(day, time);
    if (status === "available") {
      onSelectTimeSlot(format(day, "yyyy-MM-dd"), time);
    }
  };

  const getTimeslotClass = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-50 text-center py-3 rounded cursor-pointer border border-green-100 hover:bg-green-100";
      case "booked":
        return "bg-red-50 text-center py-3 rounded border border-red-100";
      case "user-booking":
        return "bg-primary-50 text-center py-3 rounded border border-primary-200";
      case "closed":
      default:
        return "bg-gray-100 text-center py-3 rounded";
    }
  };

  const getTimeslotText = (status: string) => {
    switch (status) {
      case "available":
        return <span className="text-xs text-green-700">Disponible</span>;
      case "booked":
        return <span className="text-xs text-red-700">Reservado</span>;
      case "user-booking":
        return <span className="text-xs text-primary-700">Tu reserva</span>;
      case "closed":
      default:
        return <span className="text-xs text-gray-400">Cerrado</span>;
    }
  };

  return (
    <Card className="mt-10">
      <CardHeader className="flex flex-col md:flex-row justify-between pb-0">
        <CardTitle className="text-xl font-bold text-gray-800 mb-4 md:mb-0">
          Calendario de Disponibilidad
        </CardTitle>
        <div className="flex space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={goToPreviousWeek}
            className="text-sm font-medium text-gray-600 hover:text-primary-500"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Semana Anterior
          </Button>
          <Button 
            size="sm"
            onClick={goToCurrentWeek}
            className="px-3 py-1 text-sm font-medium bg-primary text-white rounded-md"
          >
            Hoy
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={goToNextWeek}
            className="text-sm font-medium text-gray-600 hover:text-primary-500"
          >
            Semana Siguiente <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Calendar header */}
            <div className="grid grid-cols-8 gap-1 mb-1">
              <div className="text-center py-2"></div>
              {weekDays.map((day, index) => (
                <div key={index} className="text-center py-2">
                  <p className="text-sm font-medium text-gray-600">
                    {format(day, "EEE", { locale: es })}
                  </p>
                  <p className="text-lg font-bold text-gray-800">
                    {format(day, "d")}
                  </p>
                </div>
              ))}
            </div>

            {/* Calendar body */}
            {timeSlots.map((time, timeIndex) => (
              <div key={timeIndex} className="grid grid-cols-8 gap-1 border-t border-gray-100">
                <div className="text-center py-3 text-sm text-gray-500 font-medium">
                  {time}
                </div>
                {weekDays.map((day, dayIndex) => {
                  const status = isTimeslotAvailable(day, time);
                  return (
                    <div 
                      key={dayIndex} 
                      className={getTimeslotClass(status)}
                      onClick={() => handleTimeslotClick(day, time)}
                    >
                      {getTimeslotText(status)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex space-x-4 items-center mb-4 md:mb-0">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-50 border border-green-100 rounded"></div>
              <span className="text-sm text-gray-600">Disponible</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-50 border border-red-100 rounded"></div>
              <span className="text-sm text-gray-600">Reservado</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-primary-50 border border-primary-200 rounded"></div>
              <span className="text-sm text-gray-600">Tu reserva</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-100 rounded"></div>
              <span className="text-sm text-gray-600">No disponible</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
