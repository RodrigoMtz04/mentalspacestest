import { cn } from "@/lib/utils";

interface TimeSlotProps {
  time: string;
  isBooked: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export default function TimeSlot({ time, isBooked, isSelected, onClick }: TimeSlotProps) {
  return (
    <button
      className={cn(
        "px-1 py-1.5 text-xs font-medium border border-gray-200 rounded-md text-center",
        isBooked && "bg-red-50 text-gray-400 cursor-not-allowed",
        isSelected && !isBooked && "bg-primary-50 text-primary border-primary",
        !isBooked && !isSelected && "hover:bg-primary-50 hover:border-primary-200"
      )}
      onClick={onClick}
      disabled={isBooked}
    >
      {time}
    </button>
  );
}
