import { useEffect, useState, useCallback } from "react";
import { api, StadiumRow } from "@/lib/api";
import { type Stadium, type District, type Facility } from "@/data/stadiums";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isDbStadium = (id: string) => UUID_RE.test(id);

const mapDbToStadium = (row: StadiumRow): Stadium => ({
  id: row.id,
  name: row.name,
  district: row.district as District,
  address: row.address,
  lat: Number(row.lat ?? 41.31),
  lng: Number(row.lng ?? 69.27),
  images: (row.images && row.images.length ? row.images : ["/placeholder.svg"]),
  rating: Number(row.rating ?? 5),
  reviews: row.reviews ?? 0,
  pricePerHourDay: row.price_day,
  pricePerHourNight: row.price_night,
  facilities: (row.facilities ?? []) as Facility[],
  size: (row.size ?? "5x5") as Stadium["size"],
  description: row.description ?? "",
  bookedToday: [],
  addons: {
    referee: !!row.has_referee,
    video: !!row.has_video,
    balls: !!row.has_balls,
    bibs: !!row.has_bibs,
  },
});

export function useStadiums() {
  const [dbStadiums, setDbStadiums] = useState<Stadium[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const data = await api.stadiums.list();
      setDbStadiums(data.map(mapDbToStadium));
    } catch {
      // keep empty on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return {
    stadiums: dbStadiums,
    dbStadiums,
    loading,
    reload,
  };
}

/** Returns { [stadiumId]: number[] } of booked hours for the given date from the real DB. */
export function useBookedHours(date: string): Record<string, number[]> {
  const [map, setMap] = useState<Record<string, number[]>>({});

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    api.stadiums.bookedHours(date)
      .then(data => { if (!cancelled) setMap(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [date]);

  return map;
}

export async function fetchStadiumById(id: string): Promise<Stadium | null> {
  try {
    const data = await api.stadiums.get(id);
    return mapDbToStadium(data);
  } catch {
    return null;
  }
}
