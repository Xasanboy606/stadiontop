import { useEffect, useRef, useState } from "react";
import { ArrowRight, MapPin, Search, Star, Users, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useSettingsStore } from "@/hooks/useSiteSettings";

const DEFAULT_SLIDES = [
  { url: "https://loremflickr.com/1920/1080/camp,nou?lock=1",        label: "Camp Nou · Barcelona" },
  { url: "https://loremflickr.com/1920/1080/bernabeu,stadium?lock=1", label: "Santiago Bernabéu · Madrid" },
  { url: "https://loremflickr.com/1920/1080/wembley,stadium?lock=1",  label: "Wembley Stadium · London" },
  { url: "https://loremflickr.com/1920/1080/allianz,arena?lock=1",    label: "Allianz Arena · München" },
];

const STAT_ICONS = [
  <MapPin className="h-4 w-4" />,
  <CalendarCheck className="h-4 w-4" />,
  <Star className="h-4 w-4" />,
  <Users className="h-4 w-4" />,
];

export const Hero = ({ onSearch }: { onSearch?: () => void }) => {
  const lang = useI18n((s) => s.lang);
  const settings = useSettingsStore((s) => s.settings);

  const slides = settings?.hero?.slides?.length ? settings.hero.slides : DEFAULT_SLIDES;
  const texts  = settings?.hero?.texts?.[lang];
  const stats  = settings?.stats;

  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded]   = useState<boolean[]>(slides.map((_, i) => i === 0));
  const [textKey, setTextKey] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>>();

  // Reset loaded state when slides change
  useEffect(() => {
    setLoaded(slides.map((_, i) => i === 0));
    setCurrent(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  useEffect(() => {
    timer.current = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % slides.length;
        setLoaded((l) => { const n = [...l]; n[next] = true; return n; });
        setTextKey((k) => k + 1);
        return next;
      });
    }, 5500);
    return () => clearInterval(timer.current);
  }, [slides.length]);

  const goTo = (i: number) => {
    setCurrent(i);
    setLoaded((l) => { const n = [...l]; n[i] = true; return n; });
    setTextKey((k) => k + 1);
    clearInterval(timer.current);
  };

  return (
    <section className="relative overflow-hidden" style={{ height: "100vh", minHeight: 600 }}>
      {/* Slides */}
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-[1200ms] ease-in-out ${i === current ? "opacity-100" : "opacity-0"}`}
        >
          {loaded[i] && (
            <img
              src={slide.url}
              alt={slide.label}
              className="h-full w-full object-cover"
              style={{
                transform: i === current ? "scale(1)" : "scale(1.06)",
                transition: "transform 8000ms ease-out",
              }}
            />
          )}
        </div>
      ))}

      {/* Multi-layer overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#060e07] via-[#0a1409]/70 to-[#0a1409]/25" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#060e07]/75 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#060e07]/30 via-transparent to-transparent" />

      {/* Decorative orbs */}
      <div className="orb w-96 h-96 bg-primary/20 top-[-100px] right-[-80px] animate-orb-drift" style={{ animationDelay: "0s" }} />
      <div className="orb w-64 h-64 bg-accent/15 bottom-40 right-20 animate-orb-drift" style={{ animationDelay: "4s" }} />

      {/* Stadium label — top right */}
      <div className="absolute top-5 right-5 flex items-center gap-2 bg-black/30 backdrop-blur-md border border-white/15 rounded-full px-3.5 py-1.5 animate-fade-in">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-white/80 text-xs font-medium tracking-wide">{slides[current].label}</span>
      </div>

      {/* Main content */}
      <div className="relative h-full flex flex-col justify-end pb-16 sm:pb-24">
        <div className="container">
          {/* Badge */}
          <div
            key={`badge-${textKey}`}
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/12 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-primary backdrop-blur-sm mb-6 animate-slide-right"
          >
            <MapPin className="h-3 w-3" />
            {texts?.badge ?? "Toshkent · 100+ stadion"}
          </div>

          {/* Headline */}
          <h1 className="font-display leading-[0.88]">
            <span key={`h1-${textKey}`} className="block text-5xl sm:text-7xl lg:text-[88px] text-white animate-slide-right" style={{ animationDelay: "60ms" }}>
              {texts?.line1 ?? "Maydon top."}
            </span>
            <span key={`h2-${textKey}`} className="block text-5xl sm:text-7xl lg:text-[88px] text-gradient animate-slide-right" style={{ animationDelay: "120ms" }}>
              {texts?.line2 ?? "O'yna."}
            </span>
            <span key={`h3-${textKey}`} className="block text-5xl sm:text-7xl lg:text-[88px] text-white/25 animate-slide-right" style={{ animationDelay: "180ms" }}>
              {texts?.line3 ?? "G'olib bo'l."}
            </span>
          </h1>

          <p key={`sub-${textKey}`} className="mt-5 text-base sm:text-lg text-white/55 max-w-md animate-fade-in" style={{ animationDelay: "250ms" }}>
            {texts?.subtitle ?? "Toshkentdagi 100+ stadiondan birini real vaqtda band qiling."}
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap gap-3 animate-fade-in" style={{ animationDelay: "320ms" }}>
            <Button
              size="lg"
              onClick={onSearch}
              className="bg-gradient-primary hover:opacity-90 shadow-glow text-base h-13 px-7 rounded-2xl gap-2 group transition-all duration-300 hover:shadow-glow-lg hover:-translate-y-0.5"
            >
              <Search className="h-5 w-5" />
              {lang === "uz" ? "Qidirish" : "Найти"}
              <ArrowRight className="h-4 w-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onSearch}
              className="border-white/20 bg-white/8 text-white hover:bg-white/15 hover:border-white/35 backdrop-blur-md h-13 px-7 rounded-2xl gap-2 transition-all duration-300"
            >
              {lang === "uz" ? "Xaritada ko'rish" : "Открыть карту"} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats row */}
          <div className="mt-10 flex flex-wrap gap-2.5 animate-fade-in" style={{ animationDelay: "400ms" }}>
            {(stats ?? [
              { value: "100+",    label_uz: "Stadion",       label_ru: "Стадионов" },
              { value: "10 000+", label_uz: "Bron",          label_ru: "Броней" },
              { value: "4.9",     label_uz: "Reyting",       label_ru: "Рейтинг" },
              { value: "5 000+",  label_uz: "Foydalanuvchi", label_ru: "Пользователей" },
            ]).map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 bg-white/7 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 hover:bg-white/12 hover:border-white/20 transition-all duration-200 cursor-default"
              >
                <span className="text-primary">{STAT_ICONS[i] ?? STAT_ICONS[0]}</span>
                <div>
                  <div className="font-display text-xl text-white leading-none">{s.value}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">
                    {lang === "uz" ? s.label_uz : s.label_ru}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Slide dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-400 ${
              i === current
                ? "w-7 h-2 bg-primary shadow-glow"
                : "w-2 h-2 bg-white/30 hover:bg-white/55"
            }`}
          />
        ))}
      </div>

    </section>
  );
};
