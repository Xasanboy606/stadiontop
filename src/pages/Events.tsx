import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { api, EventRow } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUZS } from "@/data/stadiums";
import { Trophy, Calendar, MapPin, Users, Tv, Minus, Plus, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useT, useI18n } from "@/lib/i18n";

const Events = () => {
  const { user } = useAuth();
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = user ? await api.events.listAuth() : await api.events.list();
      setEvents(data);
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const handleBook = async (eventId: string, seats: number) => {
    if (!user) { toast.error(t("loginToBook")); return; }
    try {
      const res = await api.events.book(eventId, seats);
      toast.success(`✅ ${seats} ${t("seatsBooked")} — ${formatUZS(res.total)}`);
      setEvents(prev => prev.map(e =>
        e.id === eventId ? { ...res.event, my_seats: res.seats } : e
      ));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-secondary text-primary-foreground">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 20% 30%, hsl(var(--primary)/0.6), transparent 50%), radial-gradient(circle at 80% 70%, hsl(var(--accent)/0.4), transparent 50%)" }} />
        <div className="container relative py-12 sm:py-16">
          <Badge className="bg-accent text-accent-foreground border-0 mb-4">
            <Tv className="h-3 w-3 mr-1" /> {t("eventsBadge")}
          </Badge>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wide flex items-center gap-3">
            <Trophy className="h-12 w-12 text-accent" />
            {t("eventsTitle")}
          </h1>
          <p className="text-primary-foreground/80 mt-3 max-w-xl">
            {t("eventsSub")}
          </p>
        </div>
      </section>

      {/* Events grid */}
      <section className="container py-10">
        <h2 className="font-display text-3xl text-secondary mb-6">{t("upcomingEvents")}</h2>

        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
            {t("noEvents")}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {events.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                isLoggedIn={!!user}
                lang={lang}
                onBook={(seats) => handleBook(ev.id, seats)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const EventCard = ({
  event, isLoggedIn, onBook, lang,
}: {
  event: EventRow;
  isLoggedIn: boolean;
  lang: "uz" | "ru";
  onBook: (seats: number) => void;
}) => {
  const t = useT();
  const [seats, setSeats] = useState(2);
  const [busy, setBusy] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = !!event.image_url && !imgFailed;

  const mySeats = event.my_seats ?? 0;
  const remaining = event.capacity - event.taken;
  const fillPct = Math.min(100, Math.round((event.taken / event.capacity) * 100));
  const dt = new Date(event.event_date);

  const locale = lang === "ru" ? "ru-RU" : "uz-UZ";

  const handleBook = async () => {
    setBusy(true);
    try { onBook(seats); } finally { setBusy(false); }
  };

  return (
    <article className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft hover:shadow-glow transition-smooth">
      {/* Banner */}
      <div className={cn("relative overflow-hidden h-52", !showImg && `bg-gradient-to-br ${event.accent}`)}>
        {showImg ? (
          <>
            <div
              className="absolute inset-0 scale-110"
              style={{
                backgroundImage: `url(${event.image_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(14px) brightness(0.55) saturate(1.3)",
              }}
            />
            <img
              src={event.image_url!}
              alt={event.title}
              className="relative z-10 w-full h-full object-contain drop-shadow-lg"
              onError={() => setImgFailed(true)}
            />
          </>
        ) : (
          <div className="h-full grid place-items-center text-7xl opacity-90">{event.emoji}</div>
        )}
        <Badge className="absolute top-3 left-3 z-20 bg-secondary/90 text-primary-foreground border-0 backdrop-blur">
          {event.league}
        </Badge>
        {mySeats > 0 && (
          <Badge className="absolute top-3 right-3 z-20 bg-primary text-primary-foreground border-0 shadow-glow">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {mySeats} {t("seatsLabel")}
          </Badge>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-display text-2xl text-secondary leading-tight">{event.title}</h3>
        <div className="text-sm text-muted-foreground mt-0.5">
          {event.home_team} <span className="text-primary font-bold">VS</span> {event.away_team}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            {dt.toLocaleDateString(locale, { day: "2-digit", month: "short" })}
            {" · "}
            {dt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            {event.district}
          </div>
        </div>
        <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
          <Tv className="h-3.5 w-3.5" /> {event.venue}
        </div>

        {/* Capacity bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {event.taken} / {event.capacity}
            </span>
            <span className="font-semibold text-primary">{remaining} {t("freeSeats")}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-primary transition-all" style={{ width: `${fillPct}%` }} />
          </div>
        </div>

        {/* Seat picker + book */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            <Button size="icon" variant="ghost" className="h-8 w-8"
              disabled={seats <= 1}
              onClick={() => setSeats(s => Math.max(1, s - 1))}>
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="w-8 text-center font-display text-lg text-secondary">{seats}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8"
              disabled={seats >= Math.min(10, remaining)}
              onClick={() => setSeats(s => s + 1)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {formatUZS(event.price_per_seat)} {t("perSeat")}
            </div>
            <div className="font-display text-2xl text-primary leading-none">
              {formatUZS(seats * event.price_per_seat)}
            </div>
          </div>
        </div>

        <Button
          onClick={handleBook}
          disabled={remaining <= 0 || busy || !isLoggedIn}
          className="w-full mt-4 h-11 bg-gradient-primary hover:opacity-95 shadow-glow font-semibold"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> :
           remaining <= 0 ? t("soldOut") :
           !isLoggedIn ? t("loginRequired") :
           t("bookSeat")}
        </Button>
      </div>
    </article>
  );
};

export default Events;
