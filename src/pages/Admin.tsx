import { useEffect, useState, useMemo, useRef } from "react";
import { api, StadiumRow, EditRequestRow, ProfileRow, TransactionRow, EventRow, StadiumSummaryRow, StadiumStats, StadiumFinancial, TransferRow, UnassignedOwner, BookingRow } from "@/lib/api";
import { useAuth, loginAndStore } from "@/hooks/useAuth";
import { useSettingsStore, SiteSettings, DEFAULT_SETTINGS } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import {
  Check, X, MapPin, Loader2, Building2, Users, Search,
  CalendarCheck, CheckCircle2, XCircle, AlertCircle, LogOut,
  Ban, UserCheck, CreditCard, TrendingUp, Shield, Eye, EyeOff,
  LayoutDashboard, FileEdit, Wallet, ChevronRight, Bell,
  ArrowUpRight, Star, RefreshCw, Menu,
  PlusCircle, Trash2, ImagePlus, Plus, Palette, ArrowLeft, DollarSign,
} from "lucide-react";
import { DISTRICTS, FACILITY_LABELS, type Facility } from "@/data/stadiums";
import { toast } from "sonner";
import { formatUZS } from "@/data/stadiums";

/* ── Image upload button ── */
const UploadImgBtn = ({ onUploaded }: { onUploaded: (url: string) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await api.upload.image(file);
      onUploaded(url);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };
  return (
    <>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handle} />
      <button type="button" onClick={() => ref.current?.click()}
        title="Rasm yuklash"
        className="h-9 w-9 rounded-lg border border-border/60 bg-muted/40 hover:bg-primary/10 hover:border-primary/40 grid place-items-center shrink-0 transition-colors">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <ImagePlus className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
    </>
  );
};

/* ══════════════════════════════════════════════
   ADMIN LOGIN
══════════════════════════════════════════════ */
const AdminLogin = () => {
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    try {
      const user = await loginAndStore(email.trim(), password);
      if (!user.roles.includes("admin")) {
        toast.error("Bu hisob admin emas");
        localStorage.removeItem("st_token");
      } else {
        await refresh();
      }
    } catch (e: any) {
      toast.error(e.message || "Login yoki parol noto'g'ri");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid place-items-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="h-16 w-16 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow">
            <Shield className="h-8 w-8 text-primary-foreground" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <div className="font-display text-4xl text-foreground tracking-wide">StadionTOP</div>
            <div className="text-xs text-muted-foreground uppercase tracking-[0.2em] mt-1">Admin Dashboard</div>
          </div>
        </div>

        <form onSubmit={handleLogin}
          className="rounded-2xl border border-border bg-card p-7 space-y-5 shadow-soft">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-muted/30 h-11"
              placeholder="admin@example.com" required />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Parol</Label>
            <div className="relative">
              <Input type={showPw ? "text" : "password"} autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="bg-muted/30 h-11 pr-10"
                placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={busy}
            className="w-full h-12 bg-gradient-primary shadow-glow font-semibold text-base rounded-xl">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Kirish"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">Faqat vakolatli adminlar uchun</p>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   NAV ITEMS
══════════════════════════════════════════════ */
type NavKey = "overview" | "stadiums" | "add" | "requests" | "users" | "escrow" | "design" | "events";

const NAV: { key: NavKey; label: string; icon: React.ReactNode; badge?: (d: DashData) => number }[] = [
  { key: "overview",  label: "Umumiy",           icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: "stadiums",  label: "Stadionlar",        icon: <Building2 className="h-4 w-4" />, badge: (d) => d.stadiums.filter(s => s.status === "pending").length },
  { key: "add",       label: "Stadion qo'shish",  icon: <PlusCircle className="h-4 w-4" /> },
  { key: "requests",  label: "So'rovlar",         icon: <FileEdit className="h-4 w-4" />, badge: (d) => d.editReqs.filter(r => r.status === "pending").length },
  { key: "users",     label: "Foydalanuvchilar",  icon: <Users className="h-4 w-4" /> },
  { key: "escrow",    label: "Escrow & To'lov",   icon: <Wallet className="h-4 w-4" />, badge: (d) => d.transactions.filter(t => t.escrow_status === "held").length },
  { key: "events",    label: "Tadbirlar",         icon: <CalendarCheck className="h-4 w-4" /> },
  { key: "design",    label: "Sayt dizayni",      icon: <Palette className="h-4 w-4" /> },
];

interface DashData {
  stadiums: StadiumRow[];
  editReqs: EditRequestRow[];
  profiles: ProfileRow[];
  transactions: TransactionRow[];
  stats: { users: number; stadiums: number; bookings: number; revenue: number };
}

const FIELD_LABELS: Record<string, string> = {
  name: "Stadion nomi", price_day: "Kunduzgi narx",
  price_night: "Tungi narx", address: "Manzil",
  description: "Tavsif", size: "O'lcham",
};

/* ══════════════════════════════════════════════
   MAIN ADMIN COMPONENT
══════════════════════════════════════════════ */
const Admin = () => {
  const { isAdmin, loading: authLoading, signOut } = useAuth();
  const [page, setPage] = useState<NavKey>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailStadium, setDetailStadium] = useState<{ id: string; name: string; owner_id: string } | null>(null);

  const handleNavClick = (key: NavKey) => { setPage(key); setDetailStadium(null); setSidebarOpen(false); };
  const [data, setData] = useState<DashData>({
    stadiums: [], editReqs: [], profiles: [], transactions: [],
    stats: { users: 0, stadiums: 0, bookings: 0, revenue: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [adminResponse, setAdminResponse] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [st, er, pr, tx, s] = await Promise.all([
        api.admin.stadiums(), api.admin.editRequests(),
        api.admin.profiles(), api.admin.transactions(), api.admin.stats(),
      ]);
      setData({ stadiums: st, editReqs: er, profiles: pr, transactions: tx, stats: s });
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const setStadiumStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      await api.admin.setStadiumStatus(id, status);
      toast.success(status === "approved" ? "✅ Stadion tasdiqlandi" : "Rad etildi");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const resolveEditRequest = async (req: EditRequestRow, action: "approved" | "rejected") => {
    try {
      await api.admin.resolveEditRequest(req.id, action, adminResponse[req.id]);
      toast.success(action === "approved" ? "✅ O'zgarish qo'llanildi" : "Rad etildi");
      setAdminResponse((p) => { const n = { ...p }; delete n[req.id]; return n; });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleBlock = async (id: string, blocked: boolean) => {
    try {
      await api.admin.toggleBlock(id, !blocked);
      toast.success(!blocked ? "Foydalanuvchi bloklandi" : "Blok olib tashlandi");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleRole = async (id: string, role: string, hasRole: boolean) => {
    try {
      await api.admin.toggleRole(id, role, hasRole ? "remove" : "add");
      toast.success(hasRole ? `${role} roli olib tashlandi` : `${role} roli berildi`);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const releaseEscrow = async (txId: string) => {
    try {
      await api.admin.releaseEscrow(txId);
      toast.success("✅ To'lov chiqarildi");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  /* Derived */
  const pendingStadiums = data.stadiums.filter(s => s.status === "pending");
  const pendingReqs = data.editReqs.filter(r => r.status === "pending");
  const heldTx = data.transactions.filter(t => t.escrow_status === "held");
  const totalHeld = heldTx.reduce((s, t) => s + t.amount, 0);
  const commission = data.transactions.filter(t => t.escrow_status !== "refunded").reduce((s, t) => s + Math.round(t.amount * 0.1), 0);

  /* Chart data mock — real days from transactions */
  const revenueChart = useMemo(() => {
    const map: Record<string, number> = {};
    data.transactions.forEach(t => {
      const day = t.created_at?.slice(5, 10) ?? "?";
      map[day] = (map[day] || 0) + t.amount;
    });
    return Object.entries(map).slice(-7).map(([day, amount]) => ({ day, amount }));
  }, [data.transactions]);

  if (authLoading) return (
    <div className="min-h-screen bg-background grid place-items-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!isAdmin) return <AdminLogin />;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`w-64 min-h-screen bg-secondary flex flex-col fixed left-0 top-0 bottom-0 z-30 transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        {/* Logo */}
        <div className="p-6 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow shrink-0">
              <Shield className="h-4.5 w-4.5 text-white" strokeWidth={2} />
            </div>
            <div>
              <div className="font-display text-lg text-white leading-none">StadionTOP</div>
              <div className="text-[10px] text-white/35 uppercase tracking-widest mt-0.5">Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map(({ key, label, icon, badge }) => {
            const count = badge?.(data) ?? 0;
            const active = page === key;
            return (
              <button key={key} onClick={() => handleNavClick(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? "bg-primary text-white shadow-glow font-semibold"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}>
                <span className={active ? "text-white" : "text-white/40"}>{icon}</span>
                <span className="flex-1 text-left">{label}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    active ? "bg-white/20 text-white" : "bg-primary/80 text-white"
                  }`}>{count}</span>
                )}
                {active && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
              </button>
            );
          })}
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
              <h1 className="font-display text-2xl text-secondary">
                {NAV.find(n => n.key === page)?.label}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">StadionTOP boshqaruv paneli</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={load} className="h-9 w-9 rounded-xl bg-muted grid place-items-center hover:bg-muted/80 transition-colors">
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
            </button>
            {(pendingStadiums.length + pendingReqs.length) > 0 && (
              <div className="relative h-9 w-9 rounded-xl bg-accent/10 grid place-items-center">
                <Bell className="h-4 w-4 text-accent-foreground" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full text-[9px] text-white grid place-items-center font-bold">
                  {pendingStadiums.length + pendingReqs.length}
                </span>
              </div>
            )}
            <div className="h-9 px-3 rounded-xl bg-primary/10 text-primary text-sm font-semibold grid place-items-center">
              Admin
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">
          {loading ? (
            <div className="grid place-items-center py-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {page === "overview"  && <OverviewPage data={data} revenueChart={revenueChart} heldTx={heldTx} totalHeld={totalHeld} commission={commission} onNavigate={handleNavClick} />}
              {page === "stadiums" && !detailStadium && <StadiumsPage stadiums={data.stadiums} search={search} setSearch={setSearch} onStatus={setStadiumStatus} onDelete={async (id) => { await api.admin.deleteStadium(id); load(); }} onRefresh={load} onDetail={(id) => { const s = data.stadiums.find(s => s.id === id); setDetailStadium({ id, name: s?.name ?? "", owner_id: s?.owner_id ?? "" }); }} />}
              {page === "stadiums" && detailStadium && <StadiumDetailPage stadiumId={detailStadium.id} stadiumName={detailStadium.name} ownerId={detailStadium.owner_id} onBack={() => setDetailStadium(null)} />}
              {page === "add"      && <AddStadiumPage onCreated={() => { load(); setPage("stadiums"); }} />}
              {page === "requests" && <RequestsPage reqs={data.editReqs} search={search} setSearch={setSearch} adminResponse={adminResponse} setAdminResponse={setAdminResponse} onResolve={resolveEditRequest} />}
              {page === "users"    && <UsersPage profiles={data.profiles} stadiums={data.stadiums} search={search} setSearch={setSearch} onToggleBlock={toggleBlock} onToggleRole={toggleRole} />}
              {page === "escrow"   && <EscrowPage transactions={data.transactions} heldTx={heldTx} totalHeld={totalHeld} commission={commission} onRelease={releaseEscrow} />}
              {page === "events"   && <EventsAdminPage />}
              {page === "design"   && <SiteDesignPage />}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   OVERVIEW PAGE
══════════════════════════════════════════════ */
const OverviewPage = ({ data, revenueChart, heldTx, totalHeld, commission, onNavigate }: {
  data: DashData; revenueChart: { day: string; amount: number }[];
  heldTx: TransactionRow[]; totalHeld: number; commission: number;
  onNavigate: (p: NavKey) => void;
}) => {
  const pendingSt = data.stadiums.filter(s => s.status === "pending").length;
  const pendingRq = data.editReqs.filter(r => r.status === "pending").length;
  const [summaries, setSummaries] = useState<StadiumSummaryRow[]>([]);

  useEffect(() => {
    api.admin.stadiumSummaries().then(setSummaries).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Jami foydalanuvchilar" value={data.stats.users} color="blue" trend="+12%" up />
        <StatCard icon={<Building2 className="h-5 w-5" />} label="Jami stadionlar" value={data.stats.stadiums} color="green" trend={`${pendingSt} kutmoqda`} />
        <StatCard icon={<CalendarCheck className="h-5 w-5" />} label="Jami bronlar" value={data.stats.bookings} color="violet" trend="+8%" up />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Umumiy tushum" value={formatUZS(data.stats.revenue)} color="amber" trend="10% kom." isText />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border/60 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-semibold text-secondary">Tushum dinamikasi</div>
              <div className="text-xs text-muted-foreground mt-0.5">Oxirgi tranzaksiyalar</div>
            </div>
            <div className="text-xs text-muted-foreground bg-muted rounded-lg px-2.5 py-1">So'm</div>
          </div>
          {revenueChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenueChart}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => [formatUZS(v), "Tushum"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] grid place-items-center text-sm text-muted-foreground">
              Tranzaksiyalar yo'q
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="space-y-3">
          <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-sm">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Escrowda</div>
            <div className="font-display text-2xl text-primary mt-1">{formatUZS(totalHeld)}</div>
            <div className="text-xs text-muted-foreground mt-1">{heldTx.length} tranzaksiya kutmoqda</div>
          </div>
          <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-sm">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Komissiya (10%)</div>
            <div className="font-display text-2xl text-secondary mt-1">{formatUZS(commission)}</div>
            <div className="text-xs text-muted-foreground mt-1">Tasdiqlangan to'lovlardan</div>
          </div>
        </div>
      </div>

      {/* Action needed cards */}
      {(pendingSt > 0 || pendingRq > 0) && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <span className="font-semibold text-amber-800">Diqqat talab qiladigan holatlar</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {pendingSt > 0 && (
              <button onClick={() => onNavigate("stadiums")}
                className="flex items-center justify-between rounded-xl bg-card border border-amber-200 p-4 hover:border-primary hover:shadow-sm transition-all text-left">
                <div>
                  <div className="font-semibold text-secondary">{pendingSt} stadion</div>
                  <div className="text-xs text-muted-foreground">Tasdiqlash kutmoqda</div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            )}
            {pendingRq > 0 && (
              <button onClick={() => onNavigate("requests")}
                className="flex items-center justify-between rounded-xl bg-card border border-amber-200 p-4 hover:border-primary hover:shadow-sm transition-all text-left">
                <div>
                  <div className="font-semibold text-secondary">{pendingRq} so'rov</div>
                  <div className="text-xs text-muted-foreground">Ko'rib chiqish kerak</div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Recent stadiums */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
          <div className="font-semibold text-secondary">So'nggi stadionlar</div>
          <button onClick={() => onNavigate("stadiums")} className="text-xs text-primary hover:underline">Barchasini ko'rish</button>
        </div>
        <div className="divide-y divide-border/60">
          {data.stadiums.slice(0, 5).map((s) => (
            <div key={s.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0 font-display font-bold text-sm">
                  {s.name[0]}
                </div>
                <div>
                  <div className="font-medium text-sm text-secondary">{s.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{s.district}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-primary">{formatUZS(s.price_day)}</div>
                  <div className="text-[10px] text-muted-foreground">/kun</div>
                </div>
                <StatusPill status={s.status} />
              </div>
            </div>
          ))}
          {data.stadiums.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">Hali stadion yo'q</div>
          )}
        </div>
      </div>

      {/* Stadium today summaries */}
      {summaries.length > 0 && (
        <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60">
            <div className="font-semibold text-secondary">Bugungi stadionlar ko'rsatkichi</div>
            <div className="text-xs text-muted-foreground mt-0.5">Har bir stadionning bugungi bronlari va komissiyasi</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stadion</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Tuman</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Holat</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bugungi bronlar</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bugungi komissiya</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {summaries.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-secondary">{s.name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden sm:table-cell">{s.district}</td>
                    <td className="px-5 py-3.5 text-center"><StatusPill status={s.status} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-display text-lg text-primary">{s.today_bookings}</span>
                      <span className="text-xs text-muted-foreground ml-1">ta</span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-secondary">{formatUZS(s.today_commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════
   STADIUMS PAGE
══════════════════════════════════════════════ */
/* ── Edit modal ── */
/* EField — modul darajasida, EditStadiumModal ichida emas (focus loss oldini olish uchun) */
const EField = ({ label, children, req }: { label: string; children: React.ReactNode; req?: boolean }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
      {label}{req && <span className="text-destructive ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const EditStadiumModal = ({ stadium, onSaved, onClose }: {
  stadium: StadiumRow;
  onSaved: () => void;
  onClose: () => void;
}) => {
  const toForm = (s: StadiumRow) => ({
    name:        s.name,
    district:    s.district,
    address:     s.address,
    description: s.description || "",
    size:        s.size || "5x5",
    price_day:   String(s.price_day),
    price_night: String(s.price_night),
    lat:         s.lat != null ? String(s.lat) : "",
    lng:         s.lng != null ? String(s.lng) : "",
    facilities:  (s.facilities || []) as Facility[],
    has_referee: !!s.has_referee,
    has_video:   !!s.has_video,
    has_balls:   !!s.has_balls,
    has_bibs:    !!s.has_bibs,
    images:      (s.images?.length ? s.images : [""]) as string[],
    status:      s.status,
  });

  const [form, setForm] = useState(() => toForm(stadium));
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const toggleFacility = (f: Facility) =>
    set("facilities", form.facilities.includes(f)
      ? form.facilities.filter(x => x !== f)
      : [...form.facilities, f]);

  const setImage = (i: number, val: string) => {
    const imgs = [...form.images]; imgs[i] = val;
    set("images", imgs);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.admin.updateStadium(stadium.id, {
        name:        form.name.trim(),
        district:    form.district,
        address:     form.address.trim(),
        description: form.description.trim() || undefined,
        size:        form.size,
        price_day:   Number(form.price_day),
        price_night: Number(form.price_night),
        lat:         form.lat ? Number(form.lat) : undefined,
        lng:         form.lng ? Number(form.lng) : undefined,
        facilities:  form.facilities,
        has_referee: form.has_referee,
        has_video:   form.has_video,
        has_balls:   form.has_balls,
        has_bibs:    form.has_bibs,
        images:      form.images.filter(u => u.trim()),
        status:      form.status as any,
      });
      toast.success("✅ Stadion yangilandi");
      onSaved();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative z-10 w-full max-w-2xl h-screen bg-card shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0">
          <div>
            <div className="font-display text-xl text-secondary">Stadionni tahrirlash</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stadium.name}</div>
          </div>
          <button onClick={onClose}
            className="h-9 w-9 rounded-xl bg-muted hover:bg-muted/80 grid place-items-center transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Status */}
          <div className="flex gap-2">
            {(["approved","pending","rejected"] as const).map(st => (
              <button key={st} type="button"
                onClick={() => set("status", st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  form.status === st
                    ? st === "approved" ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                    : st === "pending"  ? "bg-amber-100 text-amber-700 border-amber-300"
                    : "bg-red-100 text-red-700 border-red-300"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}>
                {st === "approved" ? "✅ Tasdiqlangan" : st === "pending" ? "⏳ Kutmoqda" : "❌ Rad etilgan"}
              </button>
            ))}
          </div>

          {/* Basic */}
          <div className="grid sm:grid-cols-2 gap-4">
            <EField label="Nomi" req>
              <Input value={form.name} onChange={e => set("name", e.target.value)} className="bg-muted/30" />
            </EField>
            <EField label="Tuman" req>
              <select value={form.district} onChange={e => set("district", e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-muted/30 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </EField>
          </div>

          <EField label="Manzil" req>
            <Input value={form.address} onChange={e => set("address", e.target.value)} className="bg-muted/30" />
          </EField>

          <EField label="Tavsif">
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              rows={2} className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </EField>

          {/* Price & size */}
          <div className="grid grid-cols-3 gap-3">
            <EField label="Kunduzgi narx" req>
              <Input type="number" value={form.price_day} onChange={e => set("price_day", e.target.value)} className="bg-muted/30" />
            </EField>
            <EField label="Tungi narx" req>
              <Input type="number" value={form.price_night} onChange={e => set("price_night", e.target.value)} className="bg-muted/30" />
            </EField>
            <EField label="O'lcham">
              <select value={form.size} onChange={e => set("size", e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-muted/30 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </EField>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <EField label="Lat">
              <Input type="number" step="any" value={form.lat} onChange={e => set("lat", e.target.value)} className="bg-muted/30" placeholder="41.29" />
            </EField>
            <EField label="Lng">
              <Input type="number" step="any" value={form.lng} onChange={e => set("lng", e.target.value)} className="bg-muted/30" placeholder="69.24" />
            </EField>
          </div>

          {/* Facilities */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Imkoniyatlar</div>
            <div className="grid grid-cols-2 gap-2">
              {ALL_FACILITIES.map(f => (
                <label key={f} className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-all ${
                  form.facilities.includes(f) ? "border-primary bg-primary/8 text-primary font-semibold" : "border-border/60 text-muted-foreground"}`}>
                  <input type="checkbox" className="accent-primary" checked={form.facilities.includes(f)} onChange={() => toggleFacility(f)} />
                  {FACILITY_LABELS[f].uz}
                </label>
              ))}
            </div>
          </div>

          {/* Addons */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Qo'shimcha xizmatlar</div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: "has_referee" as const, label: "Hakami" },
                { key: "has_video"   as const, label: "Video yozuv" },
                { key: "has_balls"   as const, label: "To'p (2 dona)" },
                { key: "has_bibs"    as const, label: "Mayka to'plami" },
              ]).map(({ key, label }) => (
                <label key={key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-all ${
                  form[key] ? "border-primary bg-primary/8 text-primary font-semibold" : "border-border/60 text-muted-foreground"}`}>
                  <input type="checkbox" className="accent-primary" checked={!!form[key]} onChange={() => set(key, !form[key])} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Images */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Rasmlar (URL)</div>
            <div className="space-y-2">
              {form.images.map((url, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="url" value={url} onChange={e => setImage(i, e.target.value)}
                    placeholder="https://..."
                    className="flex-1 h-9 rounded-lg border border-input bg-muted/30 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <UploadImgBtn onUploaded={u => setImage(i, u)} />
                  {url.trim() && (
                    <img src={url} alt="" className="h-9 w-14 object-cover rounded-lg border border-border/40 shrink-0"
                      onError={e => { e.currentTarget.style.display = "none"; }} />
                  )}
                  {form.images.length > 1 && (
                    <button type="button" onClick={() => set("images", form.images.filter((_, idx) => idx !== i))}
                      className="h-9 w-9 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 grid place-items-center shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {form.images.length < 5 && (
                <button type="button" onClick={() => set("images", [...form.images, ""])}
                  className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Rasm qo'shish
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/60 flex gap-3 shrink-0">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Bekor qilish</Button>
          <Button type="submit" form="" disabled={busy} onClick={handleSave}
            className="flex-1 bg-gradient-primary shadow-glow rounded-xl font-semibold">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Saqlash"}
          </Button>
        </div>
      </div>
    </div>
  );
};

const StadiumsPage = ({ stadiums, search, setSearch, onStatus, onDelete, onRefresh, onDetail }: {
  stadiums: StadiumRow[]; search: string; setSearch: (s: string) => void;
  onStatus: (id: string, s: "approved" | "rejected") => void;
  onDelete?: (id: string) => void;
  onRefresh: () => void;
  onDetail?: (id: string) => void;
}) => {
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [editing, setEditing] = useState<StadiumRow | null>(null);

  const filtered = stadiums
    .filter(s => filter === "all" || s.status === filter)
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.district.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all:      stadiums.length,
    pending:  stadiums.filter(s => s.status === "pending").length,
    approved: stadiums.filter(s => s.status === "approved").length,
    rejected: stadiums.filter(s => s.status === "rejected").length,
  };

  const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='160'%3E%3Crect width='400' height='160' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='0.3em' font-size='36' fill='%23cbd5e1'%3E%E2%9A%BD%3C/text%3E%3C/svg%3E";

  return (
    <>
      {editing && (
        <EditStadiumModal
          stadium={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onRefresh(); }}
        />
      )}

      <div className="space-y-5">
        {/* Header strip */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Stadion nomi yoki tuman..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-card" />
          </div>
          <div className="flex gap-1 bg-muted/60 border border-border rounded-xl p-1">
            {(["all","pending","approved","rejected"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-secondary"}`}>
                {f === "all" ? "Barchasi" : f === "pending" ? "Kutmoqda" : f === "approved" ? "Tasdiqlangan" : "Rad etilgan"}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${filter === f ? "bg-white/20" : "bg-muted"}`}>{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <EmptyState icon={<Building2 className="h-12 w-12" />} msg="Stadion topilmadi" />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((s) => (
              <div key={s.id} className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                {/* Stadium image */}
                <div className="relative h-32 overflow-hidden bg-muted/30">
                  {s.images?.[0] ? (
                    <img src={s.images[0]} alt={s.name}
                      className="w-full h-full object-cover"
                      onError={e => { e.currentTarget.src = FALLBACK; }} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 grid place-items-center">
                      <span className="text-4xl opacity-20">⚽</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3">
                    <h3 className="font-display text-lg text-white leading-tight truncate">{s.name}</h3>
                    <div className="text-[11px] text-white/70 flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" />{s.district}
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <StatusPill status={s.status} />
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1">
                  <div className="text-xs text-muted-foreground truncate">{s.address}</div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Kunduz</div>
                      <div className="font-semibold text-primary mt-0.5 text-sm">{formatUZS(s.price_day)}</div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Tun</div>
                      <div className="font-semibold text-secondary mt-0.5 text-sm">{formatUZS(s.price_night)}</div>
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    {s.size && <span className="text-[11px] px-2 py-0.5 rounded-lg bg-muted text-muted-foreground">{s.size}</span>}
                    {s.rating && <span className="text-[11px] px-2 py-0.5 rounded-lg bg-muted text-muted-foreground flex items-center gap-1">
                      <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />{s.rating}
                    </span>}
                    <span className="text-[11px] px-2 py-0.5 rounded-lg bg-muted text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString("ru-RU")}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="pt-1 flex flex-col gap-2">
                    {/* Detail button */}
                    {onDetail && (
                      <Button size="sm" variant="outline" onClick={() => onDetail(s.id)}
                        className="w-full border-secondary/30 text-secondary hover:bg-secondary/5 rounded-xl text-sm font-semibold">
                        <Building2 className="h-3.5 w-3.5 mr-1.5" /> Batafsil
                      </Button>
                    )}
                    {/* Primary: Edit button */}
                    <Button size="sm" onClick={() => setEditing(s)}
                      className="w-full bg-gradient-primary shadow-glow rounded-xl text-sm font-semibold">
                      <FileEdit className="h-3.5 w-3.5 mr-1.5" /> Tahrirlash
                    </Button>

                    {/* Status toggle */}
                    {s.status === "pending" ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" variant="outline" onClick={() => onStatus(s.id, "rejected")}
                          className="border-destructive/40 text-destructive hover:bg-destructive/10 rounded-xl">
                          <X className="h-3.5 w-3.5 mr-1" /> Rad
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onStatus(s.id, "approved")}
                          className="border-emerald-400/60 text-emerald-700 hover:bg-emerald-50 rounded-xl">
                          <Check className="h-3.5 w-3.5 mr-1" /> Tasdiqlash
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="w-full text-xs text-muted-foreground rounded-xl"
                        onClick={() => onStatus(s.id, s.status === "approved" ? "rejected" : "approved")}>
                        {s.status === "approved" ? "Rad etish" : "Tasdiqlash"}
                      </Button>
                    )}

                    {onDelete && (
                      <Button size="sm" variant="ghost"
                        className="w-full text-xs text-destructive hover:bg-destructive/10 rounded-xl"
                        onClick={() => { if (confirm("Stadionni o'chirasizmi?")) onDelete(s.id); }}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> O'chirish
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

/* ══════════════════════════════════════════════
   REQUESTS PAGE
══════════════════════════════════════════════ */
const RequestsPage = ({ reqs, search, setSearch, adminResponse, setAdminResponse, onResolve }: {
  reqs: EditRequestRow[]; search: string; setSearch: (s: string) => void;
  adminResponse: Record<string, string>; setAdminResponse: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onResolve: (r: EditRequestRow, a: "approved" | "rejected") => void;
}) => {
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const filtered = reqs
    .filter(r => filter === "all" || r.status === filter)
    .filter(r => !search || (r.stadiums?.name ?? r.stadium_name ?? "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Stadion nomi..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
        </div>
        <div className="flex gap-1 bg-muted/60 border border-border rounded-xl p-1">
          {(["all","pending","approved","rejected"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? "bg-primary text-white" : "text-muted-foreground hover:text-secondary"}`}>
              {f === "all" ? "Barchasi" : f === "pending" ? "Kutmoqda" : f === "approved" ? "Tasdiqlangan" : "Rad etilgan"}
              <span className="ml-1.5 opacity-60">{reqs.filter(r => f === "all" || r.status === f).length}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<FileEdit className="h-12 w-12" />} msg="So'rovlar yo'q" />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-2xl bg-card border border-border/60 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div>
                  <div className="font-display text-xl text-secondary">{r.stadiums?.name ?? r.stadium_name ?? "—"}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    Supervisor: <span className="font-medium text-secondary">{r.profiles?.full_name ?? r.full_name ?? "—"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RequestStatusBadge status={r.status} />
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ru-RU")}</span>
                </div>
              </div>

              {/* Change visualization */}
              <div className="rounded-xl bg-muted/40 p-4 flex items-center gap-3 flex-wrap mb-3">
                <div className="flex-1">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{FIELD_LABELS[r.field_name] ?? r.field_name}</div>
                  <div className="line-through text-muted-foreground text-sm">{r.old_value || "—"}</div>
                </div>
                <div className="text-muted-foreground">→</div>
                <div className="flex-1">
                  <div className="text-[10px] text-primary uppercase tracking-wider mb-1">Yangi qiymat</div>
                  <div className="font-semibold text-primary text-sm">{r.new_value}</div>
                </div>
              </div>

              {r.admin_response && (
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground mb-3">
                  💬 Admin javobi: {r.admin_response}
                </div>
              )}

              {r.status === "pending" && (
                <div className="space-y-2">
                  <Input placeholder="Admin javobi (ixtiyoriy)…" value={adminResponse[r.id] ?? ""}
                    onChange={(e) => setAdminResponse((p) => ({ ...p, [r.id]: e.target.value }))}
                    className="text-sm bg-muted/30" />
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => onResolve(r, "rejected")}
                      className="border-destructive/40 text-destructive hover:bg-destructive/10 rounded-xl">
                      <XCircle className="h-4 w-4 mr-1.5" /> Rad etish
                    </Button>
                    <Button size="sm" className="bg-gradient-primary shadow-glow rounded-xl"
                      onClick={() => onResolve(r, "approved")}>
                      <CheckCircle2 className="h-4 w-4 mr-1.5" /> Tasdiqlash
                    </Button>
                  </div>
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
   USERS PAGE
══════════════════════════════════════════════ */
const UsersPage = ({ profiles, stadiums = [], search, setSearch, onToggleBlock, onToggleRole }: {
  profiles: ProfileRow[]; stadiums?: StadiumRow[]; search: string; setSearch: (s: string) => void;
  onToggleBlock: (id: string, blocked: boolean) => void;
  onToggleRole: (id: string, role: string, hasRole: boolean) => void;
}) => {
  const [userTab, setUserTab] = useState<"all" | "unassigned">("all");
  const [unassigned, setUnassigned] = useState<UnassignedOwner[]>([]);
  const [assignMap, setAssignMap] = useState<Record<string, string>>({});
  const [assigning, setAssigning] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.admin.unassignedOwners().then(setUnassigned).catch(() => {});
  }, []);

  const handleAssign = async (ownerId: string) => {
    const stadiumId = assignMap[ownerId];
    if (!stadiumId) return toast.error("Stadion tanlang");
    setAssigning(a => ({ ...a, [ownerId]: true }));
    try {
      await api.admin.assignOwner(stadiumId, ownerId);
      toast.success("✅ Stadion egaga biriktirildi");
      setUnassigned(u => u.filter(x => x.id !== ownerId));
      setAssignMap(m => { const n = { ...m }; delete n[ownerId]; return n; });
    } catch (e: any) { toast.error(e.message); }
    finally { setAssigning(a => ({ ...a, [ownerId]: false })); }
  };

  const filtered = profiles.filter(p =>
    !search ||
    (p.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (p.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const blocked = profiles.filter(p => p.is_blocked).length;
  const admins  = profiles.filter(p => p.roles?.includes("admin")).length;
  const owners  = profiles.filter(p => p.roles?.includes("owner")).length;
  const realOwnerIds = new Set(profiles.filter(p => p.roles?.includes("owner")).map(p => p.id));
  const approvedStadiums = stadiums.filter(s => s.status === "approved" && !realOwnerIds.has(s.owner_id));

  return (
    <div className="space-y-5">
      {/* Mini stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Jami",     value: profiles.length,  color: "bg-primary/10 text-primary" },
          { label: "Admin",    value: admins,            color: "bg-violet-100 text-violet-700" },
          { label: "Owner",    value: owners,            color: "bg-emerald-100 text-emerald-700" },
          { label: "Bloklangan", value: blocked,         color: "bg-destructive/10 text-destructive" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-card border border-border/60 p-3.5 shadow-sm text-center">
            <div className={`text-2xl font-display ${s.color.split(" ")[1]}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/60 border border-border rounded-xl p-1 w-fit">
        <button onClick={() => setUserTab("all")}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${userTab === "all" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-secondary"}`}>
          Barcha foydalanuvchilar
        </button>
        <button onClick={() => setUserTab("unassigned")}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${userTab === "unassigned" ? "bg-amber-500 text-white shadow-sm" : "text-muted-foreground hover:text-secondary"}`}>
          Bog'lanmagan egalar
          {unassigned.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${userTab === "unassigned" ? "bg-white/20" : "bg-amber-100 text-amber-700"}`}>{unassigned.length}</span>
          )}
        </button>
      </div>

      {/* Unassigned owners section */}
      {userTab === "unassigned" && (
        <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60">
            <div className="font-semibold text-secondary">Hali stadionga biriktirilmagan egalar</div>
            <div className="text-xs text-muted-foreground mt-0.5">Egaga stadion biriktirish uchun quyidan tanlang</div>
          </div>
          {unassigned.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Barcha egalar stadionlarga biriktirilgan</div>
          ) : (
            <div className="divide-y divide-border/60">
              {unassigned.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="h-9 w-9 rounded-full bg-gradient-primary text-white text-xs font-bold grid place-items-center shrink-0">
                    {(u.full_name || u.email || "U")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-secondary text-sm truncate">{u.full_name || "Ism yo'q"}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    {u.phone && <div className="text-xs text-muted-foreground">{u.phone}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={assignMap[u.id] ?? ""} onChange={e => setAssignMap(m => ({ ...m, [u.id]: e.target.value }))}
                      className="h-9 rounded-lg border border-input bg-muted/30 px-2 text-sm min-w-[180px] focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="">— Stadion tanlang —</option>
                      {approvedStadiums.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.district})</option>
                      ))}
                    </select>
                    <Button size="sm" onClick={() => handleAssign(u.id)} disabled={!!assigning[u.id] || !assignMap[u.id]}
                      className="bg-gradient-primary shadow-glow rounded-xl text-xs shrink-0">
                      {assigning[u.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Biriktirish"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {userTab === "all" && (<>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Ism yoki email bo'yicha qidirish..." value={search}
          onChange={e => setSearch(e.target.value)} className="pl-9 bg-card" />
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Foydalanuvchi</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Email</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Rol</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Sana</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.map((p) => (
              <tr key={p.id} className={`hover:bg-muted/20 transition-colors ${p.is_blocked ? "opacity-60" : ""}`}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-primary text-white text-xs font-bold grid place-items-center shrink-0">
                      {(p.full_name || p.email || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <div className={`font-medium ${p.is_blocked ? "line-through text-muted-foreground" : "text-secondary"}`}>
                        {p.full_name || "Ism yo'q"}
                      </div>
                      {p.is_blocked && <span className="text-[10px] text-destructive font-semibold">BLOKLANGAN</span>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell max-w-[200px]">
                  <span className="truncate block">{p.email}</span>
                </td>
                <td className="px-5 py-3.5 hidden sm:table-cell">
                  <div className="flex gap-1 flex-wrap">
                    {(p.roles as string[]).length === 0
                      ? <RolePill role="user" />
                      : (p.roles as string[]).map(r => <RolePill key={r} role={r} />)
                    }
                  </div>
                </td>
                <td className="px-5 py-3.5 text-xs text-muted-foreground hidden lg:table-cell">
                  {new Date(p.created_at).toLocaleDateString("ru-RU")}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Owner role toggle */}
                    {!p.roles?.includes("admin") && (
                      <Button size="sm" variant="outline"
                        className={`rounded-xl text-xs ${p.roles?.includes("owner")
                          ? "border-amber-400/60 text-amber-600 hover:bg-amber-50"
                          : "border-emerald-400/60 text-emerald-600 hover:bg-emerald-50"}`}
                        onClick={() => onToggleRole(p.id, "owner", !!p.roles?.includes("owner"))}>
                        {p.roles?.includes("owner")
                          ? <><UserCheck className="h-3.5 w-3.5 mr-1" />Owner olib tashlash</>
                          : <><Shield className="h-3.5 w-3.5 mr-1" />Owner qilish</>}
                      </Button>
                    )}
                    {/* Block toggle */}
                    <Button size="sm" variant="outline"
                      className={`rounded-xl text-xs ${p.is_blocked
                        ? "border-primary/40 text-primary hover:bg-primary/10"
                        : "border-destructive/40 text-destructive hover:bg-destructive/10"}`}
                      onClick={() => onToggleBlock(p.id, p.is_blocked)}>
                      {p.is_blocked
                        ? <><UserCheck className="h-3.5 w-3.5 mr-1" />Ochish</>
                        : <><Ban className="h-3.5 w-3.5 mr-1" />Bloklash</>}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">Foydalanuvchi topilmadi</div>
        )}
      </div>
      </>)}
    </div>
  );
};

/* ══════════════════════════════════════════════
   ESCROW PAGE
══════════════════════════════════════════════ */
const EscrowPage = ({ transactions, heldTx, totalHeld, commission, onRelease }: {
  transactions: TransactionRow[]; heldTx: TransactionRow[];
  totalHeld: number; commission: number; onRelease: (id: string) => void;
}) => {
  const [filter, setFilter] = useState<"all" | "held" | "released" | "refunded">("held");
  const filtered = transactions.filter(t => filter === "all" || t.escrow_status === filter);

  const barData = [
    { name: "Kutmoqda", value: heldTx.length, fill: "hsl(var(--accent))" },
    { name: "Chiqarilgan", value: transactions.filter(t => t.escrow_status === "released").length, fill: "hsl(var(--primary))" },
    { name: "Qaytarilgan", value: transactions.filter(t => t.escrow_status === "refunded").length, fill: "hsl(var(--destructive))" },
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Escrowda</div>
            <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-600 grid place-items-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="font-display text-2xl text-primary">{formatUZS(totalHeld)}</div>
          <div className="text-xs text-muted-foreground mt-1">{heldTx.length} ta tranzaksiya</div>
        </div>
        <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Komissiya (10%)</div>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="font-display text-2xl text-secondary">{formatUZS(commission)}</div>
          <div className="text-xs text-muted-foreground mt-1">Tasdiqlangan to'lovlardan</div>
        </div>
        <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Supervisor ulushi (90%)</div>
            <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-600 grid place-items-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="font-display text-2xl text-secondary">{formatUZS(Math.round(totalHeld * 0.9))}</div>
          <div className="text-xs text-muted-foreground mt-1">Chiqarilishi kerak</div>
        </div>
      </div>

      {/* Chart + table row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-sm">
          <div className="font-semibold text-secondary mb-4 text-sm">Escrow holati</div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={barData} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <div className="flex gap-1 bg-muted/60 border border-border rounded-xl p-1 w-fit">
            {(["all","held","released","refunded"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? "bg-primary text-white" : "text-muted-foreground hover:text-secondary"}`}>
                {f === "all" ? "Barchasi" : f === "held" ? "Kutmoqda" : f === "released" ? "Chiqarilgan" : "Qaytarilgan"}
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bron kodi</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">To'lov usuli</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Miqdor</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Holat</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-mono text-sm font-bold text-secondary">{t.bookings?.short_code ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{t.bookings?.booking_date}</div>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className="px-2 py-1 rounded-lg bg-muted text-xs font-semibold">{t.provider?.toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="font-semibold text-secondary">{formatUZS(t.amount)}</div>
                      <div className="text-[10px] text-primary">kom: {formatUZS(Math.round(t.amount * 0.1))}</div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <EscrowPill status={t.escrow_status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {t.escrow_status === "held" ? (
                        <Button size="sm" onClick={() => onRelease(t.id)}
                          className="bg-gradient-primary shadow-glow text-xs rounded-xl">
                          <CreditCard className="h-3.5 w-3.5 mr-1" /> Chiqarish
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t.released_at ? new Date(t.released_at).toLocaleDateString("ru-RU") : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">Tranzaksiyalar yo'q</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   ADD STADIUM PAGE
══════════════════════════════════════════════ */
const ALL_FACILITIES: Facility[] = ["shower","dressing","parking","lights","artificial","natural","cafe","wifi"];
const SIZES = ["5x5","6x6","7x7","8x8","11x11"] as const;

const EMPTY_FORM = {
  name: "", district: DISTRICTS[0], address: "", description: "",
  size: "5x5" as string,
  price_day: "", price_night: "",
  lat: "", lng: "",
  facilities: [] as Facility[],
  has_referee: false, has_video: false, has_balls: false, has_bibs: false,
  images: [""],
};

/* Field must be defined OUTSIDE AddStadiumPage to avoid remount on every keystroke */
const FormField = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {label}{required && <span className="text-destructive ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const AddStadiumPage = ({ onCreated }: { onCreated: () => void }) => {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof EMPTY_FORM, v: unknown) =>
    setForm(f => ({ ...f, [k]: v }));

  const toggleFacility = (f: Facility) =>
    set("facilities", form.facilities.includes(f)
      ? form.facilities.filter(x => x !== f)
      : [...form.facilities, f]);

  const setImage = (i: number, val: string) => {
    const imgs = [...form.images];
    imgs[i] = val;
    set("images", imgs);
  };

  const addImage = () => set("images", [...form.images, ""]);
  const removeImage = (i: number) => set("images", form.images.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.district || !form.address.trim() || !form.price_day || !form.price_night) {
      toast.error("Majburiy maydonlarni to'ldiring");
      return;
    }
    setBusy(true);
    try {
      await api.admin.createStadium({
        name: form.name.trim(),
        district: form.district,
        address: form.address.trim(),
        description: form.description.trim() || undefined,
        size: form.size,
        price_day: Number(form.price_day),
        price_night: Number(form.price_night),
        lat: form.lat ? Number(form.lat) : undefined,
        lng: form.lng ? Number(form.lng) : undefined,
        facilities: form.facilities,
        has_referee: form.has_referee,
        has_video: form.has_video,
        has_balls: form.has_balls,
        has_bibs: form.has_bibs,
        images: form.images.filter(u => u.trim()),
      } as any);
      toast.success("✅ Stadion muvaffaqiyatli qo'shildi!");
      setForm({ ...EMPTY_FORM });
      onCreated();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {/* ── Basic info ── */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-sm p-6 space-y-5">
        <h3 className="font-display text-xl text-secondary flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" /> Asosiy ma'lumotlar
        </h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Stadion nomi" required>
            <Input value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="Masalan: Green Arena" className="bg-muted/30" />
          </FormField>

          <FormField label="Tuman" required>
            <select value={form.district} onChange={e => set("district", e.target.value)}
              className="w-full h-10 rounded-lg border border-input bg-muted/30 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </FormField>
        </div>

        <FormField label="Manzil" required>
          <Input value={form.address} onChange={e => set("address", e.target.value)}
            placeholder="Ko'cha, uy raqami, Toshkent" className="bg-muted/30" />
        </FormField>

        <FormField label="Tavsif">
          <textarea value={form.description} onChange={e => set("description", e.target.value)}
            rows={3} placeholder="Stadion haqida qisqacha..."
            className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </FormField>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Koordinata (lat)">
            <Input type="number" step="any" value={form.lat} onChange={e => set("lat", e.target.value)}
              placeholder="41.2995" className="bg-muted/30" />
          </FormField>
          <FormField label="Koordinata (lng)">
            <Input type="number" step="any" value={form.lng} onChange={e => set("lng", e.target.value)}
              placeholder="69.2401" className="bg-muted/30" />
          </FormField>
        </div>
      </div>

      {/* ── Pricing & size ── */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-sm p-6 space-y-5">
        <h3 className="font-display text-xl text-secondary flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" /> Narx va o'lcham
        </h3>

        <div className="grid sm:grid-cols-3 gap-4">
          <FormField label="Kunduzgi narx (so'm)" required>
            <Input type="number" min={0} value={form.price_day} onChange={e => set("price_day", e.target.value)}
              placeholder="250000" className="bg-muted/30" />
          </FormField>
          <FormField label="Tungi narx (so'm)" required>
            <Input type="number" min={0} value={form.price_night} onChange={e => set("price_night", e.target.value)}
              placeholder="350000" className="bg-muted/30" />
          </FormField>
          <FormField label="Maydon o'lchami">
            <select value={form.size} onChange={e => set("size", e.target.value)}
              className="w-full h-10 rounded-lg border border-input bg-muted/30 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
        </div>
      </div>

      {/* ── Facilities ── */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-sm p-6 space-y-4">
        <h3 className="font-display text-xl text-secondary flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" /> Xizmatlar va imkoniyatlar
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ALL_FACILITIES.map(f => (
            <label key={f}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-all text-sm ${
                form.facilities.includes(f)
                  ? "border-primary bg-primary/8 text-primary font-semibold"
                  : "border-border/60 hover:border-primary/40 text-muted-foreground"
              }`}>
              <input type="checkbox" className="accent-primary h-3.5 w-3.5"
                checked={form.facilities.includes(f)}
                onChange={() => toggleFacility(f)} />
              {FACILITY_LABELS[f].uz}
            </label>
          ))}
        </div>

        <div className="pt-2 border-t border-border/60">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Qo'shimcha xizmatlar</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              { key: "has_referee", label: "Hakami" },
              { key: "has_video",   label: "Video yozuv" },
              { key: "has_balls",   label: "To'p (2 dona)" },
              { key: "has_bibs",    label: "Mayka to'plami" },
            ] as { key: keyof typeof EMPTY_FORM; label: string }[]).map(({ key, label }) => (
              <label key={key}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-all text-sm ${
                  form[key]
                    ? "border-primary bg-primary/8 text-primary font-semibold"
                    : "border-border/60 hover:border-primary/40 text-muted-foreground"
                }`}>
                <input type="checkbox" className="accent-primary h-3.5 w-3.5"
                  checked={!!form[key]}
                  onChange={() => set(key, !form[key])} />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── Images ── */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-sm p-6 space-y-4">
        <h3 className="font-display text-xl text-secondary flex items-center gap-2">
          <ImagePlus className="h-5 w-5 text-primary" /> Stadion rasmlari
        </h3>
        <p className="text-xs text-muted-foreground">Har bir rasm URL manzilini kiriting (loremflickr, pexels yoki boshqa CDN)</p>

        <div className="space-y-3">
          {form.images.map((url, i) => (
            <div key={i} className="flex gap-2">
              <div className="flex-1 flex gap-2 items-center rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                <ImagePlus className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="url"
                  value={url}
                  onChange={e => setImage(i, e.target.value)}
                  placeholder={`https://loremflickr.com/900/600/stadium?lock=${i + 1}`}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                />
                {url.trim() && (
                  <img src={url} alt="" className="h-8 w-12 object-cover rounded-md border border-border/40 shrink-0"
                    onError={e => { e.currentTarget.style.display = "none"; }} />
                )}
              </div>
              <UploadImgBtn onUploaded={u => setImage(i, u)} />
              {form.images.length > 1 && (
                <button type="button" onClick={() => removeImage(i)}
                  className="h-10 w-10 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 grid place-items-center transition-colors shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {form.images.length < 5 && (
          <button type="button" onClick={addImage}
            className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
            <Plus className="h-4 w-4" /> Rasm qo'shish
          </button>
        )}
      </div>

      {/* ── Submit ── */}
      <div className="flex gap-3 justify-end pb-8">
        <Button type="button" variant="outline" onClick={() => setForm({ ...EMPTY_FORM })} className="rounded-xl px-6">
          Tozalash
        </Button>
        <Button type="submit" disabled={busy}
          className="bg-gradient-primary shadow-glow rounded-xl px-8 h-11 text-base font-semibold">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><PlusCircle className="h-4 w-4 mr-2" /> Stadion qo'shish</>}
        </Button>
      </div>
    </form>
  );
};

/* ══════════════════════════════════════════════
   STADIUM DETAIL PAGE
══════════════════════════════════════════════ */
const StadiumDetailPage = ({ stadiumId, stadiumName, ownerId, onBack }: {
  stadiumId: string; stadiumName: string; ownerId: string; onBack: () => void;
}) => {
  const [stats, setStats] = useState<StadiumStats | null>(null);
  const [financial, setFinancial] = useState<StadiumFinancial | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [payFilter, setPayFilter] = useState("");
  const [bkFilter, setBkFilter] = useState("");
  const [transferAmt, setTransferAmt] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [addingTransfer, setAddingTransfer] = useState(false);

  /* Owner assignment */
  const [allOwners, setAllOwners] = useState<UnassignedOwner[]>([]);
  const [currentOwnerId, setCurrentOwnerId] = useState(ownerId);
  const [selectedOwner, setSelectedOwner] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    api.admin.owners().then(setAllOwners).catch(() => {});
  }, []);

  const currentOwner = allOwners.find(o => o.id === currentOwnerId);

  const handleAssignOwner = async () => {
    if (!selectedOwner) return toast.error("Egani tanlang");
    setAssigning(true);
    try {
      await api.admin.assignOwner(stadiumId, selectedOwner);
      setCurrentOwnerId(selectedOwner);
      setSelectedOwner("");
      toast.success("✅ Stadion egaga biriktirildi");
    } catch (e: any) { toast.error(e.message); }
    finally { setAssigning(false); }
  };

  const fmtDate = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  const setPreset = (preset: "today" | "week" | "month") => {
    const now = new Date();
    const todayStr = fmtDate(now);
    if (preset === "today") {
      setFromDate(todayStr); setToDate(todayStr);
    } else if (preset === "week") {
      const mon = new Date(now);
      const day = now.getDay();
      mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      setFromDate(fmtDate(mon)); setToDate(todayStr);
    } else {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(fmtDate(first)); setToDate(todayStr);
    }
  };

  const loadBase = async () => {
    setLoading(true);
    try {
      const [st, tr] = await Promise.all([
        api.admin.stadiumStats(stadiumId),
        api.admin.stadiumTransfers(stadiumId),
      ]);
      setStats(st); setTransfers(tr);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const loadFiltered = async () => {
    try {
      const [fin, bks] = await Promise.all([
        api.admin.stadiumFinancial(stadiumId, { from: fromDate || undefined, to: toDate || undefined }),
        api.admin.stadiumBookings(stadiumId, {
          from: fromDate || undefined, to: toDate || undefined,
          payment_status: payFilter || undefined, booking_status: bkFilter || undefined,
        }),
      ]);
      setFinancial(fin); setBookings(bks);
    } catch (e: any) { toast.error(e.message); }
  };

  useEffect(() => { loadBase(); }, [stadiumId]);
  useEffect(() => { loadFiltered(); }, [stadiumId, fromDate, toDate, payFilter, bkFilter]);

  const handleAddTransfer = async () => {
    if (!transferAmt) return toast.error("Miqdor kiriting");
    setAddingTransfer(true);
    try {
      await api.admin.addTransfer(stadiumId, { amount: Number(transferAmt), note: transferNote || undefined });
      toast.success("✅ O'tkazma qo'shildi");
      setTransferAmt(""); setTransferNote("");
      const [tr, fin] = await Promise.all([
        api.admin.stadiumTransfers(stadiumId),
        api.admin.stadiumFinancial(stadiumId, { from: fromDate || undefined, to: toDate || undefined }),
      ]);
      setTransfers(tr); setFinancial(fin);
    } catch (e: any) { toast.error(e.message); }
    finally { setAddingTransfer(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="h-9 w-9 rounded-xl bg-muted hover:bg-muted/80 grid place-items-center transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <div>
          <h2 className="font-display text-2xl text-secondary">{stadiumName}</h2>
          <div className="text-xs text-muted-foreground">Stadion batafsil ma'lumotlari</div>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4">
              <StatCard icon={<CalendarCheck className="h-5 w-5" />} label="Bugungi bronlar" value={stats.today} color="blue" />
              <StatCard icon={<CalendarCheck className="h-5 w-5" />} label="Haftalik bronlar" value={stats.week} color="green" />
              <StatCard icon={<CalendarCheck className="h-5 w-5" />} label="Oylik bronlar" value={stats.month} color="violet" />
            </div>
          )}

          {/* Owner section */}
          <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div className="font-semibold text-secondary">Stadion egasi</div>
            </div>
            <div className="p-5 space-y-4">
              {/* Current owner card */}
              {currentOwner ? (
                <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-primary text-white text-sm font-bold grid place-items-center shrink-0">
                    {(currentOwner.full_name || currentOwner.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-secondary text-sm truncate">
                      {currentOwner.full_name || "Ism yo'q"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{currentOwner.email}</div>
                    {currentOwner.phone && (
                      <div className="text-xs text-muted-foreground">{currentOwner.phone}</div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 uppercase shrink-0">
                    Joriy ega
                  </span>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground text-center">
                  Hali ega biriktirilmagan
                </div>
              )}

              {/* Reassign form */}
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-52 space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {currentOwner ? "Egani o'zgartirish" : "Ega tayinlash"}
                  </label>
                  <select
                    value={selectedOwner}
                    onChange={e => setSelectedOwner(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-muted/30 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">— Egani tanlang —</option>
                    {allOwners.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.full_name || "Ism yo'q"} — {o.phone || o.email}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={handleAssignOwner}
                  disabled={assigning || !selectedOwner}
                  className="bg-gradient-primary shadow-glow h-9 rounded-xl text-sm shrink-0"
                >
                  {assigning
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <><UserCheck className="h-3.5 w-3.5 mr-1.5" />Tayinlash</>
                  }
                </Button>
              </div>
            </div>
          </div>

          {/* Date + status filters */}
          <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-sm space-y-3">
            {/* Quick period presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Davr:</span>
              {(["today", "week", "month"] as const).map((p) => (
                <button key={p} onClick={() => setPreset(p)}
                  className="h-7 px-3 rounded-lg border border-border/60 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all">
                  {p === "today" ? "Bugun" : p === "week" ? "Shu hafta" : "Shu oy"}
                </button>
              ))}
            </div>
            {/* Custom range + status filters */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Maxsus:</span>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground">Dan:</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-muted/30 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-muted-foreground">Gacha:</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-muted/30 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <select value={payFilter} onChange={e => setPayFilter(e.target.value)}
                className="h-8 rounded-lg border border-input bg-muted/30 px-2 text-xs">
                <option value="">Barcha to'lov</option>
                <option value="full">To'liq</option>
                <option value="deposit">30% avans</option>
              </select>
              <select value={bkFilter} onChange={e => setBkFilter(e.target.value)}
                className="h-8 rounded-lg border border-input bg-muted/30 px-2 text-xs">
                <option value="">Barcha holat</option>
                <option value="confirmed">Tasdiqlangan</option>
                <option value="cancelled">Bekor qilingan</option>
                <option value="completed">Tugallangan</option>
              </select>
              {(fromDate || toDate || payFilter || bkFilter) && (
                <button onClick={() => { setFromDate(""); setToDate(""); setPayFilter(""); setBkFilter(""); }}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                  Tozalash ×
                </button>
              )}
            </div>
          </div>

          {/* Financial summary */}
          {financial && (
            <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <div className="font-semibold text-secondary">Moliyaviy hisobot</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-5">
                <div className="rounded-xl bg-muted/40 p-4">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Kutilgan tushum</div>
                  <div className="font-display text-xl text-secondary">{formatUZS(financial.total_expected)}</div>
                </div>
                <div className="rounded-xl bg-muted/40 p-4">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Jami to'langan</div>
                  <div className="font-display text-xl text-primary">{formatUZS(financial.total_paid)}</div>
                </div>
                <div className="rounded-xl bg-muted/40 p-4">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Komissiya (10%)</div>
                  <div className="font-display text-xl text-secondary">{formatUZS(financial.commission)}</div>
                </div>
                <div className="rounded-xl bg-muted/40 p-4">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Egaga (90%)</div>
                  <div className="font-display text-xl text-secondary">{formatUZS(financial.net_to_owner)}</div>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                  <div className="text-[10px] text-emerald-600 uppercase tracking-wider mb-1">O'tkazilgan</div>
                  <div className="font-display text-xl text-emerald-700">{formatUZS(financial.transferred)}</div>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                  <div className="text-[10px] text-amber-600 uppercase tracking-wider mb-1">Kutilayotgan</div>
                  <div className="font-display text-xl text-amber-700">{formatUZS(financial.pending_transfer)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Bookings table */}
          <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60">
              <div className="font-semibold text-secondary">Bronlar ({bookings.length})</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kod</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Foydalanuvchi</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sana</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vaqt</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jami</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">To'langan</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">To'lov turi</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Holat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-sm font-bold text-secondary">#{b.short_code}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-secondary text-sm">{b.customer_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{b.customer_phone || ""}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{b.booking_date}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {String(b.hour).padStart(2,"0")}:00–{String(b.hour + b.duration).padStart(2,"0")}:00
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{formatUZS(b.total)}</td>
                      <td className="px-4 py-3 text-right text-primary font-semibold">{formatUZS(b.paid_amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          b.payment_kind === "full" ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700"
                        }`}>
                          {b.payment_kind === "full" ? "To'liq" : "Avans"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          b.status === "confirmed" ? "bg-emerald-100 text-emerald-700" :
                          b.status === "cancelled" ? "bg-red-100 text-red-700" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {b.status === "confirmed" ? "Tasdiqlangan" : b.status === "cancelled" ? "Bekor" : b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bookings.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">Bronlar topilmadi</div>
              )}
            </div>
          </div>

          {/* Transfers */}
          <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60">
              <div className="font-semibold text-secondary">O'tkazma tarixi</div>
            </div>
            <div className="p-5 border-b border-border/60 bg-muted/20">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1.5 flex-1 min-w-36">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Miqdor (so'm)</label>
                  <Input type="number" min={0} value={transferAmt} onChange={e => setTransferAmt(e.target.value)}
                    placeholder="500000" className="bg-card h-9" />
                </div>
                <div className="space-y-1.5 flex-1 min-w-48">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Izoh (ixtiyoriy)</label>
                  <Input value={transferNote} onChange={e => setTransferNote(e.target.value)}
                    placeholder="Oylik hisob-kitob..." className="bg-card h-9" />
                </div>
                <Button onClick={handleAddTransfer} disabled={addingTransfer}
                  className="bg-gradient-primary shadow-glow h-9 rounded-xl text-sm shrink-0">
                  {addingTransfer ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-3.5 w-3.5 mr-1.5" />O'tkazma qo'shish</>}
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sana</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Miqdor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Izoh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {transfers.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{new Date(t.created_at).toLocaleDateString("ru-RU")}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatUZS(t.amount)}</td>
                      <td className="px-4 py-3 text-secondary">{t.admin_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transfers.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">O'tkazmalar yo'q</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════
   SITE DESIGN PAGE
══════════════════════════════════════════════ */
const TF = ({ label, value, onChange, placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean;
}) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
    {multiline ? (
      <textarea value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={2}
        className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
    ) : (
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="bg-muted/30" />
    )}
  </div>
);

/* ══════════════════════════════════════════════
   EVENTS ADMIN PAGE
══════════════════════════════════════════════ */
const EMPTY_EVENT: Partial<EventRow> = {
  league: "", title: "", home_team: "", away_team: "",
  event_date: "", venue: "", district: "", price_per_seat: 0,
  capacity: 100, accent: "from-primary/30 to-primary/10", emoji: "🏆",
  image_url: "", is_active: true,
};

/* EF — modul darajasida (focus loss oldini olish) */
const EF = (
  key: keyof EventRow,
  form: Partial<EventRow>,
  setForm: React.Dispatch<React.SetStateAction<Partial<EventRow>>>
) => ({
  value: (form[key] ?? "") as string,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value })),
});

const EventsAdminPage = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | "add" | EventRow>(null);
  const [form, setForm] = useState<Partial<EventRow>>(EMPTY_EVENT);
  const [busy, setBusy] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setEvents(await api.events.adminList()); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ ...EMPTY_EVENT }); setModal("add"); };
  const openEdit = (ev: EventRow) => { setForm({ ...ev }); setModal(ev); };

  const save = async () => {
    if (!form.league || !form.title || !form.event_date || !form.venue) {
      return toast.error("Majburiy maydonlarni to'ldiring");
    }
    setBusy(true);
    try {
      if (modal === "add") {
        await api.events.adminCreate(form);
        toast.success("Tadbir qo'shildi");
      } else {
        await api.events.adminUpdate((modal as EventRow).id, form);
        toast.success("Saqlandi");
      }
      setModal(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Tadbirni o'chirasizmi?")) return;
    try { await api.events.adminDelete(id); toast.success("O'chirildi"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const uploadEventImg = async (file: File) => {
    setImgBusy(true);
    try {
      const url = await api.upload.image(file);
      setForm(f => ({ ...f, image_url: url }));
    } catch (e: any) { toast.error(e.message); }
    finally { setImgBusy(false); }
  };

  const F = (key: keyof EventRow) => EF(key, form, setForm);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Tadbirlar boshqaruvi</h2>
        <Button onClick={openAdd} className="bg-gradient-primary shadow-glow gap-2">
          <Plus className="h-4 w-4" /> Tadbir qo'shish
        </Button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3">Tadbir</th>
                <th className="px-4 py-3">Liga</th>
                <th className="px-4 py-3">Sana</th>
                <th className="px-4 py-3">Narx</th>
                <th className="px-4 py-3">O'rindiq</th>
                <th className="px-4 py-3">Holat</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.map(ev => (
                <tr key={ev.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">
                    <div className="flex items-center gap-2.5">
                      {ev.image_url
                        ? <img src={ev.image_url} alt="" className="h-8 w-12 object-cover rounded-lg border border-border/40 shrink-0"
                            onError={e => { e.currentTarget.style.display = "none"; }} />
                        : <div className="h-8 w-12 rounded-lg bg-muted/50 grid place-items-center shrink-0 text-lg">{ev.emoji}</div>}
                      <span>{ev.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{ev.league}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(ev.event_date).toLocaleDateString("uz-UZ")}
                  </td>
                  <td className="px-4 py-3 text-foreground">{formatUZS(ev.price_per_seat)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{ev.taken}/{ev.capacity}</td>
                  <td className="px-4 py-3">
                    <Badge className={ev.is_active ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground"}>
                      {ev.is_active ? "Faol" : "Nofaol"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(ev)}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                        <FileEdit className="h-4 w-4" />
                      </button>
                      <button onClick={() => del(ev.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!events.length && (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Tadbirlar yo'q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-semibold text-foreground">
                {modal === "add" ? "Yangi tadbir" : "Tadbir tahrirlash"}
              </h3>
              <button onClick={() => setModal(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Sarlavha *</Label>
                  <Input {...F("title")} placeholder="El Clásico" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Liga *</Label>
                  <Input {...F("league")} placeholder="La Liga" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Emoji</Label>
                  <Input {...F("emoji")} placeholder="🏆" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Uy jamoasi</Label>
                  <Input {...F("home_team")} placeholder="Real Madrid" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mehmon jamoasi</Label>
                  <Input {...F("away_team")} placeholder="Barcelona" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Sana va vaqt *</Label>
                  <Input type="datetime-local"
                    value={form.event_date ? form.event_date.slice(0, 16) : ""}
                    onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Manzil *</Label>
                  <Input {...F("venue")} placeholder="Soccer City Fan-Zone" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tuman</Label>
                  <Input {...F("district")} placeholder="Yunusobod" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Narx (so'm)</Label>
                  <Input type="number" min={0}
                    value={form.price_per_seat ?? 0}
                    onChange={e => setForm(f => ({ ...f, price_per_seat: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Sig'im</Label>
                  <Input type="number" min={1}
                    value={form.capacity ?? 100}
                    onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Rang gradient (Tailwind)</Label>
                  <Input {...F("accent")} placeholder="from-primary/30 to-primary/10" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Rasm (URL yoki yuklang)</Label>
                  <div className="flex gap-2 items-center">
                    <Input {...F("image_url")} placeholder="https://... yoki quyida yuklang" className="flex-1" />
                    <label className="h-9 w-9 rounded-lg border border-border/60 bg-muted/40 hover:bg-primary/10 hover:border-primary/40 grid place-items-center shrink-0 cursor-pointer transition-colors">
                      {imgBusy
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        : <ImagePlus className="h-3.5 w-3.5 text-muted-foreground" />}
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadEventImg(f); }} />
                    </label>
                  </div>
                  {form.image_url && (
                    <img src={form.image_url} alt="preview"
                      className="h-24 w-full object-cover rounded-xl border border-border/60 mt-1"
                      onError={e => { e.currentTarget.style.display = "none"; }} />
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer col-span-2">
                  <input type="checkbox" checked={form.is_active ?? true}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  Faol
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={save} disabled={busy} className="flex-1 bg-gradient-primary shadow-glow">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Saqlash"}
                </Button>
                <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Bekor</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SiteDesignPage = () => {
  const { settings, save } = useSettingsStore();
  const [form, setForm] = useState<SiteSettings>(() =>
    JSON.parse(JSON.stringify(settings ?? DEFAULT_SETTINGS))
  );
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"hero" | "stats" | "sections" | "testimonials" | "howItWorks" | "ownerBenefits" | "cta" | "contact">("hero");

  useEffect(() => {
    if (settings) setForm(JSON.parse(JSON.stringify(settings)));
  }, [settings]);

  const setField = (path: string, value: unknown) => {
    setForm(prev => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev)) as SiteSettings;
      const keys = path.split(".");
      let obj: any = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const handleSave = async () => {
    if (!form) return;
    setBusy(true);
    try {
      await save(form);
      toast.success("✅ O'zgarishlar saqlandi");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const TABS = [
    { key: "hero",          label: "Hero Banner" },
    { key: "stats",         label: "Statistika" },
    { key: "sections",      label: "Bo'limlar" },
    { key: "testimonials",  label: "Testimoniallar" },
    { key: "howItWorks",    label: "3 Qadam" },
    { key: "ownerBenefits", label: "Egalar uchun" },
    { key: "cta",           label: "CTA" },
    { key: "contact",       label: "Aloqa" },
  ] as const;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Tabs */}
      <div className="flex gap-1 bg-muted/60 border border-border rounded-xl p-1 flex-wrap">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === key ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-secondary"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Hero Tab ── */}
      {activeTab === "hero" && (
        <div className="space-y-5">
          {/* Slides */}
          <div className="rounded-2xl bg-card border border-border/60 shadow-sm p-6 space-y-4">
            <h3 className="font-display text-xl text-secondary">Slaydlar (Fon rasmlari)</h3>
            <p className="text-xs text-muted-foreground">Har bir slayd uchun rasm URL va yorliq kiriting</p>
            <div className="space-y-3">
              {form.hero.slides.map((slide, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="flex-1 grid sm:grid-cols-2 gap-2">
                    <input type="url" value={slide.url}
                      onChange={e => {
                        const slides = [...form.hero.slides];
                        slides[i] = { ...slides[i], url: e.target.value };
                        setField("hero.slides", slides);
                      }}
                      placeholder="https://..."
                      className="h-10 rounded-lg border border-input bg-muted/30 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <input type="text" value={slide.label}
                      onChange={e => {
                        const slides = [...form.hero.slides];
                        slides[i] = { ...slides[i], label: e.target.value };
                        setField("hero.slides", slides);
                      }}
                      placeholder="Stadion nomi · Shahar"
                      className="h-10 rounded-lg border border-input bg-muted/30 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  {slide.url && (
                    <img src={slide.url} alt="" className="h-10 w-16 object-cover rounded-lg border border-border/40 shrink-0"
                      onError={e => { e.currentTarget.style.display = "none"; }} />
                  )}
                  {form.hero.slides.length > 1 && (
                    <button type="button"
                      onClick={() => setField("hero.slides", form.hero.slides.filter((_, idx) => idx !== i))}
                      className="h-10 w-10 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 grid place-items-center shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {form.hero.slides.length < 6 && (
              <button type="button"
                onClick={() => setField("hero.slides", [...form.hero.slides, { url: "", label: "" }])}
                className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
                <Plus className="h-4 w-4" /> Yangi slayd qo'shish
              </button>
            )}
          </div>

          {/* Texts UZ */}
          <div className="rounded-2xl bg-card border border-border/60 shadow-sm p-6 space-y-4">
            <h3 className="font-display text-xl text-secondary">Matn — O'zbek tili</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <TF label="Badge" value={form.hero.texts.uz.badge} onChange={v => setField("hero.texts.uz.badge", v)} placeholder="Toshkent · 100+ stadion" />
              <TF label="1-qator (Katta, oq)" value={form.hero.texts.uz.line1} onChange={v => setField("hero.texts.uz.line1", v)} placeholder="Maydon top." />
              <TF label="2-qator (Gradient rang)" value={form.hero.texts.uz.line2} onChange={v => setField("hero.texts.uz.line2", v)} placeholder="O'yna." />
              <TF label="3-qator (Soyali)" value={form.hero.texts.uz.line3} onChange={v => setField("hero.texts.uz.line3", v)} placeholder="G'olib bo'l." />
            </div>
            <TF label="Tavsif matni" value={form.hero.texts.uz.subtitle} onChange={v => setField("hero.texts.uz.subtitle", v)} placeholder="Toshkentdagi 100+ stadiondan birini real vaqtda band qiling." multiline />
          </div>

          {/* Texts RU */}
          <div className="rounded-2xl bg-card border border-border/60 shadow-sm p-6 space-y-4">
            <h3 className="font-display text-xl text-secondary">Matn — Rus tili</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <TF label="Badge" value={form.hero.texts.ru.badge} onChange={v => setField("hero.texts.ru.badge", v)} placeholder="Ташкент · 100+ стадионов" />
              <TF label="1-qator (Katta, oq)" value={form.hero.texts.ru.line1} onChange={v => setField("hero.texts.ru.line1", v)} placeholder="Найди поле." />
              <TF label="2-qator (Gradient rang)" value={form.hero.texts.ru.line2} onChange={v => setField("hero.texts.ru.line2", v)} placeholder="Играй." />
              <TF label="3-qator (Soyali)" value={form.hero.texts.ru.line3} onChange={v => setField("hero.texts.ru.line3", v)} placeholder="Побеждай." />
            </div>
            <TF label="Tavsif matni" value={form.hero.texts.ru.subtitle} onChange={v => setField("hero.texts.ru.subtitle", v)} placeholder="Забронируйте одно из 100+ полей Ташкента в реальном времени." multiline />
          </div>
        </div>
      )}

      {/* ── Stats Tab ── */}
      {activeTab === "stats" && (
        <div className="rounded-2xl bg-card border border-border/60 shadow-sm p-6 space-y-5">
          <h3 className="font-display text-xl text-secondary">Statistika raqamlari</h3>
          <p className="text-xs text-muted-foreground">Hero banneri va asosiy sahifadagi statistika bloklari</p>
          <div className="space-y-4">
            {form.stats.map((s, i) => (
              <div key={i} className="grid grid-cols-3 gap-3">
                <TF label={`${i + 1}. Qiymat`} value={s.value}
                  onChange={v => {
                    const stats = [...form.stats];
                    stats[i] = { ...stats[i], value: v };
                    setField("stats", stats);
                  }} placeholder="100+" />
                <TF label="O'zbek (yorliq)" value={s.label_uz}
                  onChange={v => {
                    const stats = [...form.stats];
                    stats[i] = { ...stats[i], label_uz: v };
                    setField("stats", stats);
                  }} placeholder="Stadion" />
                <TF label="Rus (yorliq)" value={s.label_ru}
                  onChange={v => {
                    const stats = [...form.stats];
                    stats[i] = { ...stats[i], label_ru: v };
                    setField("stats", stats);
                  }} placeholder="Стадионов" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sections Tab ── */}
      {activeTab === "sections" && (
        <div className="rounded-2xl bg-card border border-border/60 shadow-sm p-6 space-y-5">
          <h3 className="font-display text-xl text-secondary">Bo'limlarni ko'rsatish / yashirish</h3>
          <p className="text-xs text-muted-foreground">O'chirilgan bo'limlar barcha foydalanuvchilarga ko'rinmaydi</p>
          <div className="space-y-3">
            {([
              { key: "statsBar",    label: "Statistika chizig'i (animatsiyali raqamlar)" },
              { key: "howItWorks",  label: "Qanday ishlaydi? (3 qadam bo'limi)" },
              { key: "testimonials",label: "Mijozlar fikrlari (Testimoniallar)" },
              { key: "trustStats",  label: "Ishonch statistikasi (100+, 10 000+ qatorlari)" },
              { key: "ctaBanner",   label: "CTA Banner (Stadion egasimisiz?)" },
              { key: "footer",      label: "Footer (pastki qism, aloqa)" },
            ] as { key: keyof typeof form.sections; label: string }[]).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="font-medium text-secondary text-sm">{label}</div>
                <button
                  type="button"
                  onClick={() => setField(`sections.${key}`, !form.sections[key])}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${form.sections[key] ? "bg-primary" : "bg-muted-foreground/30"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${form.sections[key] ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Testimonials Tab ── */}
      {activeTab === "testimonials" && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-card border border-border/60 shadow-sm p-6 space-y-2">
            <h3 className="font-display text-xl text-secondary">Mijozlar fikrlari</h3>
            <p className="text-xs text-muted-foreground">Asosiy sahifada ko'rsatiladigan testimonial kartochkalar</p>
          </div>
          {(form.testimonials ?? DEFAULT_SETTINGS.testimonials ?? []).map((t, i) => (
            <div key={i} className="rounded-2xl bg-card border border-border/60 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-secondary text-sm">{i + 1}-mijoz fikri</h4>
                {(form.testimonials ?? []).length > 1 && (
                  <button type="button"
                    onClick={() => {
                      const arr = [...(form.testimonials ?? DEFAULT_SETTINGS.testimonials ?? [])];
                      arr.splice(i, 1);
                      setField("testimonials", arr);
                    }}
                    className="h-8 w-8 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 grid place-items-center">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <TF label="Ism" value={t.name} onChange={v => {
                  const arr = [...(form.testimonials ?? DEFAULT_SETTINGS.testimonials ?? [])];
                  arr[i] = { ...arr[i], name: v };
                  setField("testimonials", arr);
                }} placeholder="Jasur Toshmatov" />
                <TF label="Lavozim / Rol" value={t.role} onChange={v => {
                  const arr = [...(form.testimonials ?? DEFAULT_SETTINGS.testimonials ?? [])];
                  arr[i] = { ...arr[i], role: v };
                  setField("testimonials", arr);
                }} placeholder="Futbol murabbiyi" />
                <TF label="Bosh harflar (avatar)" value={t.initials} onChange={v => {
                  const arr = [...(form.testimonials ?? DEFAULT_SETTINGS.testimonials ?? [])];
                  arr[i] = { ...arr[i], initials: v };
                  setField("testimonials", arr);
                }} placeholder="JT" />
                <TF label="Bronlar soni" value={t.bookings} onChange={v => {
                  const arr = [...(form.testimonials ?? DEFAULT_SETTINGS.testimonials ?? [])];
                  arr[i] = { ...arr[i], bookings: v };
                  setField("testimonials", arr);
                }} placeholder="47 ta bron" />
              </div>
              <TF label="Fikr matni" value={t.quote} onChange={v => {
                const arr = [...(form.testimonials ?? DEFAULT_SETTINGS.testimonials ?? [])];
                arr[i] = { ...arr[i], quote: v };
                setField("testimonials", arr);
              }} placeholder="Platformadan mamnunman..." multiline />
            </div>
          ))}
          {(form.testimonials ?? DEFAULT_SETTINGS.testimonials ?? []).length < 6 && (
            <button type="button"
              onClick={() => {
                const arr = [...(form.testimonials ?? DEFAULT_SETTINGS.testimonials ?? [])];
                arr.push({ name: "", role: "", quote: "", initials: "", bookings: "" });
                setField("testimonials", arr);
              }}
              className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
              <Plus className="h-4 w-4" /> Yangi testimonial qo'shish
            </button>
          )}
        </div>
      )}

      {/* ── How It Works Tab ── */}
      {activeTab === "howItWorks" && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-card border border-border/60 shadow-sm p-6 space-y-2">
            <h3 className="font-display text-xl text-secondary">Qanday ishlaydi? (3 qadam)</h3>
            <p className="text-xs text-muted-foreground">Asosiy sahifadagi 3 qadamli bo'lim matnlari</p>
          </div>
          {(form.howItWorks ?? DEFAULT_SETTINGS.howItWorks ?? []).map((step, i) => (
            <div key={i} className="rounded-2xl bg-card border border-border/60 shadow-sm p-6 space-y-4">
              <h4 className="font-semibold text-secondary text-sm">{i + 1}-qadam</h4>
              <div className="grid sm:grid-cols-3 gap-4">
                <TF label="Raqam (01, 02...)" value={step.step}
                  onChange={v => {
                    const arr = [...(form.howItWorks ?? DEFAULT_SETTINGS.howItWorks ?? [])];
                    arr[i] = { ...arr[i], step: v };
                    setField("howItWorks", arr);
                  }} placeholder="01" />
                <TF label="Sarlavha" value={step.title}
                  onChange={v => {
                    const arr = [...(form.howItWorks ?? DEFAULT_SETTINGS.howItWorks ?? [])];
                    arr[i] = { ...arr[i], title: v };
                    setField("howItWorks", arr);
                  }} placeholder="Stadion toping" />
                <TF label="Yorliq (tag)" value={step.tag}
                  onChange={v => {
                    const arr = [...(form.howItWorks ?? DEFAULT_SETTINGS.howItWorks ?? [])];
                    arr[i] = { ...arr[i], tag: v };
                    setField("howItWorks", arr);
                  }} placeholder="Smart qidiruv" />
              </div>
              <TF label="Tavsif matni" value={step.sub}
                onChange={v => {
                  const arr = [...(form.howItWorks ?? DEFAULT_SETTINGS.howItWorks ?? [])];
                  arr[i] = { ...arr[i], sub: v };
                  setField("howItWorks", arr);
                }} placeholder="Stadionni topish yo'li..." multiline />
              <div className="flex items-center gap-3">
                <Label className="text-xs text-muted-foreground">Rang (accent)</Label>
                <input type="color" value={step.accent}
                  onChange={e => {
                    const arr = [...(form.howItWorks ?? DEFAULT_SETTINGS.howItWorks ?? [])];
                    arr[i] = { ...arr[i], accent: e.target.value };
                    setField("howItWorks", arr);
                  }}
                  className="h-9 w-14 rounded-lg border border-border cursor-pointer" />
                <span className="text-xs text-muted-foreground font-mono">{step.accent}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Owner Benefits Tab ── */}
      {activeTab === "ownerBenefits" && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-card border border-border/60 shadow-sm p-6 space-y-2">
            <h3 className="font-display text-xl text-secondary">Stadion egalari uchun afzalliklar</h3>
            <p className="text-xs text-muted-foreground">CTA bo'limidagi ro'yxat bandlari (6 ta)</p>
          </div>
          <div className="rounded-2xl bg-card border border-border/60 shadow-sm p-6 space-y-3">
            {(form.ownerBenefits ?? DEFAULT_SETTINGS.ownerBenefits ?? []).map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-semibold w-5 shrink-0">{i + 1}.</span>
                <div className="flex-1">
                  <TF label="" value={b.text}
                    onChange={v => {
                      const arr = [...(form.ownerBenefits ?? DEFAULT_SETTINGS.ownerBenefits ?? [])];
                      arr[i] = { ...arr[i], text: v };
                      setField("ownerBenefits", arr);
                    }} placeholder="Afzallik matni..." />
                </div>
                {(form.ownerBenefits ?? DEFAULT_SETTINGS.ownerBenefits ?? []).length > 1 && (
                  <button type="button"
                    onClick={() => {
                      const arr = [...(form.ownerBenefits ?? DEFAULT_SETTINGS.ownerBenefits ?? [])];
                      arr.splice(i, 1);
                      setField("ownerBenefits", arr);
                    }}
                    className="h-9 w-9 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 grid place-items-center shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {(form.ownerBenefits ?? DEFAULT_SETTINGS.ownerBenefits ?? []).length < 8 && (
              <button type="button"
                onClick={() => {
                  const arr = [...(form.ownerBenefits ?? DEFAULT_SETTINGS.ownerBenefits ?? [])];
                  arr.push({ text: "" });
                  setField("ownerBenefits", arr);
                }}
                className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline mt-2">
                <Plus className="h-4 w-4" /> Yangi band qo'shish
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── CTA Tab ── */}
      {activeTab === "cta" && (
        <div className="rounded-2xl bg-card border border-border/60 shadow-sm p-6 space-y-5">
          <h3 className="font-display text-xl text-secondary">CTA Banner matni</h3>
          <p className="text-xs text-muted-foreground">Sarlavhada yangi qator uchun "\n" dan foydalaning</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <TF label="Sarlavha (O'zbek)" value={form.cta.title_uz} onChange={v => setField("cta.title_uz", v)} placeholder={"Stadioningizni\nbiz bilan boshqaring"} multiline />
            <TF label="Sarlavha (Rus)" value={form.cta.title_ru} onChange={v => setField("cta.title_ru", v)} placeholder={"Управляйте\nстадионом с нами"} multiline />
            <TF label="Tavsif (O'zbek)" value={form.cta.subtitle_uz} onChange={v => setField("cta.subtitle_uz", v)} placeholder="Stadion egasimisiz?..." multiline />
            <TF label="Tavsif (Rus)" value={form.cta.subtitle_ru} onChange={v => setField("cta.subtitle_ru", v)} placeholder="Вы владелец стадиона?..." multiline />
          </div>
          <TF label="Telegram havolasi" value={form.cta.telegramLink} onChange={v => setField("cta.telegramLink", v)} placeholder="https://t.me/..." />
        </div>
      )}

      {/* ── Contact Tab ── */}
      {activeTab === "contact" && (
        <div className="rounded-2xl bg-card border border-border/60 shadow-sm p-6 space-y-5">
          <h3 className="font-display text-xl text-secondary">Aloqa ma'lumotlari</h3>
          <p className="text-xs text-muted-foreground">Footer va aloqa bo'limlarida ko'rsatiladigan ma'lumotlar</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <TF label="Telefon raqam" value={form.contact.phone} onChange={v => setField("contact.phone", v)} placeholder="+998 90 000 00 00" />
            <TF label="Telegram havola" value={form.contact.telegram} onChange={v => setField("contact.telegram", v)} placeholder="https://t.me/..." />
            <TF label="Manzil (O'zbek)" value={form.contact.address_uz} onChange={v => setField("contact.address_uz", v)} placeholder="Toshkent, O'zbekiston" />
            <TF label="Manzil (Rus)" value={form.contact.address_ru} onChange={v => setField("contact.address_ru", v)} placeholder="Ташкент, Узбекистан" />
          </div>
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={busy}
          className="bg-gradient-primary shadow-glow rounded-xl px-8 h-11 text-base font-semibold">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Saqlash"}
        </Button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   SMALL HELPERS
══════════════════════════════════════════════ */
const StatCard = ({ icon, label, value, color, trend, up, isText }: {
  icon: React.ReactNode; label: string; value: number | string;
  color: "blue" | "green" | "violet" | "amber"; trend?: string; up?: boolean; isText?: boolean;
}) => {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className={`h-10 w-10 rounded-xl grid place-items-center ${colors[color]}`}>{icon}</div>
        {trend && (
          <div className={`text-xs font-semibold flex items-center gap-0.5 ${up ? "text-emerald-600" : "text-muted-foreground"}`}>
            {up && <ArrowUpRight className="h-3 w-3" />}
            {trend}
          </div>
        )}
      </div>
      <div className={`font-display ${isText ? "text-xl" : "text-3xl"} text-secondary`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
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
  return <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${s.cls}`}>{s.label}</span>;
};

const RequestStatusBadge = ({ status }: { status: string }) => {
  if (status === "pending")  return <Badge className="bg-amber-100 text-amber-700 border-amber-200 border"><AlertCircle className="h-3 w-3 mr-1" />Kutilmoqda</Badge>;
  if (status === "approved") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border"><CheckCircle2 className="h-3 w-3 mr-1" />Tasdiqlandi</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200 border"><XCircle className="h-3 w-3 mr-1" />Rad etildi</Badge>;
};

const EscrowPill = ({ status }: { status: string }) => {
  if (status === "held")     return <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Kutmoqda</span>;
  if (status === "released") return <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Chiqarildi</span>;
  return <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">Qaytarildi</span>;
};

const RolePill = ({ role }: { role: string }) => {
  const map: Record<string, string> = {
    admin: "bg-violet-100 text-violet-700",
    owner: "bg-emerald-100 text-emerald-700",
    user:  "bg-muted text-muted-foreground",
  };
  return <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${map[role] ?? "bg-muted text-muted-foreground"}`}>{role}</span>;
};

const EmptyState = ({ icon, msg }: { icon: React.ReactNode; msg: string }) => (
  <div className="rounded-2xl bg-card border border-dashed border-border/80 py-16 text-center">
    <div className="text-muted-foreground/30 flex justify-center mb-3">{icon}</div>
    <div className="text-muted-foreground text-sm">{msg}</div>
  </div>
);

export default Admin;
