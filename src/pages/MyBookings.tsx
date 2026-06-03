import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { api, BookingRow } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { formatUZS } from "@/data/stadiums";
import { QRCodeSVG } from "qrcode.react";
import { Calendar, Clock, MapPin, Ticket as TicketIcon, Loader2, XCircle, RefreshCw, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

const calcRefund = (bookingDate: string, hour: number, paidAmount: number) => {
  const gameMs = new Date(`${bookingDate}T${String(hour).padStart(2, "0")}:00:00`).getTime();
  const hoursLeft = (gameMs - Date.now()) / 3_600_000;
  if (hoursLeft < 0)  return { pct: 0,   amount: 0,                               canCancel: false };
  if (hoursLeft < 2)  return { pct: 0,   amount: 0,                               canCancel: true };
  if (hoursLeft < 24) return { pct: 50,  amount: Math.round(paidAmount * 0.5),    canCancel: true };
  return              { pct: 100, amount: paidAmount,                              canCancel: true };
};

const MyBookings = () => {
  const { user } = useAuth();
  const t = useT();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<BookingRow | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const STATUS_LABEL: Record<string, string> = {
    confirmed: t("statusConfirmed"),
    cancelled:  t("statusCancelled"),
    completed:  t("statusCompleted"),
    no_show:    t("statusNoShow"),
  };

  const load = async () => {
    if (!user) return;
    try {
      const data = await api.bookings.list();
      setRows(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const { refund_amount, refund_pct } = await api.bookings.cancel(cancelTarget.id);
      toast.success(
        refund_amount > 0
          ? `${t("cancelled")}. ${t("refundedLabel")}: ${formatUZS(refund_amount)} (${refund_pct}%)`
          : `${t("cancelled")}. ${t("refundNone")}`
      );
      setCancelTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCancelling(false);
    }
  };

  const refundInfo = cancelTarget
    ? calcRefund(cancelTarget.booking_date, cancelTarget.hour, cancelTarget.paid_amount)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-3xl">
        <h1 className="font-display text-4xl text-secondary mb-1">{t("myBookingsTitle")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("myBookingsSub")}</p>

        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            <TicketIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
            {t("noBookings")}
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((b) => {
              const { pct, canCancel } = calcRefund(b.booking_date, b.hour, b.paid_amount);
              const isActive = b.status === "confirmed";
              return (
                <article key={b.id} className={`rounded-2xl border bg-card overflow-hidden shadow-soft ${
                  b.status === "cancelled" ? "border-destructive/30 opacity-75" : "border-border"
                }`}>
                  <div className="grid sm:grid-cols-[1fr_auto] gap-4 p-5">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-display text-2xl text-secondary truncate">
                          {b.stadiums?.name ?? "Stadion"}
                        </h2>
                        <Badge className={
                          b.status === "confirmed" ? "bg-primary/10 text-primary border-0" :
                          b.status === "cancelled"  ? "bg-destructive/10 text-destructive border-0" :
                          "bg-muted text-muted-foreground border-0"
                        }>
                          {STATUS_LABEL[b.status] ?? b.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {b.stadiums?.district} · {b.stadiums?.address}
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-primary" />{b.booking_date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-primary" />
                          {String(b.hour).padStart(2, "0")}:00 — {String(b.hour + b.duration).padStart(2, "0")}:00
                        </span>
                      </div>
                      <div className="flex items-baseline gap-3 pt-1">
                        <span className="text-xs text-muted-foreground uppercase">{t("paidLabel")}</span>
                        <span className="font-display text-xl text-primary">{formatUZS(b.paid_amount)}</span>
                        <span className="text-xs text-muted-foreground">/ {formatUZS(b.total)}</span>
                      </div>
                      {/* Payment kind badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                          b.payment_kind === "deposit"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {b.payment_kind === "deposit" ? t("depositKind") : t("fullKind")}
                        </span>
                        <span className="text-[11px] text-muted-foreground uppercase tracking-widest">
                          {b.payment_provider}
                        </span>
                      </div>
                      {b.status === "cancelled" && b.refund_amount > 0 && (
                        <div className="text-xs text-primary font-semibold flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" />
                          {t("refundedLabel")}: {formatUZS(b.refund_amount)}
                        </div>
                      )}
                      {b.total > b.paid_amount && b.status === "confirmed" && (
                        <div className="text-xs text-amber-600 font-semibold flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1">
                          <Clock className="h-3 w-3" />
                          Qoldiq: {formatUZS(b.total - b.paid_amount)} (stadiyonda to'lanadi)
                        </div>
                      )}
                      {isActive && canCancel && (
                        <div className="pt-2">
                          <Button size="sm" variant="outline"
                            className="border-destructive/50 text-destructive hover:bg-destructive/10 text-xs"
                            onClick={() => setCancelTarget(b)}>
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            {t("cancelBooking")}
                            {pct > 0 ? ` (${pct}% ${t("cancelPct")})` : ` (${t("cancelNone")})`}
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-center justify-center bg-secondary/5 rounded-xl p-3 sm:min-w-[160px] gap-2">
                      <div className="bg-card p-2 rounded-md">
                        <QRCodeSVG value={b.qr_token || b.short_code} size={110} level="M" />
                      </div>
                      <div className="font-mono text-sm font-bold tracking-widest text-secondary">
                        #{b.short_code}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">Bron kodi</div>
                      {b.stadiums?.lat && b.stadiums?.lng && (
                        <div className="flex gap-1.5 w-full">
                          <a
                            href={`yandexnavi://build_route_on_map?lat_to=${b.stadiums.lat}&lon_to=${b.stadiums.lng}`}
                            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold rounded-lg bg-primary/10 text-primary px-2 py-1.5 hover:bg-primary/20 transition-colors"
                          >
                            <Navigation className="h-3 w-3" /> Yandex
                          </a>
                          <a
                            href={`https://maps.google.com/?q=${b.stadiums.lat},${b.stadiums.lng}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold rounded-lg bg-blue-50 text-blue-600 px-2 py-1.5 hover:bg-blue-100 transition-colors"
                          >
                            <MapPin className="h-3 w-3" /> Google
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <AlertDialogContent className="bg-popover">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelBooking")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  <strong>{cancelTarget?.stadiums?.name}</strong> —{" "}
                  {cancelTarget?.booking_date} {t("cancelQuestion")}
                </p>
                {refundInfo && (
                  <div className={`rounded-lg p-3 border text-sm ${
                    refundInfo.pct === 100 ? "border-primary/30 bg-primary/10 text-primary" :
                    refundInfo.pct === 50  ? "border-accent/30 bg-accent/10 text-accent-foreground" :
                    "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}>
                    {refundInfo.pct === 100 && `${t("refund100")}: ${formatUZS(refundInfo.amount)}`}
                    {refundInfo.pct === 50  && `${t("refund50")}: ${formatUZS(refundInfo.amount)}`}
                    {refundInfo.pct === 0   && t("refundNoneMsg")}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{t("refundPolicy")}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("back")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={cancelling}
              className="bg-destructive hover:bg-destructive/90">
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : t("yesCancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyBookings;
