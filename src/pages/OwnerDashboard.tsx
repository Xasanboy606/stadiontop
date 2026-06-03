import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { api, StadiumRow, BookingRow, OwnerRangeStats } from "@/lib/api";
import { formatUZS } from "@/data/stadiums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarCheck, TrendingUp, Percent, Building2, Loader2, Clock,
  Bell, CreditCard, Eye, Phone, User as UserIcon, Lock, Calendar,
  DollarSign, BarChart3, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Faol",       color: "bg-emerald-100 text-emerald-700" },
  cancelled:  { label: "Bekor",      color: "bg-destructive/10 text-destructive" },
  completed:  { label: "Tugallangan",color: "bg-primary/10 text-primary" },
  no_show:    { label: "Kelmagan",   color: "bg-muted text-muted-foreground" },
};
const PAY_LABEL: Record<string, string> = {
  deposit: "30% avans",
  full:    "To'liq",
};

const OwnerDashboard = () => {
  const { user } = useAuth();
  const [stadiums, setStadiums] = useState<StadiumRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(today());
  const [stadiumId, setStadiumId] = useState<string>("");
  const [closedHours, setClosedHours] = useState<Set<number>>(new Set());
  const [togglingHour, setTogglingHour] = useState<number | null>(null);

  /* Date range filter (Statistika tab) */
  const [rangeFrom, setRangeFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [rangeTo, setRangeTo] = useState(today());
  const [rangeStats, setRangeStats] = useState<OwnerRangeStats | null>(null);
  const [rangeLoading, setRangeLoading] = useState(false);

  /* Bronlar tab filters */
  const [bkFrom, setBkFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [bkTo, setBkTo] = useState(today());
  const [bkPay, setBkPay] = useState("");
  const [bkStatus, setBkStatus] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [s, b] = await Promise.all([api.owner.stadiums(), api.owner.bookings()]);
      setStadiums(s);
      if (s.length && !stadiumId) setStadiumId(s[0].id);
      setBookings(b);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const loadRangeStats = async () => {
    if (!rangeFrom || !rangeTo) return;
    setRangeLoading(true);
    try {
      const data = await api.owner.rangeStats(rangeFrom, rangeTo);
      setRangeStats(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRangeLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);
  useEffect(() => { loadRangeStats(); }, [rangeFrom, rangeTo]);

  useEffect(() => {
    if (!stadiumId || !date) return;
    api.owner.closedSlots(stadiumId, date)
      .then(hours => setClosedHours(new Set(hours)))
      .catch(() => {});
  }, [stadiumId, date]);

  const toggleSlot = async (h: number, hasBooking: boolean) => {
    if (hasBooking) return;
    setTogglingHour(h);
    try {
      const { closed } = await api.owner.toggleClosedSlot(stadiumId, date, h);
      setClosedHours(prev => {
        const next = new Set(prev);
        closed ? next.add(h) : next.delete(h);
        return next;
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTogglingHour(null);
    }
  };

  const activeStadium = stadiums.find(s => s.id === stadiumId);
  const dayBookings = bookings.filter(
    b => b.stadium_id === stadiumId && b.booking_date === date && b.status === "confirmed"
  );
  const hourMap = useMemo(() => {
    const map: Record<number, BookingRow | undefined> = {};
    dayBookings.forEach(b => {
      for (let h = b.hour; h < b.hour + b.duration; h++) map[h] = b;
    });
    return map;
  }, [dayBookings]);

  /* Today's stats */
  const todayDate = today();
  const todayBookings = bookings.filter(b => b.booking_date === todayDate && b.status === "confirmed");
  const todayAdvance = todayBookings.filter(b => b.payment_kind === "deposit");
  const todayFull    = todayBookings.filter(b => b.payment_kind === "full");
  const todayAdvanceRev = todayAdvance.reduce((s, b) => s + b.paid_amount, 0);
  const todayFullRev    = todayFull.reduce((s, b) => s + b.paid_amount, 0);
  const todayPending    = todayBookings.reduce((s, b) => s + (b.total - b.paid_amount), 0);

  /* Monthly revenue */
  const monthlyRevenue = useMemo(() => {
    const ym = todayDate.slice(0, 7);
    return bookings
      .filter(b => b.booking_date?.startsWith(ym) && b.status === "confirmed")
      .reduce((acc, b) => acc + b.paid_amount, 0);
  }, [bookings]);

  const occupancy = useMemo(() => {
    if (!stadiums.length) return 0;
    const totalSlots = stadiums.length * HOURS.length;
    const busy = todayBookings.reduce((acc, b) => acc + b.duration, 0);
    return Math.min(100, Math.round((busy / totalSlots) * 100));
  }, [stadiums.length, todayBookings]);

  const filteredBookings = useMemo(() => bookings.filter(b => {
    if (bkFrom && b.booking_date < bkFrom) return false;
    if (bkTo   && b.booking_date > bkTo)   return false;
    if (bkPay    && b.payment_kind !== bkPay)   return false;
    if (bkStatus && b.status      !== bkStatus) return false;
    return true;
  }), [bookings, bkFrom, bkTo, bkPay, bkStatus]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Stadion egasi paneli</span>
            </div>
            {stadiums.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {stadiums.map(s => (
                  <span key={s.id} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Building2 className="h-3 w-3" /> {s.name}
                  </span>
                ))}
              </div>
            )}
            <h1 className="font-display text-5xl text-secondary mt-1">Stadion paneli</h1>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="rounded-xl gap-2">
            <RefreshCw className="h-4 w-4" /> Yangilash
          </Button>
        </div>

        {/* Today's KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <KPI icon={<CalendarCheck />} label="Bugungi bronlar" value={String(todayBookings.length)} />
          <KPI icon={<TrendingUp />}    label="Bugun tushum (oy)" value={formatUZS(monthlyRevenue)} />
          <KPI icon={<Percent />}       label="Bandlik %" value={`${occupancy}%`} />
          <KPI icon={<CreditCard />}    label="Bugun to'langan" value={formatUZS(todayAdvanceRev + todayFullRev)} />
        </div>

        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : stadiums.length === 0 ? (
          <Empty msg="Sizda hali tasdiqlangan stadion yo'q." />
        ) : (
          <Tabs defaultValue="today">
            <TabsList>
              <TabsTrigger value="today">Bugun</TabsTrigger>
              <TabsTrigger value="stats">Statistika</TabsTrigger>
              <TabsTrigger value="schedule">Jadval</TabsTrigger>
              <TabsTrigger value="bookings">Bronlar ({filteredBookings.length})</TabsTrigger>
              <TabsTrigger value="notifications">Bildirishnomalar</TabsTrigger>
            </TabsList>

            {/* ─── BUGUN ─── */}
            <TabsContent value="today" className="mt-4 space-y-5">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Bugun bronlar</div>
                  <div className="font-display text-4xl text-secondary mt-1">{todayBookings.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Tasdiqlangan</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Bugun tushum</div>
                  <div className="font-display text-2xl text-primary mt-1">{formatUZS(todayAdvanceRev + todayFullRev)}</div>
                  <div className="text-xs text-muted-foreground mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>30% avans ({todayAdvance.length} ta):</span>
                      <span className="font-semibold text-foreground">{formatUZS(todayAdvanceRev)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>To'liq ({todayFull.length} ta):</span>
                      <span className="font-semibold text-foreground">{formatUZS(todayFullRev)}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Stadiyonda to'lanadi</div>
                  <div className="font-display text-2xl text-amber-600 mt-1">{formatUZS(todayPending)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Bugungi qoldiq summalar</p>
                </div>
              </div>

              {/* Bugungi bronlar ro'yxati */}
              {todayBookings.length > 0 && (
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft">
                  <div className="px-5 py-3 border-b border-border/60 text-sm font-semibold text-secondary">
                    Bugungi bronlar
                  </div>
                  <div className="divide-y divide-border/60">
                    {todayBookings.map(b => (
                      <div key={b.id} className="flex items-center justify-between px-5 py-3 text-sm gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary">#{b.short_code}</span>
                          <span className="text-muted-foreground">{b.customer_name || "Mijoz"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{String(b.hour).padStart(2,"0")}:00–{String(b.hour+b.duration).padStart(2,"0")}:00</span>
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${b.payment_kind === "deposit" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {PAY_LABEL[b.payment_kind]}
                          </span>
                          <span className="font-semibold text-foreground">{formatUZS(b.paid_amount)}</span>
                          {b.total > b.paid_amount && (
                            <span className="text-amber-600">+{formatUZS(b.total - b.paid_amount)} qoldiq</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ─── STATISTIKA ─── */}
            <TabsContent value="stats" className="mt-4 space-y-5">
              {/* Sana oralig'i filtri */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <h3 className="font-semibold text-secondary mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Sana oralig'i
                </h3>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Boshlanish</Label>
                    <Input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tugash</Label>
                    <Input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} className="mt-1" />
                  </div>
                  <Button onClick={loadRangeStats} disabled={rangeLoading} className="bg-gradient-primary shadow-glow rounded-xl">
                    {rangeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hisoblash"}
                  </Button>
                </div>
              </div>

              {/* Statistika kartalar */}
              {rangeStats && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <StatCard label="Jami bronlar" value={String(rangeStats.total_bookings)} icon={<CalendarCheck className="h-5 w-5"/>} color="primary" />
                  <StatCard label="Jami soatlar" value={`${rangeStats.games_count} soat`} icon={<BarChart3 className="h-5 w-5"/>} color="violet" />
                  <StatCard label="Kutilgan tushum" value={formatUZS(rangeStats.expected_revenue)} icon={<DollarSign className="h-5 w-5"/>} color="amber" />
                  <StatCard label="To'langan summa" value={formatUZS(rangeStats.paid_amount)} icon={<CreditCard className="h-5 w-5"/>} color="emerald" />
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">To'lov turlari</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">30% avans:</span>
                        <span className="font-semibold text-amber-600">{formatUZS(rangeStats.deposit_paid)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">To'liq to'lov:</span>
                        <span className="font-semibold text-emerald-600">{formatUZS(rangeStats.full_paid)}</span>
                      </div>
                    </div>
                  </div>
                  <StatCard label="Stadiyonda to'lanadi" value={formatUZS(rangeStats.pending_amount)} icon={<Clock className="h-5 w-5"/>} color="orange" />
                </div>
              )}
            </TabsContent>

            {/* ─── JADVAL ─── */}
            <TabsContent value="schedule" className="mt-4 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stadion</Label>
                  <Select value={stadiumId} onValueChange={setStadiumId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {stadiums.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Sana</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
              </div>

              {activeStadium && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-2xl text-secondary">{activeStadium.name}</h3>
                    <div className="flex gap-3 text-xs flex-wrap justify-end">
                      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-muted border border-border" /> Bo'sh</span>
                      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary" /> Band</span>
                      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-orange-400" /> Yopiq</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
                    {HOURS.map(h => {
                      const b = hourMap[h];
                      const isClosed = closedHours.has(h);
                      const isToggling = togglingHour === h;
                      return (
                        <button key={h} type="button" disabled={!!b || isToggling}
                          onClick={() => toggleSlot(h, !!b)}
                          title={b ? `${b.short_code}` : isClosed ? "Yopiq" : "Bo'sh"}
                          className={`rounded-lg p-2 text-center text-xs font-mono border transition-colors ${
                            b ? "bg-primary text-primary-foreground border-primary cursor-default"
                            : isClosed ? "bg-orange-400/80 text-white border-orange-500 hover:bg-orange-300"
                            : "bg-muted/40 text-muted-foreground border-border hover:bg-muted/70 cursor-pointer"
                          }`}>
                          {isToggling ? <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                           : isClosed && !b ? <Lock className="h-3 w-3 mx-auto mb-0.5" /> : null}
                          {String(h).padStart(2,"0")}:00
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-3">
                    Band: <strong>{dayBookings.reduce((a,b)=>a+b.duration,0)}</strong> / {HOURS.length} soat
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ─── BRONLAR JADVALI ─── */}
            <TabsContent value="bookings" className="mt-4 space-y-3">
              {/* Filter bar */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">Filtr:</span>
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-muted-foreground">Dan:</label>
                    <input type="date" value={bkFrom} onChange={e => setBkFrom(e.target.value)}
                      className="h-8 rounded-lg border border-input bg-muted/30 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-muted-foreground">Gacha:</label>
                    <input type="date" value={bkTo} onChange={e => setBkTo(e.target.value)}
                      className="h-8 rounded-lg border border-input bg-muted/30 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <select value={bkPay} onChange={e => setBkPay(e.target.value)}
                    className="h-8 rounded-lg border border-input bg-muted/30 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">Barcha to'lov</option>
                    <option value="deposit">30% avans</option>
                    <option value="full">To'liq</option>
                  </select>
                  <select value={bkStatus} onChange={e => setBkStatus(e.target.value)}
                    className="h-8 rounded-lg border border-input bg-muted/30 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">Barcha holat</option>
                    <option value="confirmed">Faol</option>
                    <option value="cancelled">Bekor</option>
                    <option value="completed">Tugallangan</option>
                  </select>
                  {(bkFrom || bkTo || bkPay || bkStatus) && (
                    <button onClick={() => { setBkFrom(""); setBkTo(""); setBkPay(""); setBkStatus(""); }}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                      Tozalash ×
                    </button>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">{filteredBookings.length} ta bron</span>
                </div>
              </div>

              {filteredBookings.length === 0 ? (
                <Empty msg="Bu filtrga mos bronlar yo'q" />
              ) : (
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/30">
                          {["Bron #","Mijoz","Telefon","Sana","Soat","Jami","To'langan","To'lov turi","Holat"].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredBookings.map(b => {
                          const st = STATUS_LABEL[b.status] ?? { label: b.status, color: "bg-muted text-muted-foreground" };
                          return (
                            <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 font-mono text-xs font-bold text-primary">#{b.short_code}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <UserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="truncate max-w-[120px]">{b.customer_name || "—"}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground text-xs">
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 shrink-0" />
                                  {b.customer_phone || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs">{b.booking_date}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs">
                                {String(b.hour).padStart(2,"0")}:00–{String(b.hour+b.duration).padStart(2,"0")}:00
                              </td>
                              <td className="px-4 py-3 font-semibold whitespace-nowrap">{formatUZS(b.total)}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-primary font-semibold">{formatUZS(b.paid_amount)}</div>
                                {b.total > b.paid_amount && (
                                  <div className="text-[10px] text-amber-600">+{formatUZS(b.total - b.paid_amount)} qoldiq</div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${b.payment_kind === "deposit" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                                  {PAY_LABEL[b.payment_kind] ?? b.payment_kind}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${st.color}`}>
                                  {st.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ─── BILDIRISHNOMALAR ─── */}
            <TabsContent value="notifications" className="mt-4">
              {bookings.slice(0, 20).length === 0 ? <Empty msg="Bildirishnomalar yo'q" /> : (
                <div className="space-y-2">
                  {bookings.slice(0, 20).map(b => {
                    const stadium = stadiums.find(s => s.id === b.stadium_id);
                    return (
                      <div key={b.id} className="rounded-xl border border-border bg-card p-4 flex items-start gap-3 shadow-soft">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                          <Bell className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm">
                            <strong>Yangi bron:</strong> {b.customer_name || "mijoz"} — {stadium?.name ?? b.stadiums?.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {b.booking_date} · {String(b.hour).padStart(2,"0")}:00 ({b.duration}h) · {formatUZS(b.paid_amount)} ({b.payment_kind})
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {new Date(b.created_at).toLocaleString("ru-RU")}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

/* ── Helpers ── */
const KPI = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-2xl border border-border bg-card p-5 shadow-soft flex items-center gap-4">
    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">{icon}</div>
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-2xl text-secondary">{value}</div>
    </div>
  </div>
);

const COLOR_MAP: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  violet:  "bg-violet-100 text-violet-700",
  amber:   "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
  orange:  "bg-orange-100 text-orange-700",
};

const StatCard = ({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) => (
  <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
    <div className="flex items-center justify-between mb-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`h-8 w-8 rounded-xl grid place-items-center ${COLOR_MAP[color] ?? "bg-primary/10 text-primary"}`}>{icon}</div>
    </div>
    <div className="font-display text-2xl text-secondary">{value}</div>
  </div>
);

const Empty = ({ msg }: { msg: string }) => (
  <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
    <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
    {msg}
  </div>
);

export default OwnerDashboard;
