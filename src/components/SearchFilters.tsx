import { Search, Filter, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DISTRICTS } from "@/data/stadiums";
import { useT } from "@/lib/i18n";

export type SortKey = "rating" | "priceLow" | "priceHigh";
export type TeamSize = "all" | "5x5" | "8x8" | "11x11";

export interface FilterState {
  query: string;
  district: string;
  fromHour: string;
  toHour: string;
  date: string;
  sort: SortKey;
  teamSize: TeamSize;
}

interface Props {
  value: FilterState;
  onChange: (v: FilterState) => void;
  onReset: () => void;
  className?: string;
}

export const SearchFilters = ({ value, onChange, onReset, className }: Props) => {
  const t = useT();
  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) =>
    onChange({ ...value, [k]: v });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handleFromHourChange = (v: string) => {
    if (v === "any") {
      onChange({ ...value, fromHour: "any", toHour: "any" });
      return;
    }
    const from = parseInt(v);
    const minTo = from + 1;
    onChange({ ...value, fromHour: v, toHour: minTo <= 23 ? String(minTo) : "any" });
  };

  // Valid toHour options: fromHour+1 (min 1h) and fromHour+2 (max 2h)
  const validToHours = () => {
    if (value.fromHour === "any") return [];
    const from = parseInt(value.fromHour);
    return [from + 1, from + 2].filter((h) => h <= 23);
  };

  return (
    <div className={className ?? "rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-soft -mt-12 relative z-10 animate-scale-in"}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        {/* Search */}
        <div className="lg:col-span-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={value.query}
            onChange={(e) => set("query", e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9 h-11"
          />
        </div>

        {/* District */}
        <Select value={value.district} onValueChange={(v) => set("district", v)}>
          <SelectTrigger className="lg:col-span-2 h-11">
            <SelectValue placeholder={t("district")} />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">{t("allDistricts")}</SelectItem>
            {DISTRICTS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Time from — to */}
        <div className="lg:col-span-3 flex items-center gap-2">
          <Select value={value.fromHour} onValueChange={handleFromHourChange}>
            <SelectTrigger className="h-11 flex-1">
              <SelectValue placeholder={t("time")} />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50 max-h-72">
              <SelectItem value="any">{t("any")}</SelectItem>
              {hours.map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {String(h).padStart(2, "0")}:00
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-muted-foreground shrink-0">—</span>

          <Select
            value={value.toHour}
            onValueChange={(v) => set("toHour", v)}
            disabled={value.fromHour === "any"}
          >
            <SelectTrigger className="h-11 flex-1">
              <SelectValue placeholder={t("time")} />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50 max-h-72">
              {validToHours().map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {String(h).padStart(2, "0")}:00
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Team size / format */}
        <Select value={value.teamSize} onValueChange={(v) => set("teamSize", v as TeamSize)}>
          <SelectTrigger className="lg:col-span-2 h-11">
            <Users className="h-4 w-4 mr-1 shrink-0" />
            <SelectValue placeholder={t("teamFormat")} />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">{t("allFormats")}</SelectItem>
            <SelectItem value="5x5">5 × 5</SelectItem>
            <SelectItem value="8x8">8 × 8</SelectItem>
            <SelectItem value="11x11">11 × 11</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort + Reset */}
        <div className="lg:col-span-2 flex items-center gap-2">
          <Select value={value.sort} onValueChange={(v) => set("sort", v as SortKey)}>
            <SelectTrigger className="flex-1 h-11">
              <Filter className="h-4 w-4 mr-1 shrink-0" />
              <SelectValue placeholder={t("sort")} />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="rating">{t("topRated")}</SelectItem>
              <SelectItem value="priceLow">{t("priceLow")}</SelectItem>
              <SelectItem value="priceHigh">{t("priceHigh")}</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            onClick={onReset}
            className="h-11 px-3 text-muted-foreground shrink-0"
          >
            ⟲
          </Button>
        </div>
      </div>
    </div>
  );
};
