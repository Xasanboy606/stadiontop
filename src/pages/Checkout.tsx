import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUZS, type Stadium } from "@/data/stadiums";
import { useBookingStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fetchStadiumById, isDbStadium } from "@/hooks/useStadiums";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft, Calendar, Clock, MapPin, Shield, Loader2,
  CheckCircle2, XCircle, Receipt, CreditCard,
} from "lucide-react";
import { toast } from "sonner";

const SERVICE_FEE_RATE = 0.05; // internal only — taken FROM total, not added on top

type PayMethod = "payme" | "click" | "uzum";
type Stage = "form" | "processing" | "success" | "failed";

interface CheckoutState {
  stadiumId: string;
  date: string;
  hour: number;
  hours: number;
  basePrice: number;     // pitch price (hours * hourly)
  addonsPrice: number;
  addons: string[];
  paid: "deposit" | "full";
}

const PAY_METHODS: { id: PayMethod; name: string; tint: string; initials: string }[] = [
  { id: "payme", name: "Payme",     tint: "from-cyan-400/30 to-sky-500/20",   initials: "P" },
  { id: "click", name: "Click",     tint: "from-sky-400/30 to-blue-600/20",   initials: "C" },
  { id: "uzum",  name: "Uzum Bank", tint: "from-violet-400/30 to-fuchsia-500/20", initials: "U" },
];

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();
  const { bookSlot, notifyStaff } = useBookingStore();
  const { user } = useAuth();

  const state = location.state as CheckoutState | null;

  const [method, setMethod] = useState<PayMethod>("payme");
  const [stage, setStage] = useState<Stage>("form");
  const [receiptId, setReceiptId] = useState<string>("");
  const [qrToken, setQrToken] = useState<string>("");
  const [stadium, setStadium] = useState<Stadium | null>(null);

  useEffect(() => {
    if (state?.stadiumId) fetchStadiumById(state.stadiumId).then(setStadium);
  }, [state?.stadiumId]);

  const totals = useMemo(() => {
    if (!state) return null;
    // User sees the flat price — service fee is taken FROM total, not added on top
    const total = state.basePrice + state.addonsPrice;
    const serviceFee = Math.round(total * SERVICE_FEE_RATE); // for internal accounting only
    const dueNow = state.paid === "deposit" ? Math.round(total * 0.3) : total;
    const remaining = total - dueNow;
    return { total, serviceFee, dueNow, remaining };
  }, [state]);

  // Redirect if no booking context
  useEffect(() => {
    if (!state) navigate("/", { replace: true });
  }, [state, navigate]);

  if (!state || !stadium || !totals) return null;

  const handlePay = async () => {
    setStage("processing");
    // Simulate gateway handshake
    await new Promise((r) => setTimeout(r, 2000));
    // 90% success
    if (Math.random() < 0.1) { setStage("failed"); return; }

    // Persist to DB if this is a DB stadium AND user is logged in
    if (isDbStadium(state.stadiumId) && user && stadium) {
      try {
        const bk = await api.bookings.create({
          stadium_id: state.stadiumId,
          booking_date: state.date,
          hour: state.hour,
          duration: state.hours,
          base_price: state.basePrice,
          addons_price: state.addonsPrice,
          service_fee: totals.serviceFee,
          total: totals.total,
          paid_amount: totals.dueNow,
          payment_kind: state.paid,
          payment_provider: method,
          addons: state.addons,
        });
        notifyStaff({
          stadiumId: stadium.id, stadiumName: stadium.name,
          customerName: user.email ?? "Mijoz",
          date: state.date, hour: state.hour, hours: state.hours,
          paid: state.paid, amount: totals.dueNow,
        });
        setReceiptId(bk.short_code);
        setQrToken(bk.qr_token);
        toast.success(`⚽ ${stadium.name}: ${t("newBooking")}`);
        setStage("success");
      } catch (e: any) {
        toast.error(e.message?.includes("band") ? t("doubleBooking") : (e.message ?? "Xatolik"));
        setStage("failed");
      }
      return;
    }

    // Fallback: in-memory demo flow for seed stadiums
    if (!stadium) { setStage("failed"); return; }
    const result = bookSlot({
      stadiumId: state.stadiumId, date: state.date, hour: state.hour, hours: state.hours,
      total: totals.total, paid: state.paid, addons: state.addons,
    });
    if ("error" in result) { toast.error(t("doubleBooking")); setStage("failed"); return; }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setReceiptId(code);
    setQrToken(`demo:${result.id}`);
    notifyStaff({
      stadiumId: stadium.id, stadiumName: stadium.name,
      customerName: user?.email ?? `Mijoz #${result.id.slice(0, 4).toUpperCase()}`,
      date: state.date, hour: state.hour, hours: state.hours,
      paid: state.paid, amount: totals.dueNow,
    });
    toast.success(`⚽ ${stadium.name}: ${t("newBooking")}`);
    setStage("success");
  };

  const endHour = state.hour + state.hours;

  /* ---------- PROCESSING ---------- */
  if (stage === "processing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
        <Header />
        <main className="container py-20 flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full" />
            <Loader2 className="relative h-20 w-20 text-primary animate-spin" />
          </div>
          <h1 className="font-display text-4xl text-secondary mt-8">
            To'lov amalga oshirilmoqda…
          </h1>
          <p className="text-muted-foreground mt-2 max-w-sm">
            {PAY_METHODS.find((p) => p.id === method)?.name} bilan xavfsiz aloqa o'rnatilmoqda. Sahifani yopmang.
          </p>
          <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            SSL shifrlangan ulanish
          </div>
        </main>
      </div>
    );
  }

  /* ---------- SUCCESS ---------- */
  if (stage === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/5">
        <Header />
        <main className="container py-8 sm:py-12 max-w-md">
          <div className="rounded-3xl border border-primary/20 bg-card shadow-glow overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-primary p-6 text-center text-primary-foreground">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-2" strokeWidth={1.5} />
              <h1 className="font-display text-3xl">To'lov muvaffaqiyatli!</h1>
              <p className="text-sm opacity-90 mt-1">Broningiz tasdiqlandi ⚽</p>
            </div>

            {/* Receipt */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Receipt className="h-3.5 w-3.5" /> Chek #{receiptId}</span>
                <span>{new Date().toLocaleString("ru-RU")}</span>
              </div>

              <div className="border-t border-dashed border-border pt-4 space-y-2 text-sm">
                <Row label="Stadion" value={stadium.name} />
                <Row label="Tuman" value={stadium.district} />
                <Row label="Sana" value={state.date} />
                <Row label="Vaqt" value={`${String(state.hour).padStart(2, "0")}:00 — ${String(endHour).padStart(2, "0")}:00`} />
                <Row label="To'lov turi" value={state.paid === "deposit" ? "30% Depozit" : "To'liq"} />
                <Row label="Usul" value={PAY_METHODS.find((p) => p.id === method)!.name} />
              </div>

              <div className="border-t border-dashed border-border pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">To'langan</span>
                  <span className="font-display text-3xl text-primary">{formatUZS(totals.dueNow)}</span>
                </div>
                {totals.remaining > 0 && (
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Stadionda to'lanadi</span>
                    <span className="font-semibold text-secondary">{formatUZS(totals.remaining)}</span>
                  </div>
                )}
              </div>

              {/* QR ticket */}
              <div className="flex flex-col items-center pt-4 border-t border-dashed border-border">
                <div className="bg-card p-3 rounded-xl">
                  <QRCodeSVG
                    value={qrToken ? `${window.location.origin}/verify?token=${qrToken}` : receiptId}
                    size={160} level="M"
                  />
                </div>
                <div className="font-mono text-2xl font-bold tracking-widest text-secondary mt-3">
                  {receiptId}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Booking ID — stadionda ko'rsating</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button asChild variant="outline">
                  <Link to="/my-bookings">Mening bronlarim</Link>
                </Button>
                <Button asChild className="bg-gradient-primary">
                  <Link to="/">Bosh sahifa</Link>
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ---------- FAILED ---------- */
  if (stage === "failed") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12 max-w-md text-center">
          <div className="rounded-3xl border border-destructive/30 bg-card p-8 shadow-md">
            <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 grid place-items-center">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="font-display text-3xl text-secondary mt-4">To'lov rad etildi</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Bank tomonidan tranzaksiya tasdiqlanmadi. Boshqa karta yoki usul bilan urinib ko'ring.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-6">
              <Button variant="outline" onClick={() => navigate(-1)}>Orqaga</Button>
              <Button className="bg-gradient-primary" onClick={() => setStage("form")}>
                Qayta urinish
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ---------- FORM ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      <Header />

      <main className="container py-4 sm:py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-3 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> {t("back")}
        </Button>

        <h1 className="font-display text-4xl sm:text-5xl text-secondary mb-1">Checkout</h1>
        <p className="text-sm text-muted-foreground mb-6">Broningizni tasdiqlang va to'lovni amalga oshiring</p>

        {/* Booking summary */}
        <section className="rounded-2xl border border-border bg-card shadow-sm p-5 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-secondary leading-tight">{stadium.name}</h2>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {stadium.district} · {stadium.address}
              </div>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
              {stadium.size}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <InfoTile icon={<Calendar className="h-4 w-4" />} label="Sana" value={state.date} />
            <InfoTile
              icon={<Clock className="h-4 w-4" />}
              label="Vaqt"
              value={`${String(state.hour).padStart(2, "0")}:00 — ${String(endHour).padStart(2, "0")}:00`}
            />
          </div>
        </section>

        {/* Payment type */}
        <section className="rounded-2xl border border-border bg-card shadow-sm p-5 mb-4">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
            To'lov turi
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <PayTypeOption
              active={state.paid === "deposit"}
              title="30% Depozit"
              subtitle="Maydonni band qiling"
              amount={formatUZS(Math.round(totals.total * 0.3))}
              onClick={() =>
                navigate(location.pathname, {
                  replace: true,
                  state: { ...state, paid: "deposit" },
                })
              }
            />
            <PayTypeOption
              active={state.paid === "full"}
              title="100% To'liq"
              subtitle="Hammasi hozir"
              amount={formatUZS(totals.total)}
              onClick={() =>
                navigate(location.pathname, {
                  replace: true,
                  state: { ...state, paid: "full" },
                })
              }
            />
          </div>
        </section>

        {/* Payment methods (glassmorphism) */}
        <section className="rounded-2xl border border-border bg-card shadow-sm p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              To'lov usuli
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-600 border border-amber-400/30">
              Demo rejim
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3 bg-muted/40 rounded-lg px-3 py-2">
            Hozirda to'lov simulyatsiya rejimida ishlayapti. Merchant akkaunti ulanganida Payme/Click/Uzum orqali haqiqiy to'lov amalga oshiriladi.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {PAY_METHODS.map((m) => {
              const active = method === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`relative rounded-xl p-3 text-center transition-all border backdrop-blur-md
                    bg-gradient-to-br ${m.tint}
                    ${active
                      ? "border-primary ring-2 ring-primary/40 shadow-glow scale-[1.02]"
                      : "border-border/40 hover:border-primary/40"}`}
                >
                  <div className="mx-auto h-10 w-10 rounded-full bg-card/80 backdrop-blur-md grid place-items-center font-display text-xl text-secondary shadow-sm">
                    {m.initials}
                  </div>
                  <div className="text-xs font-semibold mt-2 text-secondary">{m.name}</div>
                  {active && (
                    <CheckCircle2 className="absolute top-1.5 right-1.5 h-4 w-4 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Price breakdown */}
        <section className="rounded-2xl border border-border bg-card shadow-sm p-5 mb-4">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
            Narxlar tafsiloti
          </h3>
          <div className="space-y-2 text-sm">
            <Row label={`Maydon (${state.hours}h)`} value={formatUZS(state.basePrice)} />
            {state.addonsPrice > 0 && (
              <Row label="Qo'shimcha xizmatlar" value={formatUZS(state.addonsPrice)} />
            )}
            <div className="border-t border-border pt-2 flex items-baseline justify-between">
              <span className="font-semibold">Jami</span>
              <span className="font-display text-2xl text-secondary">{formatUZS(totals.total)}</span>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-primary/10 border border-primary/20 p-3 grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-primary/80 uppercase tracking-wider">Hozir</div>
              <div className="font-display text-xl text-primary">{formatUZS(totals.dueNow)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Qoldiq</div>
              <div className="font-display text-xl text-secondary">{formatUZS(totals.remaining)}</div>
            </div>
          </div>
        </section>

        {/* Pay button */}
        <Button
          onClick={handlePay}
          className="w-full h-14 bg-gradient-primary hover:opacity-95 shadow-glow text-base font-semibold rounded-2xl"
        >
          <CreditCard className="h-5 w-5 mr-2" />
          {formatUZS(totals.dueNow)} to'lash
        </Button>

        <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
          <Shield className="h-3.5 w-3.5 text-primary" />
          Tranzaksiyalar SSL shifrlash bilan himoyalangan
        </p>
      </main>
    </div>
  );
};

const Row = ({ label, value, muted }: { label: string; value: string; muted?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
    <span className={muted ? "text-muted-foreground" : "font-medium"}>{value}</span>
  </div>
);

const InfoTile = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-xl border border-border bg-muted/40 p-3">
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
      {icon} {label}
    </div>
    <div className="font-semibold text-secondary mt-0.5">{value}</div>
  </div>
);

const PayTypeOption = ({
  active, title, subtitle, amount, onClick,
}: {
  active: boolean; title: string; subtitle: string; amount: string; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`text-left rounded-xl p-3 border transition-all ${
      active
        ? "border-primary bg-primary/10 ring-2 ring-primary/30"
        : "border-border bg-background hover:border-primary/40"
    }`}
  >
    <div className="font-semibold text-secondary text-sm">{title}</div>
    <div className="text-xs text-muted-foreground">{subtitle}</div>
    <div className={`mt-2 font-display text-lg ${active ? "text-primary" : "text-secondary"}`}>
      {amount}
    </div>
  </button>
);

export default Checkout;
