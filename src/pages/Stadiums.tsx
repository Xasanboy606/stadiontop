import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { SearchFilters, type FilterState } from "@/components/SearchFilters";
import { StadiumCard } from "@/components/StadiumCard";
import { StadiumMap } from "@/components/StadiumMap";
import { useStadiums, useBookedHours } from "@/hooks/useStadiums";
import { useT } from "@/lib/i18n";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ListIcon, MapIcon, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const today = () => new Date().toISOString().slice(0, 10);

const initialFilters: FilterState = {
  query: "", district: "all", fromHour: "any", toHour: "any",
  date: today(), sort: "rating", teamSize: "all",
};

const Stadiums = () => {
  const t = useT();
  const { stadiums, loading } = useStadiums();
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [filterKey, setFilterKey] = useState(0);
  const bookedHours = useBookedHours(filters.date);

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    let out = stadiums.filter((s) => {
      if (q && !`${s.name} ${s.district} ${s.address}`.toLowerCase().includes(q)) return false;
      if (filters.district !== "all" && s.district !== filters.district) return false;
      if (filters.teamSize !== "all" && (s.size ?? "").toLowerCase().trim() !== filters.teamSize.toLowerCase()) return false;
      if (filters.fromHour !== "any") {
        const from = parseInt(filters.fromHour);
        const to = filters.toHour !== "any" ? parseInt(filters.toHour) : from + 1;
        for (let h = from; h < to; h++) {
          if ((bookedHours[s.id] ?? []).includes(h)) return false;
        }
      }
      return true;
    });
    if (filters.sort === "rating")    out.sort((a, b) => b.rating - a.rating);
    if (filters.sort === "priceLow")  out.sort((a, b) => a.pricePerHourDay - b.pricePerHourDay);
    if (filters.sort === "priceHigh") out.sort((a, b) => b.pricePerHourDay - a.pricePerHourDay);
    return out;
  }, [filters, stadiums, bookedHours]);

  const firstAvailableSlot = (stadiumId: string): number | undefined => {
    for (let h = 8; h < 23; h++) {
      if (!(bookedHours[stadiumId] ?? []).includes(h)) return h;
    }
    return undefined;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Page hero */}
      <div className="bg-surface border-b border-border/60">
        <div className="container py-14 sm:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/12 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-primary mb-5">
            <Building2 className="h-3 w-3" /> {t("toshkent")}
          </div>
          <h1 className="font-display text-5xl sm:text-7xl text-foreground leading-[0.9]">
            {t("allStadiums").split(" ")[0]}<br />
            <span className="text-gradient">{t("allStadiums").split(" ").slice(1).join(" ")}</span>
          </h1>
          <p className="mt-5 text-muted-foreground text-base max-w-md">
            {t("allStadionsSub")}
          </p>
        </div>
      </div>

      {/* Filter + Results */}
      <main className="bg-background">
        {/* Filters */}
        <div className="border-b border-border/60 bg-muted/30">
          <div className="container">
            <SearchFilters
              key={filterKey}
              value={filters}
              onChange={setFilters}
              onReset={() => { setFilters(initialFilters); setFilterKey(k => k + 1); }}
            />
          </div>
        </div>

        <div className="container py-10 sm:py-14">
          <Tabs defaultValue="list">
            <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
              <div>
                {loading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-muted-foreground">{t("search")}…</span>
                  </div>
                ) : (
                  <>
                    <h2 className="font-display text-4xl sm:text-5xl text-secondary">
                      {filtered.length} <span className="text-primary">{t("results")}</span>
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {filters.district === "all" ? t("allDistricts") : filters.district}
                      {filters.fromHour !== "any" &&
                        ` · ${filters.fromHour.padStart(2,"0")}:00${filters.toHour !== "any" ? `–${filters.toHour.padStart(2,"0")}:00` : ""}`}
                    </p>
                  </>
                )}
              </div>
              <TabsList className="bg-muted/70 border border-border/60 rounded-xl">
                <TabsTrigger value="list" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg">
                  <ListIcon className="h-4 w-4 mr-1.5" /> {t("list")}
                </TabsTrigger>
                <TabsTrigger value="map" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg">
                  <MapIcon className="h-4 w-4 mr-1.5" /> {t("map")}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="list" className="mt-0">
              {loading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="rounded-3xl bg-muted/40 border border-border/40 animate-pulse" style={{ aspectRatio: "4/3" }} />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-28">
                  <div className="text-7xl mb-5">⚽</div>
                  <p className="text-muted-foreground text-lg mb-5">{t("noResults")}</p>
                  <Button variant="outline" onClick={() => setFilters(initialFilters)}>
                    Filtrlarni tozalash
                  </Button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filtered.map((s, i) => (
                    <StadiumCard key={s.id} stadium={s} availableSlot={firstAvailableSlot(s.id)} index={i} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="map" className="mt-0">
              <StadiumMap stadiums={filtered} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Stadiums;
