import { useEffect, useMemo, useState } from "react";
import { api, StadiumRow, BookingRow, EditRequestRow } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { formatUZS, DISTRICTS, FACILITY_LABELS, type Facility } from "@/data/stadiums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRScanner } from "@/components/QRScanner";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Plus, Camera, TrendingUp, CalendarCheck, Building2, Loader2,
  Clock, MapPin, Send, CheckCircle2, XCircle, AlertCircle,
  LayoutDashboard, Star, ChevronRight, LogOut, Edit2,
  FileEdit, RefreshCw, Phone, Mail,
  Shield, Search, ChevronDown, Menu,
} from "lucide-react";
import { toast } from "sonner";

type NavKey = "dashboard" | "pitches" | "bookings" | "requests";

const todayStr = () => new Date().toISOString().slice(0, 10);

const EDITABLE_FIELDS = [
  { key: "name",        label: "Stadion nomi" },
  { key: "price_day",   label: "Kunduzgi narx (so'm/soat)" },
  { key: "price_night", label: "Tungi narx (so'm/soat)" },
  { key: "address",     label: "Manzil" },
  { key: "description", label: "Tavsif" },
  { key: "size",        label: "O'lcham" },
  { key: "has_referee", label: "Hakami (true/false)" },
  { key: "has_video",   label: "Video yozuv (true/false)" },
  { key: "has_balls",   label: "To'p (true/false)" },
  { key: "has_bibs",    label: "Mayka (true/false)" },
] as const;

/* ══════════════════════════════════════════════
   MAIN OWNER COMPONENT
══════════════════════════════════════════════ */
const Owner = () => {
  const { user, signOut, refresh } = useAuth();
  const [page, setPage] = useState<NavKey>("dashboard");
  const [stadiums, setStadiums] = useState<StadiumRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [editReqs, setEditReqs] = useState<EditRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanOpen, setScanOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [s, b, er] = await Promise.all([
        api.owner.stadiums(),
        api.owner.bookings(),
        api.editRequests.list(),
      ]);
      setStadiums(s);
      setBookings(b);
      setEditReqs(er);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const todayBookings = bookings.filter((b) => b.booking_date === todayStr());
  const monthlyRevenue = useMemo(() => {
    const ym = todayStr().slice(0, 7);
    return bookings
      .filter((b) => b.booking_date?.startsWith(ym) && b.status === "confirmed")
      .reduce((acc, b) => acc + b.paid_amount, 0);
  }, [bookings]);

  const totalRevenue = bookings
    .filter((b) => b.status === "confirmed")
    .reduce((acc, b) => acc + b.paid_amount, 0);

  const avgRating = useMemo(() => {
    const ratings = stadiums.filter((s) => s.rating).map((s) => Number(s.rating));
    if (!ratings.length) return null;
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  }, [stadiums]);

  const pendingReqs = editReqs.filter((r) => r.status === "pending").length;

  const revenueChart = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.filter((b) => b.status === "confirmed").forEach((b) => {
      const day = b.booking_date?.slice(5, 10) ?? "?";
      map[day] = (map[day] || 0) + b.paid_amount;
    });
    return Object.entries(map).slice(-10).map(([day, amount]) => ({ day, amount }));
  }, [bookings]);

  const initials = (user?.full_name || user?.email || "U")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const NAV: { key: NavKey; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "dashboard", label: "Dashboard",   icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: "pitches",   label: "Pitchlarim",  icon: <Building2 className="h-4 w-4" />, badge: stadiums.length },
    { key: "bookings",  label: "Bronlar",     icon: <CalendarCheck className="h-4 w-4" />, badge: bookings.filter(b => b.status === "confirmed").length },
    { key: "requests",  label: "So'rovlar",   icon: <FileEdit className="h-4 w-4" />, badge: pendingReqs || undefined },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`w-64 min-h-screen bg-secondary flex flex-col fixed left-0 top-0 bottom-0 z-30 transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        {/* Brand */}
        <div className="p-5 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow shrink-0">
              <Shield className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <div className="font-display text-base text-white leading-none">StadionTOP</div>
              <div className="text-[10px] text-white/35 uppercase tracking-widest mt-0.5">Egasi paneli</div>
            </div>
          </div>
        </div>

        {/* Profile card */}
        <div className="p-4 border-b border-white/8">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-primary grid place-items-center text-white font-display text-lg font-bold shrink-0 shadow-glow">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm truncate">
                {user?.full_name || "Ism yo'q"}
              </div>
              <div className="text-white/40 text-xs truncate">{user?.email}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <div className="rounded-lg bg-white/5 p-2 text-center">
              <div className="text-white font-display text-lg leading-none">{stadiums.length}</div>
              <div className="text-white/35 text-[9px] uppercase tracking-wider mt-0.5">Pitch</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2 text-center">
              <div className="text-white font-display text-lg leading-none">{bookings.filter(b=>b.status==="confirmed").length}</div>
              <div className="text-white/35 text-[9px] uppercase tracking-wider mt-0.5">Bron</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2 text-center">
              <div className="text-white font-display text-lg leading-none">{avgRating ?? "—"}</div>
              <div className="text-white/35 text-[9px] uppercase tracking-wider mt-0.5">Reyting</div>
            </div>
          </div>
          <button onClick={() => setProfileOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-white/50 text-xs hover:text-white hover:border-white/25 transition-all">
            <Edit2 className="h-3 w-3" /> Profilni tahrirlash
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map(({ key, label, icon, badge }) => {
            const active = page === key;
            return (
              <button key={key} onClick={() => { setPage(key); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? "bg-primary text-white shadow-glow font-semibold"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}>
                <span className={active ? "text-white" : "text-white/40"}>{icon}</span>
                <span className="flex-1 text-left">{label}</span>
                {badge !== undefined && badge > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    active ? "bg-white/20 text-white" : "bg-primary/80 text-white"
                  }`}>{badge}</span>
                )}
                {active && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
              </button>
            );
          })}

          <div className="pt-2 mt-2 border-t border-white/8">
            <button onClick={() => setScanOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all">
              <Camera className="h-4 w-4 text-white/40" />
              <span>QR Skaner</span>
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/8">
          <button onClick={() => { signOut(); window.location.href = "/"; }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all">
            <LogOut className="h-4 w-4" />
            <span>Chiqish</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 md:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/60 px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(v => !v)}
              className="h-9 w-9 rounded-xl bg-muted grid place-items-center hover:bg-muted/80 transition-colors md:hidden">
              <Menu className="h-4 w-4 text-muted-foreground" />
            </button>
            <div>
              {stadiums.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-0.5">
                  {stadiums.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 uppercase tracking-wide">
                      <Building2 className="h-2.5 w-2.5" /> {s.name}
                    </span>
                  ))}
                </div>
              )}
              <h1 className="font-display text-2xl text-secondary">
                {NAV.find((n) => n.key === page)?.label}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                {todayStr()} · {user?.full_name ?? user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={load}
              className="h-9 w-9 rounded-xl bg-muted grid place-items-center hover:bg-muted/80 transition-colors">
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
            </button>
            {page === "pitches" && (
              <Button onClick={() => setAddOpen(true)} className="bg-gradient-primary shadow-glow rounded-xl h-9 text-sm px-4">
                <Plus className="h-4 w-4 mr-1.5" /> Yangi pitch
              </Button>
            )}
          </div>
        </header>

        <main className="p-4 md:p-8">
          {loading ? (
            <div className="grid place-items-center py-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {page === "dashboard" && (
                <DashboardPage
                  stadiums={stadiums} bookings={bookings} todayBookings={todayBookings}
                  monthlyRevenue={monthlyRevenue} totalRevenue={totalRevenue}
                  avgRating={avgRating} revenueChart={revenueChart}
                  pendingReqs={pendingReqs} onNavigate={setPage}
                />
              )}
              {page === "pitches" && (
                <PitchesPage stadiums={stadiums} onRefresh={load} />
              )}
              {page === "bookings" && (
                <BookingsPage bookings={bookings} />
              )}
              {page === "requests" && (
                <RequestsPage reqs={editReqs} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Dialogs */}
      <QRScanner open={scanOpen} onClose={() => setScanOpen(false)} />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl bg-popover max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl">Yangi pitch qo'shish</DialogTitle></DialogHeader>
          <StadiumForm onCreated={() => { setAddOpen(false); load(); }} />
        </DialogContent>
      </Dialog>

      <ProfileEditDialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        onSaved={refresh}
      />
    </div>
  );
};

/* ══════════════════════════════════════════════
   DASHBOARD PAGE
══════════════════════════════════════════════ */
const DashboardPage = ({
  stadiums, bookings, todayBookings, monthlyRevenue, totalRevenue,
  avgRating, revenueChart, pendingReqs, onNavigate,
}: {
  stadiums: StadiumRow[]; bookings: BookingRow[];
  todayBookings: BookingRow[]; monthlyRevenue: number; totalRevenue: number;
  avgRating: string | null; revenueChart: { day: string; amount: number }[];
  pendingReqs: number; onNavigate: (p: NavKey) => void;
}) => {
  const confirmedToday = todayBookings.filter((b) => b.status === "confirmed").length;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <OwnerStatCard
          icon={<CalendarCheck className="h-5 w-5" />}
          label="Bugungi bronlar"
          value={String(confirmedToday)}
          sub={`${todayBookings.length} jami`}
          color="blue"
        />
        <OwnerStatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Oylik tushum"
          value={formatUZS(monthlyRevenue)}
          sub={new Date().toLocaleDateString("ru-RU", { month: "long" })}
          color="green"
          isText
        />
        <OwnerStatCard
          icon={<Building2 className="h-5 w-5" />}
          label="Pitchlarim"
          value={String(stadiums.length)}
          sub={`${stadiums.filter(s => s.status === "approved").length} faol`}
          color="violet"
        />
        <OwnerStatCard
          icon={<Star className="h-5 w-5" />}
          label="O'rtacha reyting"
          value={avgRating ?? "—"}
          sub="barcha pitchlar"
          color="amber"
        />
      </div>

      {/* Chart + today's bookings */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border/60 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-semibold text-secondary">Tushum dinamikasi</div>
              <div className="text-xs text-muted-foreground mt-0.5">Tasdiqlangan bronlar bo'yicha</div>
            </div>
            <span className="text-xs bg-muted px-2.5 py-1 rounded-lg text-muted-foreground">So'm</span>
          </div>
          {revenueChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenueChart}>
                <defs>
                  <linearGradient id="ownerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => [formatUZS(v), "Tushum"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#ownerGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] grid place-items-center text-sm text-muted-foreground">
              Hali tranzaksiyalar yo'q
            </div>
          )}
        </div>

        {/* Quick stats panel */}
        <div className="space-y-3">
          <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-sm">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Umumiy tushum</div>
            <div className="font-display text-2xl text-primary">{formatUZS(totalRevenue)}</div>
            <div className="text-xs text-muted-foreground mt-1">{bookings.filter(b => b.status === "confirmed").length} ta tasdiqlangan bron</div>
          </div>
          <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-sm">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Stadionlar holati</div>
            <div className="space-y-1.5">
              {[
                { label: "Tasdiqlangan", count: stadiums.filter(s=>s.status==="approved").length, cls: "bg-emerald-500" },
                { label: "Kutmoqda", count: stadiums.filter(s=>s.status==="pending").length, cls: "bg-amber-400" },
                { label: "Rad etilgan", count: stadiums.filter(s=>s.status==="rejected").length, cls: "bg-red-400" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${item.cls}`} />
                    <span className="text-muted-foreground text-xs">{item.label}</span>
                  </div>
                  <span className="font-semibold text-secondary text-sm">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pending requests alert */}
      {pendingReqs > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <div className="font-semibold text-amber-800">{pendingReqs} ta tahrirlash so'rovi kutmoqda</div>
              <div className="text-xs text-amber-700/70 mt-0.5">Admin ko'rib chiqmoqda</div>
            </div>
          </div>
          <button onClick={() => onNavigate("requests")}
            className="flex items-center gap-1 text-sm text-amber-700 font-semibold hover:text-amber-900 transition-colors">
            Ko'rish <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Recent bookings */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
          <div className="font-semibold text-secondary">So'nggi bronlar</div>
          <button onClick={() => onNavigate("bookings")} className="text-xs text-primary hover:underline">
            Barchasini ko'rish
          </button>
        </div>
        {bookings.slice(0, 5).length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Hali bron yo'q</div>
        ) : (
          <div className="divide-y divide-border/60">
            {bookings.slice(0, 5).map((b) => (
              <div key={b.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                    <CalendarCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-secondary">{b.stadiums?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {b.booking_date} · {String(b.hour).padStart(2,"0")}:00 ({b.duration}h)
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs font-bold text-secondary">{b.short_code}</div>
                  <div className="text-xs text-primary font-semibold">{formatUZS(b.paid_amount)}</div>
                  <StatusDot status={b.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   PITCHES PAGE
══════════════════════════════════════════════ */
const PitchesPage = ({ stadiums, onRefresh }: { stadiums: StadiumRow[]; onRefresh: () => void }) => {
  if (stadiums.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card py-20 text-center">
        <Building2 className="h-14 w-14 mx-auto mb-3 text-muted-foreground/30" />
        <div className="font-display text-2xl text-secondary mb-1">Pitch yo'q</div>
        <div className="text-sm text-muted-foreground">Yuqoridagi "Yangi pitch" tugmasini bosing</div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {stadiums.map((s) => (
        <PitchCard key={s.id} stadium={s} onRefresh={onRefresh} />
      ))}
    </div>
  );
};

const PitchCard = ({ stadium: s, onRefresh }: { stadium: StadiumRow; onRefresh: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header gradient */}
      <div className="h-24 bg-gradient-to-br from-primary/15 via-primary/5 to-emerald-500/5 flex items-end justify-between p-4">
        <div>
          <h3 className="font-display text-2xl text-secondary leading-tight">{s.name}</h3>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" />{s.district}
          </div>
        </div>
        <StatusPill status={s.status} />
      </div>

      <div className="p-4 space-y-3">
        {/* Price grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-muted/40 p-3 col-span-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Kunduz</div>
            <div className="font-semibold text-primary text-sm mt-0.5">{formatUZS(s.price_day)}</div>
          </div>
          <div className="rounded-xl bg-muted/40 p-3 col-span-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Tun</div>
            <div className="font-semibold text-secondary text-sm mt-0.5">{formatUZS(s.price_night)}</div>
          </div>
          <div className="rounded-xl bg-muted/40 p-3 col-span-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">O'lcham</div>
            <div className="font-semibold text-secondary text-sm mt-0.5">{s.size ?? "—"}</div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {s.rating && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-primary text-primary" />
              {s.rating} reyting
            </span>
          )}
          {s.reviews != null && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {s.reviews} sharh
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(s.created_at).toLocaleDateString("ru-RU")}
          </span>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-secondary transition-colors py-1 border-t border-border/60 pt-2">
          <span>Add-on xizmatlar va sozlamalar</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        {expanded && (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              {(["referee", "video", "balls", "bibs"] as const).map((k) => {
                const field = `has_${k}` as keyof StadiumRow;
                const checked = s[field] as boolean;
                const labels: Record<string, string> = {
                  referee: "Hakami", video: "Video", balls: "To'plar", bibs: "Kiyimlar"
                };
                return (
                  <label key={k} className="flex items-center justify-between text-sm bg-muted/30 rounded-xl px-3 py-2">
                    <span className="text-secondary text-xs font-medium">{labels[k]}</span>
                    <Switch checked={checked} onCheckedChange={async (v) => {
                      try {
                        await api.stadiums.update(s.id, { [field]: v });
                        onRefresh();
                      } catch (e: any) { toast.error(e.message); }
                    }} />
                  </label>
                );
              })}
            </div>
            {s.status === "approved" && (
              <div className="flex flex-col gap-2">
                <button onClick={() => setEditOpen(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-500/30 text-emerald-600 text-xs font-medium hover:bg-emerald-500/5 transition-all">
                  <Edit2 className="h-3.5 w-3.5" /> Tezkor tahrirlash
                </button>
                <EditRequestDialog stadium={s} onSent={onRefresh} />
              </div>
            )}
          </div>
        )}

        {editOpen && (
          <OwnerEditModal stadium={s} onSaved={onRefresh} onClose={() => setEditOpen(false)} />
        )}

        {s.status === "pending" && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Admin tasdiqlashini kutmoqda. Iltimos kuting.
          </div>
        )}
        {s.status === "rejected" && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
            <XCircle className="h-3.5 w-3.5 shrink-0" />
            Rad etilgan. Admin bilan bog'laning.
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   BOOKINGS PAGE
══════════════════════════════════════════════ */
const BookingsPage = ({ bookings }: { bookings: BookingRow[] }) => {
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "cancelled">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week">("all");
  const [search, setSearch] = useState("");

  const today = todayStr();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const filtered = bookings
    .filter((b) => statusFilter === "all" || b.status === statusFilter)
    .filter((b) => {
      if (dateFilter === "today") return b.booking_date === today;
      if (dateFilter === "week") return b.booking_date >= weekAgo;
      return true;
    })
    .filter((b) =>
      !search ||
      (b.short_code ?? "").includes(search.toUpperCase()) ||
      (b.stadiums?.name ?? "").toLowerCase().includes(search.toLowerCase())
    );

  const confirmedTotal = filtered
    .filter((b) => b.status === "confirmed")
    .reduce((a, b) => a + b.paid_amount, 0);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Kod yoki stadion nomi..." value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>

        <div className="flex gap-1 bg-muted/60 border border-border rounded-xl p-1">
          {(["all","today","week"] as const).map((f) => (
            <button key={f} onClick={() => setDateFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${dateFilter === f ? "bg-primary text-white" : "text-muted-foreground hover:text-secondary"}`}>
              {f === "all" ? "Barchasi" : f === "today" ? "Bugun" : "Bu hafta"}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-muted/60 border border-border rounded-xl p-1">
          {(["all","confirmed","cancelled"] as const).map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === f ? "bg-primary text-white" : "text-muted-foreground hover:text-secondary"}`}>
              {f === "all" ? "Hammasi" : f === "confirmed" ? "Tasdiqlangan" : "Bekor"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">{filtered.length} ta bron</span>
        <span className="text-primary font-semibold">{formatUZS(confirmedTotal)} jami</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-card border border-dashed border-border/80 py-16 text-center">
          <CalendarCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <div className="text-muted-foreground text-sm">Bronlar topilmadi</div>
        </div>
      ) : (
        <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stadion</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Sana & Vaqt</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Narx</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Holat</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Kod</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-secondary">{b.stadiums?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{b.duration}h · {b.payment_provider?.toUpperCase()}</div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <div className="text-secondary">{b.booking_date}</div>
                    <div className="text-xs text-muted-foreground">
                      {String(b.hour).padStart(2,"0")}:00 — {String(b.hour + b.duration).padStart(2,"0")}:00
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="font-semibold text-secondary">{formatUZS(b.paid_amount)}</div>
                    {b.payment_kind === "deposit" && (
                      <div className="text-[10px] text-amber-600">30% depozit</div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <BookingStatusPill status={b.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right hidden md:table-cell">
                    <span className="font-mono text-xs font-bold text-secondary tracking-widest">{b.short_code}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════
   REQUESTS PAGE
══════════════════════════════════════════════ */
const RequestsPage = ({ reqs }: { reqs: EditRequestRow[] }) => {
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const filtered = reqs.filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="space-y-5">
      {/* Filter tabs */}
      <div className="flex gap-1 bg-muted/60 border border-border rounded-xl p-1 w-fit">
        {(["all","pending","approved","rejected"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? "bg-primary text-white" : "text-muted-foreground hover:text-secondary"}`}>
            {f === "all" ? "Barchasi" : f === "pending" ? "Kutmoqda" : f === "approved" ? "Tasdiqlangan" : "Rad etilgan"}
            <span className="ml-1.5 opacity-60">{reqs.filter(r => f === "all" || r.status === f).length}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-card border border-dashed border-border/80 py-16 text-center">
          <FileEdit className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <div className="text-muted-foreground text-sm">So'rovlar yo'q</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-2xl bg-card border border-border/60 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <div className="font-display text-xl text-secondary">
                    {r.stadiums?.name ?? r.stadium_name ?? "Stadion"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {EDITABLE_FIELDS.find((f) => f.key === r.field_name)?.label ?? r.field_name}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ReqStatusPill status={r.status} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              </div>

              {/* Change visualization */}
              <div className="rounded-xl bg-muted/40 p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Eski qiymat</div>
                  <div className="line-through text-muted-foreground text-sm truncate">{r.old_value || "—"}</div>
                </div>
                <div className="text-muted-foreground text-lg">→</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-primary uppercase tracking-wider mb-1">Yangi qiymat</div>
                  <div className="font-semibold text-primary text-sm truncate">{r.new_value}</div>
                </div>
              </div>

              {r.admin_response && (
                <div className="mt-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  💬 <span className="font-medium text-secondary">Admin javobi:</span> {r.admin_response}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════
   PROFILE EDIT DIALOG
══════════════════════════════════════════════ */
const ProfileEditDialog = ({
  open, onClose, user, onSaved,
}: {
  open: boolean; onClose: () => void;
  user: any; onSaved: () => Promise<void> | void;
}) => {
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [pwSection, setPwSection] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setFullName(user?.full_name ?? "");
      setPhone(user?.phone ?? "");
      setPwSection(false);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    }
  }, [open, user]);

  const save = async () => {
    if (!fullName.trim()) { toast.error("Ism kiritish shart"); return; }
    setBusy(true);
    try {
      await api.auth.updateProfile({ full_name: fullName.trim(), phone: phone.trim() || undefined });
      await onSaved();
      toast.success("✅ Profil yangilandi");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const changePw = async () => {
    if (!currentPw || !newPw) return toast.error("Maydonlarni to'ldiring");
    if (newPw.length < 6) return toast.error("Yangi parol kamida 6 ta belgi");
    if (newPw !== confirmPw) return toast.error("Parollar mos emas");
    setPwBusy(true);
    try {
      await api.auth.changePassword(currentPw, newPw);
      toast.success("Parol o'zgartirildi");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setPwSection(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPwBusy(false);
    }
  };

  const initials = (user?.full_name || user?.email || "U")
    .split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-popover max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Profil ma'lumotlari</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-primary grid place-items-center text-white font-display text-2xl font-bold shadow-glow shrink-0">
              {initials}
            </div>
            <div>
              <div className="font-semibold text-secondary">{user?.full_name || "—"}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                <Mail className="h-3.5 w-3.5" /> {user?.email}
              </div>
              {user?.phone && (
                <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Phone className="h-3.5 w-3.5" /> {user.phone}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">To'liq ism</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="Ism Familiya" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Telefon raqam</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67" maxLength={20} />
            </div>
          </div>

          {/* Password change section */}
          <div className="border-t border-border pt-3">
            <button type="button" onClick={() => setPwSection(v => !v)}
              className="text-sm text-primary hover:underline flex items-center gap-1">
              {pwSection ? "▲" : "▼"} Parolni o'zgartirish
            </button>
            {pwSection && (
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Joriy parol</Label>
                  <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                    placeholder="••••••••" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Yangi parol</Label>
                  <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                    placeholder="••••••••" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tasdiqlang</Label>
                  <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                    placeholder="••••••••" />
                </div>
                <Button onClick={changePw} disabled={pwBusy} variant="outline" className="w-full">
                  {pwBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Parolni saqlash"}
                </Button>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4 bg-muted/30 -mx-6 px-6 py-3 -mb-6 rounded-b-2xl flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              A'zo bo'lgan: {user?.created_at ? new Date(user.created_at).toLocaleDateString("ru-RU") : "—"}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="rounded-xl">Bekor</Button>
              <Button onClick={save} disabled={busy} className="bg-gradient-primary shadow-glow rounded-xl">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Saqlash"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ══════════════════════════════════════════════
   EDIT REQUEST DIALOG
══════════════════════════════════════════════ */
const EditRequestDialog = ({ stadium, onSent }: { stadium: StadiumRow; onSent: () => void }) => {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState<typeof EDITABLE_FIELDS[number]["key"]>("price_day");
  const [newVal, setNewVal] = useState("");
  const [busy, setBusy] = useState(false);

  const oldValue = String((stadium as unknown as Record<string, unknown>)[field] ?? "");

  const submit = async () => {
    if (!newVal.trim()) { toast.error("Yangi qiymat kiriting"); return; }
    if (newVal.trim() === oldValue) { toast.error("Qiymat o'zgarmagan"); return; }
    setBusy(true);
    try {
      await api.editRequests.create({
        stadium_id: stadium.id,
        field_name: field,
        old_value: oldValue,
        new_value: newVal.trim(),
      });
      toast.success("✅ So'rov yuborildi. Admin ko'rib chiqadi.");
      setOpen(false);
      setNewVal("");
      onSent();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-primary/30 text-primary text-xs font-medium hover:bg-primary/5 transition-all">
        <Send className="h-3.5 w-3.5" /> O'zgartirish so'rovi yuborish
      </button>
      <DialogContent className="bg-popover max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Tahrirlash so'rovi</DialogTitle>
          <p className="text-sm text-muted-foreground">{stadium.name}</p>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Maydon</Label>
            <Select value={field} onValueChange={(v) => { setField(v as typeof field); setNewVal(""); }}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {EDITABLE_FIELDS.map((f) => (
                  <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm">
            <span className="text-muted-foreground text-xs">Hozirgi qiymat: </span>
            <span className="font-medium text-secondary">{oldValue || "—"}</span>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Yangi qiymat</Label>
            <Input value={newVal} onChange={(e) => setNewVal(e.target.value)}
              placeholder={`Yangi ${EDITABLE_FIELDS.find((f) => f.key === field)?.label}`} />
          </div>
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
            So'rov admin tomonidan ko'rib chiqiladi. Tasdiqlangandan so'ng o'zgarishlar qo'llaniladi.
          </p>
          <Button onClick={submit} disabled={busy} className="w-full bg-gradient-primary shadow-glow rounded-xl h-11">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "So'rov yuborish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ══════════════════════════════════════════════
   OWNER DIRECT EDIT MODAL
   Narx, tavsif, rasm, add-onlarni admin tasdiqisiz tahrirlash
══════════════════════════════════════════════ */
const OwnerEditModal = ({ stadium, onSaved, onClose }: {
  stadium: StadiumRow;
  onSaved: () => void;
  onClose: () => void;
}) => {
  const [form, setForm] = useState({
    price_day:   String(stadium.price_day),
    price_night: String(stadium.price_night),
    description: stadium.description ?? "",
    has_referee: !!stadium.has_referee,
    has_video:   !!stadium.has_video,
    has_balls:   !!stadium.has_balls,
    has_bibs:    !!stadium.has_bibs,
    images:      stadium.images?.length ? [...stadium.images] : [""],
  });
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState<number | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const setImage = (i: number, val: string) => {
    const imgs = [...form.images]; imgs[i] = val; set("images", imgs);
  };

  const uploadImage = async (i: number, file: File) => {
    setUploadBusy(i);
    try {
      const url = await api.upload.image(file);
      setImage(i, url);
    } catch (e: any) { toast.error(e.message); }
    finally { setUploadBusy(null); }
  };

  const save = async () => {
    setBusy(true);
    try {
      await api.stadiums.update(stadium.id, {
        price_day:   Number(form.price_day),
        price_night: Number(form.price_night),
        description: form.description.trim() || undefined,
        has_referee: form.has_referee,
        has_video:   form.has_video,
        has_balls:   form.has_balls,
        has_bibs:    form.has_bibs,
        images:      form.images.filter(u => u.trim()),
      });
      toast.success("✅ Stadion yangilandi");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-popover max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Tezkor tahrirlash</DialogTitle>
          <p className="text-sm text-muted-foreground">{stadium.name}</p>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kunduzgi narx</Label>
              <Input type="number" value={form.price_day}
                onChange={e => set("price_day", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tungi narx</Label>
              <Input type="number" value={form.price_night}
                onChange={e => set("price_night", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tavsif</Label>
            <Textarea value={form.description} rows={3}
              onChange={e => set("description", e.target.value)}
              placeholder="Stadion haqida qisqacha ma'lumot..." />
          </div>

          {/* Add-ons */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Qo'shimcha xizmatlar</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: "has_referee" as const, label: "Hakami" },
                { key: "has_video"   as const, label: "Video yozuv" },
                { key: "has_balls"   as const, label: "To'p" },
                { key: "has_bibs"    as const, label: "Mayka" },
              ]).map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between bg-muted/30 rounded-xl px-3 py-2 cursor-pointer">
                  <span className="text-sm text-secondary">{label}</span>
                  <Switch checked={form[key]} onCheckedChange={v => set(key, v)} />
                </label>
              ))}
            </div>
          </div>

          {/* Images */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Rasmlar</Label>
            {form.images.map((url, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input value={url} placeholder="https://... yoki yuklang"
                  onChange={e => setImage(i, e.target.value)} className="flex-1" />
                <label className="h-9 w-9 rounded-lg border border-border/60 bg-muted/40 hover:bg-primary/10 grid place-items-center shrink-0 cursor-pointer transition-colors">
                  {uploadBusy === i
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    : <Plus className="h-3.5 w-3.5 text-muted-foreground" />}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(i, f); }} />
                </label>
                {form.images.length > 1 && (
                  <button type="button" onClick={() => set("images", form.images.filter((_, idx) => idx !== i))}
                    className="h-9 w-9 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 grid place-items-center shrink-0">
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {form.images.length < 5 && (
              <button type="button" onClick={() => set("images", [...form.images, ""])}
                className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> Rasm qo'shish
              </button>
            )}
          </div>

          <p className="text-xs text-muted-foreground bg-muted/40 rounded-xl p-3">
            Nomi, manzil, tuman o'zgartirilmaydi — bu yerda faqat narx, tavsif va rasmlar yangilanadi. Boshqa maydonlar uchun "O'zgartirish so'rovi" yuboring.
          </p>

          <div className="flex gap-2">
            <Button onClick={save} disabled={busy} className="flex-1 bg-gradient-primary shadow-glow">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Saqlash"}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">Bekor</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ══════════════════════════════════════════════
   STADIUM FORM
══════════════════════════════════════════════ */
const StadiumForm = ({ onCreated }: { onCreated: () => void }) => {
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: "", district: DISTRICTS[0], address: "", description: "",
    size: "5x5" as const, price_day: 200000, price_night: 280000,
    facilities: [] as Facility[],
    has_referee: false, has_video: false, has_balls: true, has_bibs: true,
    images: "", lat: "", lng: "",
  });

  const submit = async () => {
    if (f.name.trim().length < 2) return toast.error("Stadion nomi kerak (kamida 2 ta harf)");
    if (f.address.trim().length < 5) return toast.error("To'liq manzil kiriting");
    if (f.price_day < 10000 || f.price_night < 10000) return toast.error("Narx noto'g'ri (kamida 10 000 so'm)");
    setBusy(true);
    try {
      const images = f.images.split(",").map((s) => s.trim()).filter(Boolean);
      await api.stadiums.create({
        name: f.name.trim(), district: f.district, address: f.address.trim(),
        description: f.description.trim(), size: f.size,
        price_day: f.price_day, price_night: f.price_night,
        facilities: f.facilities,
        has_referee: f.has_referee, has_video: f.has_video,
        has_balls: f.has_balls, has_bibs: f.has_bibs,
        images,
        lat: f.lat ? parseFloat(f.lat) : null,
        lng: f.lng ? parseFloat(f.lng) : null,
      });
      toast.success("✅ Pitch yuborildi! Admin tasdiqlashini kuting.");
      onCreated();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleFacility = (k: Facility) =>
    setF((s) => ({
      ...s,
      facilities: s.facilities.includes(k) ? s.facilities.filter((x) => x !== k) : [...s.facilities, k],
    }));

  return (
    <div className="space-y-4">
      <FF label="Stadion nomi *">
        <Input maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="Masalan: Chilonzor Sport" />
      </FF>

      <div className="grid grid-cols-2 gap-3">
        <FF label="Tuman *">
          <Select value={f.district} onValueChange={(v) => setF({ ...f, district: v as never })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </FF>
        <FF label="Maydon o'lchami *">
          <Select value={f.size} onValueChange={(v) => setF({ ...f, size: v as never })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {(["5x5","6x6","7x7","8x8","11x11"] as const).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FF>
      </div>

      <FF label="To'liq manzil *">
        <Input maxLength={200} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })}
          placeholder="Ko'cha, uy raqami..." />
      </FF>

      <div className="grid grid-cols-2 gap-3">
        <FF label="Kenglik — Lat (xarita uchun)">
          <Input type="number" step="0.000001" value={f.lat}
            onChange={(e) => setF({ ...f, lat: e.target.value })}
            placeholder="41.2995" />
        </FF>
        <FF label="Uzunlik — Lng (xarita uchun)">
          <Input type="number" step="0.000001" value={f.lng}
            onChange={(e) => setF({ ...f, lng: e.target.value })}
            placeholder="69.2401" />
        </FF>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-2">
        💡 Koordinatalarni{" "}
        <a href="https://yandex.com/maps/10335/tashkent/" target="_blank" rel="noopener noreferrer"
          className="text-primary underline">Yandex.Maps</a>
        {" "}dan oling: stadion ustiga o'ng tugma → «Bu yerning manzili»
      </p>

      <FF label="Tavsif">
        <Textarea maxLength={500} rows={2} value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
          placeholder="Stadion haqida qisqacha..." />
      </FF>

      <div className="grid grid-cols-2 gap-3">
        <FF label="Kunduzgi narx (so'm/soat) *">
          <Input type="number" min={10000} step={10000} value={f.price_day}
            onChange={(e) => setF({ ...f, price_day: +e.target.value })} />
        </FF>
        <FF label="Tungi narx (so'm/soat) *">
          <Input type="number" min={10000} step={10000} value={f.price_night}
            onChange={(e) => setF({ ...f, price_night: +e.target.value })} />
        </FF>
      </div>

      <FF label="Rasm URL'lari (vergul bilan)">
        <Input value={f.images} placeholder="https://..., https://..."
          onChange={(e) => setF({ ...f, images: e.target.value })} />
      </FF>

      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Infratuzilma</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {(Object.keys(FACILITY_LABELS) as Facility[]).map((k) => (
            <button key={k} type="button" onClick={() => toggleFacility(k)}
              className={`px-3 py-1.5 rounded-xl text-xs border font-medium transition-all ${
                f.facilities.includes(k)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40"
              }`}>
              {FACILITY_LABELS[k].uz}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-muted/40 p-4">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">Add-on xizmatlar</Label>
        <div className="grid grid-cols-2 gap-3">
          {([["referee","Hakami"],["video","Video yozuv"],["balls","To'plar"],["bibs","Kiyimlar"]] as const).map(([k, label]) => (
            <label key={k} className="flex items-center justify-between text-sm">
              <span className="text-secondary font-medium">{label}</span>
              <Switch checked={(f as never)[`has_${k}`]}
                onCheckedChange={(v) => setF((s) => ({ ...s, [`has_${k}`]: v } as never))} />
            </label>
          ))}
        </div>
      </div>

      <Button onClick={submit} disabled={busy} className="w-full bg-gradient-primary shadow-glow h-12 text-base rounded-xl">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Tasdiqlash uchun yuborish →"}
      </Button>
    </div>
  );
};

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
const OwnerStatCard = ({
  icon, label, value, sub, color, isText,
}: {
  icon: React.ReactNode; label: string; value: string;
  sub?: string; color: "blue" | "green" | "violet" | "amber"; isText?: boolean;
}) => {
  const colors = {
    blue:   "bg-blue-50 text-blue-600",
    green:  "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    amber:  "bg-amber-50 text-amber-600",
  };
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-sm">
      <div className={`h-10 w-10 rounded-xl grid place-items-center mb-4 ${colors[color]}`}>{icon}</div>
      <div className={`font-display ${isText ? "text-xl" : "text-3xl"} text-secondary leading-tight`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
      {sub && <div className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</div>}
    </div>
  );
};

const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    pending:  { label: "Kutmoqda",    cls: "bg-amber-100 text-amber-700 border-amber-200" },
    approved: { label: "Tasdiqlangan",cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    rejected: { label: "Rad etilgan", cls: "bg-red-100 text-red-700 border-red-200" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${s.cls}`}>{s.label}</span>
  );
};

const BookingStatusPill = ({ status }: { status: string }) => {
  if (status === "confirmed") return <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Tasdiqlangan</span>;
  if (status === "cancelled") return <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">Bekor qilindi</span>;
  if (status === "completed") return <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">Yakunlandi</span>;
  return <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{status}</span>;
};

const ReqStatusPill = ({ status }: { status: string }) => {
  if (status === "pending")  return <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700"><AlertCircle className="h-3 w-3" />Kutmoqda</span>;
  if (status === "approved") return <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3" />Tasdiqlandi</span>;
  return <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700"><XCircle className="h-3 w-3" />Rad etildi</span>;
};

const StatusDot = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    confirmed: "text-emerald-600",
    cancelled: "text-red-500",
    completed: "text-blue-500",
  };
  const labels: Record<string, string> = {
    confirmed: "Tasdiqlangan",
    cancelled: "Bekor",
    completed: "Yakunlangan",
  };
  return (
    <div className={`text-[10px] font-semibold ${map[status] ?? "text-muted-foreground"}`}>
      {labels[status] ?? status}
    </div>
  );
};

const FF = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
    {children}
  </div>
);

export default Owner;
