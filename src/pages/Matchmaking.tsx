import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { api, MatchPostRow } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DISTRICTS } from "@/data/stadiums";
import { Badge } from "@/components/ui/badge";
import { Users, Swords, Clock, MapPin, Phone, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

const fmtTime = (ts: string, lang: "uz" | "ru") => {
  const m = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (lang === "ru") {
    if (m < 1) return "сейчас";
    if (m < 60) return `${m} мин назад`;
    if (m < 1440) return `${Math.round(m / 60)} ч назад`;
    return `${Math.round(m / 1440)} д назад`;
  }
  if (m < 1) return "hozir";
  if (m < 60) return `${m} daq oldin`;
  if (m < 1440) return `${Math.round(m / 60)} soat oldin`;
  return `${Math.round(m / 1440)} kun oldin`;
};

import { useI18n } from "@/lib/i18n";

const Matchmaking = () => {
  const { user } = useAuth();
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const [posts, setPosts] = useState<MatchPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [type, setType] = useState<"needPlayers" | "challenge">("needPlayers");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [district, setDistrict] = useState("any");
  const [hour, setHour] = useState("any");

  const load = async () => {
    try {
      const data = await api.matchmaking.list();
      setPosts(data);
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error(t("postLoginReq")); return; }
    if (!message.trim() || !contact.trim()) return;
    setBusy(true);
    try {
      const post = await api.matchmaking.create({
        type,
        message: message.trim(),
        contact: contact.trim(),
        district: district !== "any" ? district : undefined,
        hour: hour !== "any" ? parseInt(hour) : undefined,
      });
      toast.success(`✅ ${t("postCreated")}`);
      setPosts(prev => [post, ...prev]);
      setMessage("");
      setContact("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.matchmaking.delete(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      toast.success(t("deleted"));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="font-display text-5xl text-secondary">{t("matchmakingTitle")}</h1>
          <p className="text-muted-foreground mt-2">{t("matchmakingSub")}</p>
        </div>

        <div className="grid lg:grid-cols-[400px_1fr] gap-8">
          {/* Form */}
          <form onSubmit={submit}
            className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4 self-start lg:sticky lg:top-24">
            <h2 className="font-display text-2xl text-secondary">{t("postTitle")}</h2>

            <div className="grid grid-cols-2 gap-2">
              <Button type="button"
                variant={type === "needPlayers" ? "default" : "outline"}
                onClick={() => setType("needPlayers")}
                className={type === "needPlayers" ? "bg-primary" : ""}>
                <Users className="h-4 w-4 mr-1" /> {t("needPlayers")}
              </Button>
              <Button type="button"
                variant={type === "challenge" ? "default" : "outline"}
                onClick={() => setType("challenge")}
                className={type === "challenge" ? "bg-secondary text-secondary-foreground" : ""}>
                <Swords className="h-4 w-4 mr-1" /> {t("challenge")}
              </Button>
            </div>

            <Textarea placeholder={t("messagePlh")} value={message}
              onChange={e => setMessage(e.target.value)} rows={4} required />

            <Input placeholder={t("contactPlh")} value={contact}
              onChange={e => setContact(e.target.value)} required />

            <div className="grid grid-cols-2 gap-2">
              <Select value={district} onValueChange={setDistrict}>
                <SelectTrigger><SelectValue placeholder={t("district")} /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="any">{t("anyTime")}</SelectItem>
                  {DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger><SelectValue placeholder={t("time")} /></SelectTrigger>
                <SelectContent className="bg-popover z-50 max-h-72">
                  <SelectItem value="any">{t("anyTime")}</SelectItem>
                  {Array.from({ length: 24 }, (_, h) => (
                    <SelectItem key={h} value={String(h)}>
                      {String(h).padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={busy || !user}
              className="w-full bg-gradient-primary shadow-glow">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> :
               !user ? t("loginRequired") : t("publish")}
            </Button>
          </form>

          {/* Posts list */}
          <div className="space-y-3">
            {loading ? (
              <div className="grid place-items-center py-20">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                <Swords className="h-10 w-10 mx-auto mb-3 opacity-30" />
                {t("noPostsYet")}
              </div>
            ) : posts.map(p => (
              <article key={p.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft hover:shadow-glow transition-smooth">
                <div className="flex items-start justify-between gap-3">
                  <Badge className={
                    p.type === "needPlayers"
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-accent/20 text-accent-foreground border-accent/40"
                  }>
                    {p.type === "needPlayers"
                      ? <><Users className="h-3 w-3 mr-1" />{t("needPlayers")}</>
                      : <><Swords className="h-3 w-3 mr-1" />{t("challenge")}</>}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{fmtTime(p.created_at, lang)}</span>
                    {user && p.user_id === user.id && (
                      <button onClick={() => handleDelete(p.id)}
                        className="h-6 w-6 rounded-lg grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-foreground leading-relaxed">{p.message}</p>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {p.district && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />{p.district}
                    </span>
                  )}
                  {p.hour !== null && p.hour !== undefined && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />{String(p.hour).padStart(2, "0")}:00
                    </span>
                  )}
                  {(p.profile_name || p.author_name) && (
                    <span className="text-xs text-muted-foreground/70">
                      — {p.profile_name || p.author_name}
                    </span>
                  )}
                  <a href={`tel:${p.contact.replace(/\s/g, "")}`}
                    className="flex items-center gap-1 text-primary font-semibold ml-auto hover:underline">
                    <Phone className="h-3.5 w-3.5" />{p.contact}
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Matchmaking;
