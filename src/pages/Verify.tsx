import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api, BookingRow } from "@/lib/api";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatUZS } from "@/data/stadiums";
import { CheckCircle2, XCircle, Loader2, QrCode, Search } from "lucide-react";
import { toast } from "sonner";

const Verify = () => {
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; booking: BookingRow } | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Auto-verify if token comes from URL */
  useEffect(() => {
    const t = params.get("token");
    if (t) verify(t);
  }, []);

  const verify = async (t = token) => {
    const cleaned = t.trim();
    if (!cleaned) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await api.bookings.verify(cleaned);
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? "Tekshirib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const bk = result?.booking;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-lg py-12 px-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 grid place-items-center">
            <QrCode className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display text-secondary">QR Tekshiruv</h1>
            <p className="text-sm text-muted-foreground">Bron tokenini kiriting yoki QR kodni skanerlang</p>
          </div>
        </div>

        {/* Input */}
        <div className="flex gap-2 mb-8">
          <Input
            value={token}
            onChange={e => setToken(e.target.value)}
            onKeyDown={e => e.key === "Enter" && verify()}
            placeholder="UUID yoki 6 xonali kod..."
            className="font-mono"
          />
          <Button onClick={() => verify()} disabled={loading || !token.trim()}
            className="bg-gradient-primary shadow-glow shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {/* Result */}
        {result && bk && (
          <div className={`rounded-2xl border p-6 space-y-4 ${
            result.ok
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-amber-500/40 bg-amber-500/5"
          }`}>
            <div className="flex items-center gap-3">
              {result.ok
                ? <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
                : <XCircle className="h-8 w-8 text-amber-500 shrink-0" />}
              <div>
                <div className={`text-lg font-bold ${result.ok ? "text-emerald-600" : "text-amber-600"}`}>
                  {result.ok ? "Bron tasdiqlandi ✅" : "Allaqachon tekshirilgan"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Kod: <span className="font-mono font-semibold">{bk.short_code}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Row label="Stadion" value={bk.stadiums?.name ?? "—"} />
              <Row label="Sana" value={bk.booking_date} />
              <Row label="Vaqt" value={`${String(bk.hour).padStart(2,"0")}:00 (${bk.duration}h)`} />
              <Row label="Holat" value={bk.status} />
              <Row label="To'lov" value={formatUZS(bk.paid_amount)} />
              <Row label="Tur" value={bk.payment_kind === "deposit" ? "30% Depozit" : "To'liq"} />
            </div>

            {bk.verified_at && (
              <div className="text-xs text-muted-foreground border-t border-border/60 pt-3">
                Tekshirilgan: {new Date(bk.verified_at).toLocaleString("uz-UZ")}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 flex items-start gap-3">
            <XCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-destructive">Xatolik</div>
              <div className="text-sm text-muted-foreground mt-1">{error}</div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">← Bosh sahifaga qaytish</Link>
        </div>
      </main>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-card border border-border/60 px-3 py-2">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="font-medium text-foreground text-sm mt-0.5">{value}</div>
  </div>
);

export default Verify;
