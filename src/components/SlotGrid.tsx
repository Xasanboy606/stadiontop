import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/lib/store";
import type { Stadium } from "@/data/stadiums";
import { useT } from "@/lib/i18n";

interface Props {
  stadium: Stadium;
  date: string;
  selected?: { hour: number; hours: number };
  onSelect?: (hour: number) => void;
  showLegend?: boolean;
  ownerMode?: boolean;
  dbBookedHours?: Set<number>;
}

export const SlotGrid = ({ stadium, date, selected, onSelect, showLegend = true, ownerMode, dbBookedHours }: Props) => {
  const t = useT();
  const { isBooked, isClosed, toggleClosed } = useBookingStore();

  const slots = useMemo(() =>
    Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      booked: isBooked(stadium.id, date, h) || (dbBookedHours?.has(h) ?? false),
      closed: isClosed(stadium.id, date, h),
    })),
    [stadium.id, date, isBooked, isClosed, dbBookedHours]
  );

  return (
    <div>
      <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 gap-1.5">
        {slots.map((s) => {
          const unavailable = s.booked || s.closed;
          const isSelected =
            selected && s.hour >= selected.hour && s.hour < selected.hour + selected.hours;
          return (
            <button
              key={s.hour}
              disabled={!ownerMode && unavailable}
              onClick={() => (ownerMode ? toggleClosed(stadium.id, date, s.hour) : onSelect?.(s.hour))}
              className={cn(
                "h-12 rounded-lg text-xs font-semibold transition-smooth border",
                "flex flex-col items-center justify-center gap-0.5",
                s.booked && "bg-muted text-muted-foreground border-border cursor-not-allowed",
                s.closed && !s.booked && "bg-destructive/15 text-destructive border-destructive/30",
                !unavailable && !isSelected && "bg-primary/10 text-primary border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:scale-105",
                isSelected && "bg-gradient-primary text-primary-foreground border-transparent shadow-glow scale-105",
                ownerMode && "cursor-pointer"
              )}
            >
              <span>{String(s.hour).padStart(2, "0")}:00</span>
              <span className="text-[9px] uppercase tracking-wider opacity-70">
                {s.booked ? t("booked") : s.closed ? "✕" : t("available")}
              </span>
            </button>
          );
        })}
      </div>
      {showLegend && (
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-primary/20 border border-primary/40" /> {t("available")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-muted border border-border" /> {t("booked")}
          </span>
        </div>
      )}
    </div>
  );
};
