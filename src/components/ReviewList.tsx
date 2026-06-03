import { useEffect, useState, useCallback } from "react";
import { api, ReviewRow } from "@/lib/api";
import { Star } from "lucide-react";
import { useT } from "@/lib/i18n";

export const Stars = ({ value, size = 4 }: { value: number; size?: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={`h-${size} w-${size} ${s <= Math.round(value) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
    ))}
  </div>
);

interface Props {
  stadiumId: string;
  refreshKey?: number;
}

export const ReviewList = ({ stadiumId, refreshKey }: Props) => {
  const t = useT();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.reviews.list(stadiumId);
      setReviews(data);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [stadiumId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  if (loading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="font-display text-2xl text-secondary">{t("reviewsTitle")}</h3>
        {avg && (
          <div className="flex items-center gap-1.5">
            <Stars value={parseFloat(avg)} />
            <span className="font-semibold text-secondary">{avg}</span>
            <span className="text-sm text-muted-foreground">({reviews.length})</span>
          </div>
        )}
      </div>
      {reviews.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noReviews")}</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Stars value={r.rating} size={3} />
                <span className="text-sm font-semibold text-secondary">{r.full_name || "Foydalanuvchi"}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(r.created_at).toLocaleDateString("ru-RU")}
                </span>
              </div>
              {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
