import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import type { Stadium } from "@/data/stadiums";
import { formatUZS } from "@/data/stadiums";
import { Navigation } from "lucide-react";
import { useT } from "@/lib/i18n";

// Custom emerald pin
const makePinIcon = (color = "hsl(152 72% 32%)") =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:36px;height:36px;border-radius:50% 50% 50% 0;
      background:linear-gradient(135deg,${color},hsl(150 70% 45%));
      transform:rotate(-45deg);
      box-shadow:0 4px 14px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;
      border:2.5px solid white;
    "><span style="transform:rotate(45deg);color:white;font-size:15px;">⚽</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -32],
  });

const pinIcon = makePinIcon();

/* ── Jitter identical coords so pins don't stack ── */
const jittered = (stadiums: Stadium[]): [number, number][] => {
  const seen: Record<string, number> = {};
  return stadiums.map((s) => {
    const key = `${s.lat.toFixed(5)}_${s.lng.toFixed(5)}`;
    const n = seen[key] ?? 0;
    seen[key] = n + 1;
    if (n === 0) return [s.lat, s.lng];
    const angle = (n / 6) * 2 * Math.PI;
    const r = 0.0007 * Math.ceil(n / 6);
    return [s.lat + Math.cos(angle) * r, s.lng + Math.sin(angle) * r];
  });
};

/* ── Auto-fit bounds when filtered list changes ── */
const MapFitter = ({ stadiums }: { stadiums: Stadium[] }) => {
  const map = useMap();
  const prevLen = useRef(-1);

  useEffect(() => {
    if (stadiums.length === 0) return;
    if (stadiums.length === prevLen.current) return;
    prevLen.current = stadiums.length;

    if (stadiums.length === 1) {
      map.setView([stadiums[0].lat, stadiums[0].lng], 16, { animate: true });
      return;
    }

    const coords = stadiums.map((s) => [s.lat, s.lng] as [number, number]);
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true });
  }, [stadiums]);

  return null;
};

export const StadiumMap = ({ stadiums }: { stadiums: Stadium[] }) => {
  const t = useT();
  const positions = jittered(stadiums);

  return (
    <div className="h-[600px] rounded-2xl overflow-hidden border border-border shadow-soft">
      <MapContainer
        center={[41.2995, 69.2401]}
        zoom={11}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapFitter stadiums={stadiums} />

        {stadiums.map((s, i) => (
          <Marker key={s.id} position={positions[i]} icon={pinIcon}>
            <Popup minWidth={200}>
              <div className="space-y-1.5 py-1">
                <div className="font-bold text-base leading-tight">{s.name}</div>
                <div className="text-xs text-gray-500">{s.district} · {s.address}</div>
                <div className="text-sm font-bold text-green-700">
                  {formatUZS(s.pricePerHourDay)}/soat
                </div>
                <div className="flex gap-2 pt-1">
                  <Link
                    to={`/stadium/${s.id}`}
                    className="flex-1 text-center text-xs font-semibold bg-green-700 text-white rounded-lg px-2 py-1.5 hover:bg-green-800 transition-colors"
                  >
                    Bron qilish →
                  </Link>
                  <a
                    href={`https://yandex.com/maps/?pt=${s.lng},${s.lat}&z=17&l=map`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold border border-green-700 text-green-700 rounded-lg px-2 py-1.5 hover:bg-green-50 transition-colors"
                  >
                    <Navigation className="h-3 w-3" /> {t("getDirections")}
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
