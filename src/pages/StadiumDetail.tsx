import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { SlotGrid } from "@/components/SlotGrid";
import { ReviewForm } from "@/components/ReviewForm";
import { ReviewList } from "@/components/ReviewList";
import { FACILITY_LABELS, formatUZS, type Stadium } from "@/data/stadiums";
import { fetchStadiumById, isDbStadium } from "@/hooks/useStadiums";
import { useBookingStore } from "@/lib/store";
import { useI18n, useT } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MapPin, Star, Users, Clock, MessageSquare, Navigation } from "lucide-react";


const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='560'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23134e22'/%3E%3Cstop offset='1' stop-color='%2316a34a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='900' height='560' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='0.3em' font-size='90' fill='rgba(255,255,255,0.15)'%3E%E2%9A%BD%3C/text%3E%3C/svg%3E";

const today = () => new Date().toISOString().slice(0, 10);
const maxDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
};
/** Daytime 06:00-12:00 → up to 3h; evening/night → up to 2h. Min always 1h. */
const durationCapForHour = (hour: number) => (hour >= 6 && hour < 12 ? 3 : 2);

const ADDONS = [
  { id: "referee", price: 150000, key: "referee" as const },
  { id: "video",   price: 200000, key: "video"   as const },
  { id: "balls",   price: 50000,  key: "balls"   as const },
  { id: "bibs",    price: 30000,  key: "bibs"    as const },
];

const StadiumDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const [stadium, setStadium] = useState<Stadium | null>(null);
  useEffect(() => {
    if (!id) return;
    fetchStadiumById(id).then(setStadium);
  }, [id]);

  const { user } = useAuth();
  const [date, setDate] = useState(today());
  const [hour, setHour] = useState<number | null>(null);
  const [hours, setHours] = useState(1);
  const [addons, setAddons] = useState<string[]>([]);
  const [userBookingId, setUserBookingId] = useState<string | null>(null);
  const [reviewRefresh, setReviewRefresh] = useState(0);
  const [dbBookedHours, setDbBookedHours] = useState<Set<number>>(new Set());
  const { effectivePrice, effectiveAddons } = useBookingStore();

  const dbMaxAvailableFrom = (startHour: number): number => {
    let n = 0;
    for (let h = startHour; h < 24; h++) {
      if (dbBookedHours.has(h)) break;
      n++;
    }
    return n;
  };

  // Fetch user's booking id for this stadium (for review eligibility)
  useEffect(() => {
    if (!user || !id || !isDbStadium(id)) return;
    api.bookings.list().then((list) => {
      const match = list.find((b) => b.stadium_id === id && b.status === "confirmed");
      setUserBookingId(match?.id ?? null);
    }).catch(() => {});
  }, [user, id]);

  // Fetch real booked slots from backend
  useEffect(() => {
    if (!id || !isDbStadium(id)) return;
    api.stadiums.slots(id, date).then((slots) => {
      const booked = new Set<number>();
      slots.forEach((s) => {
        for (let h = s.hour; h < s.hour + s.duration; h++) booked.add(h);
      });
      setDbBookedHours(booked);
    }).catch(() => {});
  }, [id, date]);

  // Allowed durations for the currently selected start hour
  const allowedDurations = useMemo(() => {
    if (!stadium || hour === null) return [1];
    const cap = Math.min(durationCapForHour(hour), dbMaxAvailableFrom(hour));
    return Array.from({ length: Math.max(cap, 1) }, (_, i) => i + 1);
  }, [hour, stadium, date, dbBookedHours]);

  // Clamp hours when start hour or availability changes
  useMemo(() => {
    if (hours > allowedDurations[allowedDurations.length - 1]) {
      setHours(allowedDurations[allowedDurations.length - 1]);
    }
  }, [allowedDurations, hours]);

  const availableAddons = stadium ? effectiveAddons(stadium) : null;

  const basePrice = useMemo(() => {
    if (!stadium || hour === null) return 0;
    let total = 0;
    for (let h = hour; h < hour + hours; h++) total += effectivePrice(stadium, h);
    return total;
  }, [hour, hours, stadium, effectivePrice]);

  if (!stadium) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container py-20 text-center">Not found</div>
      </div>
    );
  }

  const addonPrice = addons.reduce(
    (acc, id) => acc + (ADDONS.find((a) => a.id === id)?.price ?? 0),
    0
  );
  const total = basePrice + addonPrice;

  const confirm = (paid: "deposit" | "full") => {
    if (hour === null) return;
    navigate("/checkout", {
      state: {
        stadiumId: stadium.id,
        date,
        hour,
        hours,
        basePrice,
        addonsPrice: addonPrice,
        addons,
        paid,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 sm:py-10">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> {t("back")}
        </Button>

        {/* Gallery */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <img
            src={stadium.images[0]}
            alt={stadium.name}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
            className="rounded-2xl aspect-[16/10] object-cover sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:h-full shadow-soft"
            width={1280}
            height={896}
          />
          {stadium.images.slice(1, 3).map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              loading="lazy"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
              className="rounded-2xl aspect-[16/10] object-cover shadow-soft"
            />
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Info */}
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="font-display text-5xl text-secondary">{stadium.name}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-muted-foreground text-sm">
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{stadium.address}</span>
                    <span className="flex items-center gap-1"><Users className="h-4 w-4" />{stadium.size}</span>
                    <a
                      href={`https://yandex.com/maps/?pt=${stadium.lng},${stadium.lat}&z=17&l=map`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/10 text-primary border border-primary/25 font-semibold hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                    >
                      <Navigation className="h-3.5 w-3.5" /> {t("getDirections")}
                    </a>
                  </div>
                </div>
                <Badge className="bg-accent text-accent-foreground border-0 text-base px-3 py-1">
                  <Star className="h-4 w-4 mr-1 fill-current" />
                  {stadium.rating.toFixed(1)} · {stadium.reviews} {t("reviews")}
                </Badge>
              </div>
              <p className="mt-4 text-foreground/80 leading-relaxed">{stadium.description}</p>
            </div>

            {/* Facilities */}
            <div>
              <h2 className="font-display text-2xl text-secondary mb-3">{t("facilities")}</h2>
              <div className="flex flex-wrap gap-2">
                {stadium.facilities.map((f) => (
                  <span
                    key={f}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium border border-primary/20"
                  >
                    {FACILITY_LABELS[f][lang]}
                  </span>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-display text-2xl text-secondary flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  {t("schedule")}
                </h2>
                <div className="flex flex-col items-end gap-1">
                  <Input
                    type="date"
                    value={date}
                    min={today()}
                    max={maxDate()}
                    onChange={(e) => { setDate(e.target.value); setHour(null); setHours(1); }}
                    className="w-auto h-10"
                  />
                  <span className="text-[10px] text-muted-foreground">{t("bookingWindowNote")}</span>
                </div>
              </div>
              <SlotGrid
                stadium={stadium}
                date={date}
                selected={hour !== null ? { hour, hours } : undefined}
                onSelect={(h) => setHour(h)}
                dbBookedHours={dbBookedHours}
              />
            </div>

            {/* Reviews */}
            <div>
              <h2 className="font-display text-2xl text-secondary mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Sharhlar
              </h2>
              <ReviewList stadiumId={stadium.id} refreshKey={reviewRefresh} />
              {user && isDbStadium(stadium.id) && (
                <div className="mt-4">
                  <ReviewForm
                    stadiumId={stadium.id}
                    bookingId={userBookingId ?? undefined}
                    onDone={() => setReviewRefresh((r) => r + 1)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Booking sidebar */}
          <aside className="lg:sticky lg:top-24 self-start rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">{t("perHour")}</span>
              <span className="font-display text-3xl text-primary">
                {formatUZS(effectivePrice(stadium, hour ?? 12))}
              </span>
            </div>

            {hour === null ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                ⚽ {t("schedule")} → vaqtni tanlang
              </div>
            ) : (
              <>
                <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-primary/80">
                    {date}
                  </div>
                  <div className="font-display text-2xl text-primary">
                    {String(hour).padStart(2, "0")}:00 — {String(hour + hours).padStart(2, "0")}:00
                  </div>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">{t("duration")}:</span>
                    {[1, 2, 3].map((h) => {
                      const enabled = allowedDurations.includes(h);
                      return (
                        <Button
                          key={h}
                          size="sm"
                          variant={hours === h ? "default" : "outline"}
                          disabled={!enabled}
                          onClick={() => enabled && setHours(h)}
                          className={hours === h ? "bg-primary" : ""}
                          title={!enabled ? t("unavailableDuration") : undefined}
                        >
                          {h}h
                        </Button>
                      );
                    })}
                  </div>
                  {allowedDurations.length < (durationCapForHour(hour) ) && (
                    <p className="mt-2 text-[11px] text-destructive">
                      {t("unavailableDuration")}
                    </p>
                  )}
                </div>

                {(() => {
                  const visible = ADDONS.filter(
                    (a) => availableAddons?.[a.id as keyof typeof availableAddons]
                  );
                  if (visible.length === 0) return null;
                  return (
                    <div>
                      <div className="text-sm font-semibold mb-2">{t("addons")}</div>
                      <div className="space-y-2">
                        {visible.map((a) => (
                          <label key={a.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={addons.includes(a.id)}
                                onCheckedChange={(v) =>
                                  setAddons((prev) =>
                                    v ? [...prev, a.id] : prev.filter((x) => x !== a.id)
                                  )
                                }
                              />
                              <span className="text-sm">{t(a.key)}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">+{formatUZS(a.price)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="border-t border-border pt-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("total")}</span>
                  <span className="font-display text-3xl text-secondary">{formatUZS(total)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => confirm("deposit")}
                    className="border-accent text-accent hover:bg-accent/10"
                  >
                    {t("deposit")}
                  </Button>
                  <Button
                    onClick={() => confirm("full")}
                    className="bg-gradient-primary hover:opacity-95 shadow-glow"
                  >
                    {t("payFull")}
                  </Button>
                </div>
              </>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
};

export default StadiumDetail;
