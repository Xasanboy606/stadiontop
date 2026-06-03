import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, BookingRow } from "@/lib/api";
import { Camera, CheckCircle2, XCircle, Search } from "lucide-react";
import { toast } from "sonner";

export const QRScanner = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const containerId = "qr-scanner-region";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ ok: boolean; msg: string; booking?: BookingRow } | null>(null);

  useEffect(() => {
    if (!open) return;
    const start = async () => {
      try {
        const inst = new Html5Qrcode(containerId);
        scannerRef.current = inst;
        await inst.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 240 },
          (decoded) => verify(decoded),
          () => {}
        );
      } catch {
        // camera denied — manual input still works
      }
    };
    start();
    return () => {
      scannerRef.current?.stop().catch(() => {}).finally(() => {
        scannerRef.current?.clear();
        scannerRef.current = null;
      });
    };
  }, [open]);

  const verify = async (token: string) => {
    try {
      const { ok, booking } = await api.bookings.verify(token);
      setResult({ ok, msg: ok ? "Bron tasdiqlandi ✅" : `Status: ${booking?.status}`, booking });
      if (ok) { toast.success("Mijoz kirdi!"); scannerRef.current?.pause(true); }
    } catch (e: any) {
      setResult({ ok: false, msg: e.message || "Bron topilmadi" });
    }
  };

  const handleManual = () => {
    if (!code.trim()) return;
    verify(code.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-popover">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" /> QR skaner
          </DialogTitle>
        </DialogHeader>
        <div id={containerId} className="aspect-square rounded-xl bg-black/90 overflow-hidden" />
        <div className="flex gap-2">
          <Input placeholder="6-xonali kod (qo'lda)" value={code}
            onChange={(e) => setCode(e.target.value)} maxLength={12} />
          <Button onClick={handleManual}><Search className="h-4 w-4" /></Button>
        </div>
        {result && (
          <div className={`rounded-xl p-4 border ${result.ok ? "border-primary bg-primary/10" : "border-destructive bg-destructive/10"}`}>
            <div className="flex items-center gap-2 font-semibold">
              {result.ok ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <XCircle className="h-5 w-5 text-destructive" />}
              {result.msg}
            </div>
            {result.booking && (
              <div className="text-xs mt-2 space-y-0.5 text-muted-foreground">
                <div>{result.booking.stadiums?.name}</div>
                <div>{result.booking.booking_date} · {String(result.booking.hour).padStart(2, "0")}:00 ({result.booking.duration}h)</div>
                <div>Code: {result.booking.short_code}</div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
