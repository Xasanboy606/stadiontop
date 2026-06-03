import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth, loginAndStore, registerAndStore } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Goal, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

type Screen = "auth" | "forgot" | "reset";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, roles, loading: authLoading, refresh } = useAuth();
  const t = useT();
  const [tab, setTab] = useState<"in" | "up">("in");
  const [screen, setScreen] = useState<Screen>("auth");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", fullName: "", phone: "", asOwner: false,
  });
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    if (token) {
      setResetToken(token);
      setScreen("reset");
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    const target =
      roles.includes("admin") ? "/admin" :
      roles.includes("owner") ? "/owner" :
      (location.state as { from?: string } | null)?.from ?? "/my-bookings";
    navigate(target, { replace: true });
  }, [user, roles, authLoading]);

  const handleSignIn = async () => {
    if (!form.email || !form.password) return;
    setBusy(true);
    try {
      await loginAndStore(form.email, form.password);
      await refresh();
      toast.success(t("welcome"));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async () => {
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      return toast.error(t("nameMin"));
    }
    if (!form.email || !form.password) return;
    if (form.password.length < 6) return toast.error(t("passMin"));
    setBusy(true);
    try {
      await registerAndStore({
        email: form.email,
        password: form.password,
        full_name: form.fullName,
        phone: form.phone || undefined,
        as_owner: form.asOwner,
      });
      await refresh();
      toast.success(t("accountCreated"));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async () => {
    if (!forgotEmail.trim()) return toast.error(t("emailEnter"));
    setBusy(true);
    try {
      const res = await api.auth.forgotPassword(forgotEmail.trim());
      if (res.token) {
        setResetToken(res.token);
        setScreen("reset");
        toast.success(t("tokenReady"));
      } else {
        toast.success(t("emailSent"));
        setScreen("auth");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!newPassword || newPassword.length < 6) return toast.error(t("passMin"));
    if (newPassword !== confirmPassword) return toast.error(t("passMismatch"));
    setBusy(true);
    try {
      await api.auth.resetPassword(resetToken, newPassword);
      toast.success(t("passwordChanged"));
      setScreen("auth");
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
      navigate("/auth", { replace: true });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background grid place-items-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6 group">
          <div className="h-11 w-11 rounded-xl bg-gradient-primary grid place-items-center shadow-glow group-hover:scale-105 transition-smooth">
            <Goal className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="font-display text-3xl text-secondary">StadionTop</div>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">

          {/* ── Forgot password ── */}
          {screen === "forgot" && (
            <div className="space-y-4">
              <button onClick={() => setScreen("auth")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> {t("back")}
              </button>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("resetPasswordTitle")}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t("resetPasswordSub")}</p>
              </div>
              <Field label="Email">
                <Input type="email" value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleForgot()}
                  placeholder="siz@example.com" />
              </Field>
              <Button onClick={handleForgot} disabled={busy}
                className="w-full h-11 bg-gradient-primary shadow-glow">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("sendLink")}
              </Button>
            </div>
          )}

          {/* ── New password ── */}
          {screen === "reset" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("newPasswordTitle")}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t("newPasswordSub")}</p>
              </div>
              <Field label={t("newPassword")}>
                <Input type="password" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••" />
              </Field>
              <Field label={t("confirmPassword")}>
                <Input type="password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReset()}
                  placeholder="••••••••" />
              </Field>
              <Button onClick={handleReset} disabled={busy}
                className="w-full h-11 bg-gradient-primary shadow-glow">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("savePassword")}
              </Button>
            </div>
          )}

          {/* ── Sign in / Sign up ── */}
          {screen === "auth" && (
            <Tabs value={tab} onValueChange={(v) => setTab(v as "in" | "up")}>
              <TabsList className="grid grid-cols-2 mb-5">
                <TabsTrigger value="in">{t("signIn")}</TabsTrigger>
                <TabsTrigger value="up">{t("signUp")}</TabsTrigger>
              </TabsList>

              <TabsContent value="in" className="space-y-3">
                <Field label="Email">
                  <Input type="email" autoComplete="email"
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field>
                <Field label={t("passwordField")}>
                  <Input type="password" autoComplete="current-password"
                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && handleSignIn()} />
                </Field>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setScreen("forgot")}
                    className="text-xs text-primary hover:underline">
                    {t("forgotPasswordQ")}
                  </button>
                </div>
                <Button onClick={handleSignIn} disabled={busy}
                  className="w-full h-11 bg-gradient-primary shadow-glow">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("signIn")}
                </Button>
              </TabsContent>

              <TabsContent value="up" className="space-y-3">
                <Field label={t("fullName")}>
                  <Input value={form.fullName} maxLength={100}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                </Field>
                <Field label={t("phone")}>
                  <Input value={form.phone} maxLength={20} placeholder="+998 90 123 45 67"
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </Field>
                <Field label="Email">
                  <Input type="email" autoComplete="email"
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field>
                <Field label={t("passwordMin")}>
                  <Input type="password" autoComplete="new-password"
                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </Field>
                <Button onClick={handleSignUp} disabled={busy}
                  className="w-full h-11 bg-gradient-primary shadow-glow">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("createAccount")}
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">{t("authTerms")}</p>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
    {children}
  </div>
);

export default Auth;
