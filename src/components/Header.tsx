import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Goal, Users, LayoutDashboard, Trophy, Shield, Eye, Building2, Sun, Moon } from "lucide-react";
import { useI18n, useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

export const Header = () => {
  const t = useT();
  const { lang, setLang } = useI18n();
  const { pathname } = useLocation();
  const { isOwner, isAdmin } = useAuth();
  const { theme, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const link = (to: string, label: string, icon: React.ReactNode) => {
    const active = pathname === to;
    return (
      <Link
        to={to}
        className={cn(
          "relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
          active
            ? "text-primary bg-primary/10"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
        )}
      >
        <span className={cn("transition-transform duration-200", active && "scale-110")}>{icon}</span>
        <span className="hidden sm:inline">{label}</span>
        {active && (
          <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary animate-scale-in" />
        )}
      </Link>
    );
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 glass border-b border-border/60 transition-all duration-300",
        scrolled && "header-scrolled"
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-2">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="relative h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow group-hover:scale-105 group-hover:shadow-glow-lg transition-all duration-300">
            <Goal className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            <span className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          <div className="leading-none">
            <div className="font-display text-2xl tracking-wide text-secondary group-hover:text-primary transition-colors duration-200">
              StadionTop
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("toshkent")}</div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-0.5">
          {link("/", t("home"), <Goal className="h-4 w-4" />)}
          {link("/stadiums", t("stadiums"), <Building2 className="h-4 w-4" />)}
          {link("/events", t("events"), <Trophy className="h-4 w-4" />)}
          {link("/matchmaking", t("matchmaking"), <Users className="h-4 w-4" />)}
          {isOwner && link("/owner/dashboard", t("owner"), <LayoutDashboard className="h-4 w-4" />)}
          {isAdmin && link("/admin", t("admin"), <Shield className="h-4 w-4" />)}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            title={theme === "dark" ? t("lightMode") : t("darkMode")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <NotificationBell />
          <div className="hidden sm:flex items-center gap-0.5 rounded-xl border border-border/70 p-1 bg-muted/40 backdrop-blur-sm">
            {(["uz", "ru"] as const).map((l) => (
              <Button
                key={l}
                size="sm"
                variant="ghost"
                onClick={() => setLang(l)}
                className={cn(
                  "h-7 px-2.5 text-xs font-bold uppercase rounded-lg transition-all duration-200",
                  lang === l
                    ? "bg-secondary text-secondary-foreground shadow-sm scale-100"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {l}
              </Button>
            ))}
          </div>
          <UserMenu />
        </div>
      </div>
    </header>
  );
};
