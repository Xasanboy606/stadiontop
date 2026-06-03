import { useEffect, useState, useCallback } from "react";
import { Bell, CheckCircle2, Clock, Building2, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api, NotificationRow } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, React.ReactNode> = {
  booking: <CheckCircle2 className="h-4 w-4 text-white" />,
  admin:   <Shield className="h-4 w-4 text-white" />,
  system:  <Building2 className="h-4 w-4 text-white" />,
};

const TYPE_COLOR: Record<string, string> = {
  booking: "bg-primary",
  admin:   "bg-violet-500",
  system:  "bg-muted-foreground",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Hozirgina";
  if (m < 60) return `${m} daq. oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  return `${Math.floor(h / 24)} kun oldin`;
}

export const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.notifications.list();
      setNotifications(data);
    } catch {
      // silent — user may not be logged in
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load on mount and poll every 30 seconds
  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  // Reload when popover opens
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const unread = notifications.filter((n) => !n.is_read).length;

  const markRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    try { await api.notifications.markRead(id); } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try { await api.notifications.markAllRead(); } catch { /* ignore */ }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center shadow-glow animate-pulse">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[360px] p-0 bg-popover z-50 max-h-[500px] overflow-hidden flex flex-col shadow-xl rounded-2xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="font-display text-lg text-secondary">Bildirishnomalar</div>
            {unread > 0 && (
              <span className="h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
                {unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {unread > 0 && (
              <button onClick={markAllRead}
                className="text-xs text-primary font-semibold hover:underline">
                Hammasini o'qi
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="h-10 w-10 mx-auto mb-3 text-muted-foreground/25" />
              <div className="text-sm text-muted-foreground">Bildirishnomalar yo'q</div>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {notifications.map((n) => (
                <li key={n.id} onClick={() => !n.is_read && markRead(n.id)}
                  className={cn(
                    "px-4 py-3.5 cursor-pointer transition-colors hover:bg-muted/40 flex items-start gap-3",
                    !n.is_read && "bg-primary/[0.04]"
                  )}>
                  {/* Icon */}
                  <div className={cn(
                    "h-8 w-8 rounded-xl grid place-items-center shrink-0 mt-0.5",
                    TYPE_COLOR[n.type] ?? "bg-muted"
                  )}>
                    {TYPE_ICON[n.type] ?? <Bell className="h-4 w-4 text-white" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className={cn(
                        "text-sm leading-tight",
                        n.is_read ? "text-muted-foreground" : "font-semibold text-secondary"
                      )}>
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                      {n.body}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground/60">
                      <Clock className="h-3 w-3" />
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
