import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Popover, 
  PopoverTrigger, 
  PopoverContent 
} from "@/components/ui/popover";
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";

interface RoomFiltersProps {
  onFilter: (filters: {
    date: string;
    duration: string;
    features: string;
    maxPrice: string;
  }) => void;
  initialFilters?: {
    date?: string;
    duration?: string;
    features?: string;
    maxPrice?: string;
  };
}

export default function RoomFilters({ onFilter, initialFilters = {} }: RoomFiltersProps) {
  const today = new Date();
  const initialDate = initialFilters.date ? new Date(initialFilters.date) : today;
  
  const [date, setDate] = useState<Date>(initialDate);
  const [duration, setDuration] = useState<string>(initialFilters.duration || "1 hora");
  const [features, setFeatures] = useState<string>(initialFilters.features || "Cualquiera");
  const [maxPrice, setMaxPrice] = useState<string>(initialFilters.maxPrice || "200");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleSearch = () => {
    onFilter({
      date: format(date, "yyyy-MM-dd"),
      duration,
      features,
      maxPrice,
    });
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">Fecha</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "PPP", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    if (newDate) {
                      setDate(newDate);
                      setCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">Duración</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar duración" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30 minutos">30 minutos</SelectItem>
                <SelectItem value="1 hora">1 hora</SelectItem>
                <SelectItem value="1.5 horas">1.5 horas</SelectItem>
                <SelectItem value="2 horas">2 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">Características</Label>
            <Select value={features} onValueChange={setFeatures}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar características" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cualquiera">Cualquiera</SelectItem>
                <SelectItem value="Con ventana">Con ventana</SelectItem>
                <SelectItem value="Accesible">Accesible</SelectItem>
                <SelectItem value="Insonorizado">Insonorizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">Precio máximo</Label>
            <Select value={maxPrice} onValueChange={setMaxPrice}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar precio máximo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cualquiera">Cualquiera</SelectItem>
                <SelectItem value="100">$100</SelectItem>
                <SelectItem value="200">$200</SelectItem>
                <SelectItem value="300">$300</SelectItem>
                <SelectItem value="400+">$400+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSearch} className="text-white">
            <Search className="mr-2 h-4 w-4" />
            Buscar Consultorios
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
