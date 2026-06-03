import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { SearchFilters, type FilterState } from "@/components/SearchFilters";
import { StadiumCard } from "@/components/StadiumCard";
import { StadiumMap } from "@/components/StadiumMap";
import { useStadiums, useBookedHours } from "@/hooks/useStadiums";
import { useT } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ListIcon, MapIcon, Search, CalendarCheck, Zap, Star,
  MapPin, Phone, Camera, Send, Goal, ArrowRight, Shield, Users,
  Building2, TrendingUp, CheckCircle2, Clock, BarChart3,
  ChevronRight, Sparkles, Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useSettingsStore, DEFAULT_SETTINGS } from "@/hooks/useSiteSettings";
import { cn } from "@/lib/utils";

/* ─── useInView ─── */
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

/* ─── useCountUp ─── */
function useCountUp(target: number, duration = 1600, enabled = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const startTime = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const frame = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      setCount(Math.round(ease(p) * target));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [target, duration, enabled]);
  return count;
}

const today = () => new Date().toISOString().slice(0, 10);
const initialFilters: FilterState = {
  query: "", district: "all", fromHour: "any", toHour: "any",
  date: today(), sort: "rating",
};

const HOW_IT_WORKS_ICONS = [
  <Search className="h-6 w-6" />,
  <CalendarCheck className="h-6 w-6" />,
  <Zap className="h-6 w-6" />,
];

const OWNER_BENEFITS_ICONS = [
  <BarChart3 className="h-4 w-4" />,
  <CalendarCheck className="h-4 w-4" />,
  <Shield className="h-4 w-4" />,
  <Users className="h-4 w-4" />,
  <Zap className="h-4 w-4" />,
  <TrendingUp className="h-4 w-4" />,
];

const TESTI_COLORS = ["bg-emerald-500", "bg-violet-500", "bg-amber-500"];

/* ─── Animated stat counter ─── */
const StatCounter = ({
  value, suffix, label, icon, color, enabled, decimal,
}: {
  value: number; suffix: string; label: string; icon: React.ReactNode;
  color: string; enabled: boolean; decimal?: boolean;
}) => {
  const count = useCountUp(value, 1800, enabled);
  const display = decimal
    ? (count / 10).toFixed(1)
    : value >= 1000
      ? count >= 1000 ? `${Math.floor(count / 1000)} ${String(count % 1000).padStart(3, "0")}` : String(count)
      : String(count);
  return (
    <div className="flex flex-col items-center text-center px-6 py-5">
      <div className={cn("h-10 w-10 rounded-2xl grid place-items-center mb-3 text-white shadow-lg", color)}>
        {icon}
      </div>
      <div className="font-display text-3xl sm:text-4xl text-foreground leading-none tabular-nums">
        {display}{suffix}
      </div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-widest mt-1.5 font-medium">{label}</div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
const Index = () => {
  const t = useT();
  const settings = useSettingsStore((s) => s.settings);
  const lang = useI18n((s) => s.lang);

  const sec = settings?.sections ?? DEFAULT_SETTINGS.sections;
  const testimonials = settings?.testimonials ?? DEFAULT_SETTINGS.testimonials ?? [];

  const HOW_IT_WORKS = (settings?.howItWorks ?? DEFAULT_SETTINGS.howItWorks ?? []).map((step, i) => ({
    ...step,
    icon: HOW_IT_WORKS_ICONS[i] ?? HOW_IT_WORKS_ICONS[0],
  }));

  const OWNER_BENEFITS = (settings?.ownerBenefits ?? DEFAULT_SETTINGS.ownerBenefits ?? []).map((b, i) => ({
    ...b,
    icon: OWNER_BENEFITS_ICONS[i % OWNER_BENEFITS_ICONS.length],
  }));

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { stadiums } = useStadiums();
  const bookedHours = useBookedHours(filters.date);

  const [statsRef,  statsInView]  = useInView(0.3);
  const [howRef,    howInView]    = useInView(0.1);
  const [testiRef,  testiInView]  = useInView(0.1);
  const [ownerRef,  ownerInView]  = useInView(0.1);

  const isSlotBooked = (stadiumId: string, h: number) =>
    (bookedHours[stadiumId] ?? []).includes(h);

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    let out = stadiums.filter((s) => {
      if (q && !`${s.name} ${s.district} ${s.address}`.toLowerCase().includes(q)) return false;
      if (filters.district !== "all" && s.district !== filters.district) return false;
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
  }, [filters, bookedHours, stadiums]);

  const firstAvailableSlot = (stadiumId: string): number | undefined => {
    for (let h = 8; h < 23; h++) {
      if (!isSlotBooked(stadiumId, h)) return h;
    }
    return undefined;
  };

  const scrollToResults = () =>
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      {/* ═══ SECTION 1 · Hero (100vh) ═══ */}
      <Hero onSearch={scrollToResults} />

      {/* ═══ SECTION 2 · Animated Stats Bar ═══ */}
      {sec.statsBar !== false && (
      <section ref={statsRef} className="bg-surface border-y border-border/60">
        <div className="container">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border/60">
            <StatCounter value={100}   suffix="+"  label="Tasdiqlangan stadion"  icon={<Building2 className="h-4 w-4" />}     color="bg-emerald-600" enabled={statsInView} />
            <StatCounter value={10000} suffix="+"  label="Muvaffaqiyatli bron"   icon={<CalendarCheck className="h-4 w-4" />} color="bg-violet-600"  enabled={statsInView} />
            <StatCounter value={49}    suffix="/5" label="O'rtacha reyting"      icon={<Star className="h-4 w-4" />}          color="bg-amber-500"   enabled={statsInView} decimal />
            <StatCounter value={5000}  suffix="+"  label="Faol foydalanuvchi"    icon={<Users className="h-4 w-4" />}         color="bg-sky-600"     enabled={statsInView} />
          </div>
        </div>
      </section>
      )}

      {/* ═══ SECTION 3 · Search + Stadium Grid ═══ */}
      <section ref={resultsRef} className="bg-background scroll-mt-0">
        <div className="container py-8 sm:py-10">

          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Live — {t("todayLive")}
            </div>
            <div className="h-px flex-1 bg-border/60" />
          </div>

          <SearchFilters
            value={filters}
            onChange={setFilters}
            onReset={() => setFilters(initialFilters)}
            className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-soft relative z-20 mb-6"
          />

          <Tabs defaultValue="list">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl text-secondary">
                  {filtered.length} <span className="text-primary">{t("results")}</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  {filters.district === "all" ? t("allDistricts") : filters.district}
                  {filters.fromHour !== "any" && (
                    <>
                      <span className="text-border">·</span>
                      <Clock className="h-3 w-3" />
                      {filters.fromHour.padStart(2,"0")}:00{filters.toHour !== "any" ? `–${filters.toHour.padStart(2,"0")}:00` : ""}
                    </>
                  )}
                </p>
              </div>
              <TabsList className="bg-muted/70 border border-border/60 rounded-xl h-9">
                <TabsTrigger value="list" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-xs gap-1.5">
                  <ListIcon className="h-3.5 w-3.5" /> {t("list")}
                </TabsTrigger>
                <TabsTrigger value="map" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-xs gap-1.5">
                  <MapIcon className="h-3.5 w-3.5" /> {t("map")}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="list" className="mt-0">
              {filtered.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-border/60 rounded-3xl">
                  <div className="text-5xl mb-4">⚽</div>
                  <p className="text-muted-foreground font-medium">{t("noResults")}</p>
                  <p className="text-sm text-muted-foreground/60 mt-1 mb-5">{t("noResultsHint")}</p>
                  <Button variant="outline" size="sm" onClick={() => setFilters(initialFilters)} className="rounded-xl">
                    {t("filterReset")}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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

          {filtered.length > 0 && (
            <div className="mt-8 text-center">
              <Button asChild variant="outline" className="rounded-2xl px-8 h-11 gap-2 border-border/70 hover:border-primary/40 hover:text-primary transition-all duration-200">
                <Link to="/stadiums">
                  {t("viewAll")} <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ═══ SECTION 4 · How It Works ═══ */}
      {sec.howItWorks !== false && (
      <section className="bg-surface border-y border-border/40">
        <div ref={howRef} className="container py-20 sm:py-28">

          <div className={cn("text-center mb-16 reveal", howInView && "visible")}>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary border border-primary/20 bg-primary/8 rounded-full px-4 py-1.5 mb-5">
              <Sparkles className="h-3 w-3" /> {t("howItWorksLabel")}
            </div>
            <h2 className="font-display text-5xl sm:text-[64px] text-foreground leading-[0.9] mb-4">
              {t("howItWorksTitle1")}<br /><span className="text-gradient">{t("howItWorksTitle2")}</span>
            </h2>
            <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
              {t("howItWorksDesc")}
            </p>
          </div>

          {/* Steps */}
          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 relative">
            {/* Connector line */}
            <div className="hidden sm:block absolute top-[52px] left-[calc(16.7%+1.5rem)] right-[calc(16.7%+1.5rem)] h-px">
              <div className="w-full h-px bg-gradient-to-r from-primary/30 via-primary/60 to-primary/30" />
            </div>

            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} className={cn("reveal", `delay-${(i + 1) * 75}`, howInView && "visible")}>
                <div className="group relative flex flex-col items-center text-center p-7 rounded-3xl bg-background border border-border/60 hover:border-primary/30 hover:shadow-[0_8px_30px_-10px_hsl(152_72%_32%/0.15)] transition-all duration-400 overflow-hidden card-hover">
                  {/* Step badge */}
                  <div className="relative z-10 flex items-center justify-center h-[52px] w-[52px] rounded-2xl border mb-5 group-hover:scale-110 transition-transform duration-300"
                    style={{ background: `${step.accent}15`, borderColor: `${step.accent}30` }}>
                    <span className="font-display text-2xl" style={{ color: step.accent }}>{step.step}</span>
                  </div>

                  {/* Icon */}
                  <div className="relative z-10 h-14 w-14 rounded-2xl grid place-items-center mb-4 transition-all duration-300 group-hover:scale-105"
                    style={{ background: `${step.accent}12`, color: step.accent }}>
                    {step.icon}
                  </div>

                  <span className="relative z-10 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3 border"
                    style={{ color: step.accent, borderColor: `${step.accent}30`, background: `${step.accent}10` }}>
                    {step.tag}
                  </span>

                  <h3 className="relative z-10 font-display text-xl text-foreground mb-2">{step.title}</h3>
                  <p className="relative z-10 text-xs text-muted-foreground leading-relaxed">{step.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trust stats */}
          {sec.trustStats !== false && (
            <div className="mt-10 grid grid-cols-3 gap-3">
              {(settings?.stats ?? DEFAULT_SETTINGS.stats).slice(0, 3).map((s, i) => (
                <div key={i} className={cn("reveal", `delay-${(i + 1) * 75}`, howInView && "visible")}>
                  <div className="text-center py-5 px-4 rounded-2xl bg-background border border-border/60 hover:border-primary/25 transition-colors duration-200">
                    <div className="font-display text-3xl text-foreground leading-none">{s.value}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1.5">
                      {lang === "uz" ? s.label_uz : s.label_ru}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      {/* ═══ SECTION 5 · Testimonials ═══ */}
      {sec.testimonials !== false && testimonials.length > 0 && (
      <section className="bg-background border-b border-border/40 py-20 sm:py-28">
        <div ref={testiRef} className="container">

          <div className={cn("mb-12 reveal", testiInView && "visible")}>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary border border-primary/20 bg-primary/8 rounded-full px-4 py-1.5 mb-5">
              <Star className="h-3 w-3 fill-primary" /> {t("clientsLabel")}
            </div>
            <div className="flex items-end justify-between flex-wrap gap-4">
              <h2 className="font-display text-5xl sm:text-6xl text-secondary leading-[0.9]">
                {t("clientsQ")}<br /><span className="text-gradient">{t("clientsQ2")}</span>
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t("clientsProof")}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {testimonials.map((testi, i) => (
              <div key={testi.name} className={cn("reveal", i === 0 ? "delay-75" : i === 1 ? "delay-150" : "delay-225", testiInView && "visible")}>
                <div className="group h-full flex flex-col p-6 rounded-3xl bg-card border border-border/60 hover:border-primary/25 hover:shadow-[0_8px_40px_-12px_hsl(152_72%_32%/0.15)] transition-all duration-400 card-hover">
                  <Quote className="h-7 w-7 text-primary/25 mb-4 shrink-0" />
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground/75 leading-relaxed flex-1 mb-5">"{testi.quote}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                    <div className={cn("h-9 w-9 rounded-xl grid place-items-center text-xs font-bold text-white shrink-0", TESTI_COLORS[i % TESTI_COLORS.length])}>
                      {testi.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-secondary truncate">{testi.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{testi.role}</div>
                    </div>
                    <div className="ml-auto text-[11px] font-semibold text-primary/70 bg-primary/8 border border-primary/12 px-2 py-0.5 rounded-lg shrink-0">
                      {testi.bookings}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className={cn("mt-8 p-4 rounded-2xl bg-muted/50 border border-border/50 flex flex-wrap items-center justify-between gap-4 reveal delay-300", testiInView && "visible")}>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {["bg-emerald-500","bg-violet-500","bg-amber-500","bg-sky-500","bg-rose-500"].map((c, i) => (
                  <div key={i} className={cn("h-8 w-8 rounded-full border-2 border-background grid place-items-center text-[10px] font-bold text-white", c)}>
                    {["J","D","R","S","A"][i]}
                  </div>
                ))}
              </div>
              <div className="text-sm text-foreground/70">
                {t("socialProofCount")}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-600">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {t("avgRating")}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ═══ SECTION 6 · For Stadium Owners ═══ */}
      {sec.ctaBanner !== false && (
      <section className="bg-surface border-b border-border/40">
        <div ref={ownerRef} className="container py-20 sm:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* LEFT */}
            <div className={cn("reveal", ownerInView && "visible")}>
              <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary border border-primary/20 bg-primary/8 rounded-full px-4 py-1.5 mb-6">
                <Building2 className="h-3 w-3" /> {t("ownersLabel")}
              </div>
              <h2 className="font-display text-5xl sm:text-[60px] text-foreground leading-[0.88] mb-5">
                {(() => {
                  const title = lang === "uz"
                    ? (settings?.cta?.title_uz ?? "Stadioningizni\nbiz bilan boshqaring")
                    : (settings?.cta?.title_ru ?? "Управляйте\nстадионом с нами");
                  const [l1, l2] = title.split("\n");
                  return <>{l1}<br /><span className="text-gradient">{l2 ?? ""}</span></>;
                })()}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-md">
                {lang === "uz"
                  ? (settings?.cta?.subtitle_uz ?? "Onlayn bronlarni avtomatlashtiring, daromadingizni oshiring va vaqtingizni tejang.")
                  : (settings?.cta?.subtitle_ru ?? "Автоматизируйте онлайн-бронирования, увеличьте доход и сэкономьте время.")}
              </p>

              <ul className="space-y-2.5 mb-8">
                {OWNER_BENEFITS.map((b, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-foreground/70 hover:text-foreground transition-colors">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center text-primary shrink-0">
                      {b.icon}
                    </div>
                    {b.text}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-gradient-primary shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all duration-300 rounded-2xl px-8 h-12 font-semibold">
                  <Link to="/owner">{t("freeStart")} <ArrowRight className="h-4 w-4 ml-1" /></Link>
                </Button>
                <a href={settings?.cta?.telegramLink ?? "https://t.me/xmanydv"} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 h-12 rounded-2xl border border-border text-foreground/70 hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-sm font-medium">
                  <Send className="h-4 w-4" /> Telegram
                </a>
              </div>
            </div>

            {/* RIGHT: Mock dashboard */}
            <div className={cn("reveal delay-150", ownerInView && "visible")}>
              <div className="relative">
                <div className="absolute -inset-3 bg-primary/8 rounded-[2rem] blur-2xl" />
                <div className="relative rounded-3xl border border-border bg-card p-6 shadow-[0_8px_40px_-12px_hsl(152_72%_32%/0.15)]">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-widest">Bugungi daromad</div>
                      <div className="font-display text-3xl text-foreground mt-0.5">2 450 000 <span className="text-primary text-xl">so'm</span></div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-xl">
                      <TrendingUp className="h-3 w-3" /> +40%
                    </div>
                  </div>

                  {/* Bar chart */}
                  <div className="flex items-end gap-1.5 h-14 mb-5">
                    {[45,60,35,80,55,90,70,85,65,95,78,88].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm transition-all duration-300"
                        style={{
                          height: `${h}%`,
                          background: i === 11 ? "hsl(152 72% 45%)" : i >= 9 ? "hsl(152 72% 32% / 0.6)" : "hsl(var(--muted-foreground) / 0.2)",
                        }} />
                    ))}
                  </div>

                  {/* Booking list */}
                  <div className="space-y-2">
                    {[
                      { name: "Jasur J.", time: "10:00–11:00", status: "active", price: "280 000" },
                      { name: "Dilshod Y.", time: "12:00–13:00", status: "upcoming", price: "280 000" },
                      { name: "Rustam N.", time: "15:00–16:00", status: "upcoming", price: "350 000" },
                    ].map((b, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/50">
                        <div className={cn("h-2 w-2 rounded-full shrink-0", b.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30")} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-foreground/70 font-medium truncate">{b.name}</div>
                          <div className="text-[10px] text-muted-foreground">{b.time}</div>
                        </div>
                        <div className="text-xs text-primary font-semibold">{b.price}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> 7 ta bron bugun
                    </span>
                    <span>Ochiq: 08:00, 09:00, 14:00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ═══ FOOTER ═══ */}
      {sec.footer !== false && (
      <footer className="bg-surface-2 border-t border-border/60 text-muted-foreground">
        <div className="container py-14">
          <div className="grid sm:grid-cols-4 gap-10 pb-10 border-b border-border/60">

            <div className="sm:col-span-1">
              <Link to="/" className="flex items-center gap-2.5 mb-4 group w-fit">
                <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow group-hover:scale-105 transition-transform duration-200">
                  <Goal className="h-[18px] w-[18px] text-white" strokeWidth={2.5} />
                </div>
                <div className="leading-none">
                  <div className="font-display text-xl tracking-wide text-foreground">StadionTop</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("toshkent")}</div>
                </div>
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed mb-5 max-w-[200px]">{t("tagline")}</p>
              <div className="flex items-center gap-2">
                <a href="#" aria-label="Instagram" className="h-8 w-8 rounded-lg bg-muted/60 hover:bg-primary/15 hover:text-primary grid place-items-center transition-all duration-200">
                  <Camera className="h-3.5 w-3.5" />
                </a>
                <a href={settings?.contact?.telegram ?? "https://t.me/xmanydv"} target="_blank" rel="noopener noreferrer" aria-label="Telegram"
                  className="h-8 w-8 rounded-lg bg-muted/60 hover:bg-primary/15 hover:text-primary grid place-items-center transition-all duration-200">
                  <Send className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">{t("footerPages")}</div>
              <ul className="space-y-2.5 text-xs">
                {[
                  { href: "/", label: t("home") },
                  { href: "/stadiums", label: t("allStadiums") },
                  { href: "/events", label: t("events") },
                  { href: "/matchmaking", label: t("matchmaking") },
                ].map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="text-muted-foreground hover:text-primary transition-colors duration-200 flex items-center gap-1 group">
                      <ChevronRight className="h-3 w-3 opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">{t("footerForOwners")}</div>
              <ul className="space-y-2.5 text-xs">
                {[
                  { href: "/owner", label: t("footerAddStadium") },
                  { href: "/owner/dashboard", label: t("dashboard") },
                  { href: "/auth", label: t("signIn") },
                  { href: "/my-bookings", label: t("footerMyBookings") },
                ].map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="text-muted-foreground hover:text-primary transition-colors duration-200 flex items-center gap-1 group">
                      <ChevronRight className="h-3 w-3 opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">{t("footerContact")}</div>
              <ul className="space-y-3 text-xs">
                <li className="flex items-center gap-2.5 hover:text-foreground transition-colors">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 grid place-items-center shrink-0">
                    <Phone className="h-3 w-3 text-primary" />
                  </div>
                  <span>{settings?.contact?.phone ?? "+998 90 398 02 32"}</span>
                </li>
                <li className="flex items-center gap-2.5 hover:text-foreground transition-colors">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 grid place-items-center shrink-0">
                    <MapPin className="h-3 w-3 text-primary" />
                  </div>
                  <span>{lang === "uz" ? (settings?.contact?.address_uz ?? "Toshkent, O'zbekiston") : (settings?.contact?.address_ru ?? "Ташкент, Узбекистан")}</span>
                </li>
                <li>
                  <a href={settings?.contact?.telegram ?? "https://t.me/xmanydv"} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-1 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors duration-200">
                    <Send className="h-3 w-3" /> {t("telegramWrite")}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground/50">
            <span>© {new Date().getFullYear()} StadionTop. {t("footerRights")}</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-primary/50" /> {t("footerSsl")}</span>
              <span className="flex items-center gap-1.5"><Shield className="h-3 w-3 text-primary/50" /> {t("footerEscrow")}</span>
              <span>{t("footerMadeIn")}</span>
            </div>
          </div>
        </div>
      </footer>
      )}
    </div>
  );
};

export default Index;
