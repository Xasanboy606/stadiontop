import { Link } from "react-router-dom";
import { Star, MapPin, Clock, ArrowRight, Zap, Shield, Navigation } from "lucide-react";
import type { Stadium } from "@/data/stadiums";
import { FACILITY_LABELS, formatUZS } from "@/data/stadiums";
import { useI18n, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='560'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23134e22'/%3E%3Cstop offset='1' stop-color='%2316a34a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='900' height='560' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='0.3em' font-size='90' fill='rgba(255,255,255,0.12)'%3E%E2%9A%BD%3C/text%3E%3C/svg%3E";

export const StadiumCard = ({
  stadium,
  availableSlot,
  index = 0,
  compact = false,
}: {
  stadium: Stadium;
  availableSlot?: number;
  index?: number;
  compact?: boolean;
}) => {
  const t = useT();
  const lang = useI18n((s) => s.lang);

  const staggerDelay = Math.min(index * 80, 480);

  return (
    <Link
      to={`/stadium/${stadium.id}`}
      className="group relative rounded-2xl overflow-hidden bg-card border border-border/50 shadow-sm flex flex-col card-hover"
      style={{ animationDelay: `${staggerDelay}ms` }}
    >
      {/* Image */}
      <div className={cn("relative overflow-hidden", compact ? "h-36" : "")} style={compact ? undefined : { aspectRatio: "16/10" }}>
        <img
          src={stadium.images[0]}
          alt={stadium.name}
          loading="lazy"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK; }}
          className="h-full w-full object-cover group-hover:scale-[1.08] transition-transform duration-700 ease-out"
        />

        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* Hover color overlay */}
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/15 transition-colors duration-500" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <span className="bg-secondary/85 backdrop-blur-md text-secondary-foreground text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-inner-glow">
            {stadium.size}
          </span>
          <span className="bg-black/45 backdrop-blur-md border border-white/15 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {stadium.rating.toFixed(1)}
          </span>
        </div>

        {/* Available slot */}
        {availableSlot !== undefined && (
          <div className="absolute bottom-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-glow animate-pulse-glow">
            <Clock className="h-3 w-3" />
            {String(availableSlot).padStart(2, "0")}:00 {t("available")}
          </div>
        )}

        {/* Price */}
        <div className="absolute bottom-3 right-3 text-right">
          <div className="font-display text-xl text-white leading-none drop-shadow-lg">
            {formatUZS(stadium.pricePerHourDay)}
          </div>
          <div className="text-[10px] text-white/60">{t("perHour")}</div>
        </div>

        {/* Hover CTA */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="bg-white/12 backdrop-blur-md border border-white/25 rounded-2xl px-5 py-2.5 flex items-center gap-2 text-white font-semibold text-sm translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-lg">
            {t("bookBtn")} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={cn("flex flex-col flex-1", compact ? "p-3 gap-1.5" : "p-4 gap-3")}>
        <div>
          <h3 className={cn(
            "font-display tracking-wide leading-tight transition-colors duration-200 text-secondary group-hover:text-primary",
            compact ? "text-[0.9rem]" : "text-[1.35rem]"
          )}>
            {stadium.name}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
            <MapPin className="h-3 w-3 shrink-0 text-primary/60" />
            <span className="truncate">{stadium.district} · {stadium.address.slice(0, compact ? 22 : 28)}{stadium.address.length > (compact ? 22 : 28) ? "…" : ""}</span>
            <a
              href={`https://yandex.com/maps/?pt=${stadium.lng},${stadium.lat}&z=17&l=map`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-primary/8 text-primary/80 border border-primary/15 hover:bg-primary/20 transition-colors text-[10px] font-semibold"
            >
              <Navigation className="h-2.5 w-2.5" /> {t("getDirections")}
            </a>
          </div>
        </div>

        {/* Facilities — hidden in compact mode */}
        {!compact && stadium.facilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {stadium.facilities.slice(0, 3).map((f) => (
              <span key={f}
                className="text-[11px] px-2 py-0.5 rounded-lg bg-primary/8 text-primary/80 border border-primary/12 font-medium">
                {FACILITY_LABELS[f][lang]}
              </span>
            ))}
            {stadium.facilities.length > 3 && (
              <span className="text-[11px] px-2 py-0.5 rounded-lg bg-muted text-muted-foreground">
                +{stadium.facilities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className={cn("mt-auto flex items-center justify-between", compact ? "pt-1.5 border-t border-border/40" : "pt-3 border-t border-border/50")}>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-secondary">{stadium.rating.toFixed(1)}</span>
            {!compact && <span>· {stadium.reviews} {t("reviews")}</span>}
          </div>
          {!compact && (
            <div className="flex items-center gap-1.5">
              {stadium.addons.referee && (
                <span className="flex items-center gap-1 text-[11px] text-primary font-semibold bg-primary/8 px-2 py-0.5 rounded-lg">
                  <Shield className="h-3 w-3" /> {t("referee")}
                </span>
              )}
              {stadium.addons.video && (
                <span className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-lg">
                  <Zap className="h-3 w-3" /> Video
                </span>
              )}
            </div>
          )}
          {compact && (
            <span className="text-[10px] text-muted-foreground">{stadium.district}</span>
          )}
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
    </Link>
  );
};
