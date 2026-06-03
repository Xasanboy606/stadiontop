import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

const LABELS = ["", "Yomon", "Qoniqarli", "Yaxshi", "Juda yaxshi", "A'lo"];

interface Props {
  stadiumId: string;
  bookingId?: string;
  existing?: { rating: number; comment: string | null };
  onDone: () => void;
}

export const ReviewForm = ({ stadiumId, bookingId, existing, onDone }: Props) => {
  const t = useT();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!rating) return toast.error("Yulduz tanlang");
    setBusy(true);
    try {
      await api.reviews.upsert({ stadium_id: stadiumId, booking_id: bookingId, rating, comment: comment.trim() || null });
      toast.success(t("postCreated"));
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h3 className="font-semibold text-secondary">{t("writeReview")}</h3>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-125"
          >
            <Star
              className={`h-7 w-7 ${(hover || rating) >= s ? "fill-primary text-primary" : "text-muted-foreground"}`}
            />
          </button>
        ))}
        {(hover || rating) > 0 && (
          <span className="ml-2 text-sm text-muted-foreground self-center">
            {LABELS[hover || rating]}
          </span>
        )}
      </div>
      <Textarea
        placeholder="Izoh (ixtiyoriy)"
        maxLength={500}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="resize-none h-24"
      />
      <Button onClick={submit} disabled={busy || !rating} className="bg-gradient-primary">
        {t("publish")}
      </Button>
    </div>
  );
};
