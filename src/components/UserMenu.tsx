import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogIn, LogOut, Ticket, Shield, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export const UserMenu = () => {
  const { user, roles, isAdmin, isOwner, signOut, refresh } = useAuth();
  const navigate = useNavigate();
  const t = useT();

  if (!user) {
    return (
      <Button asChild size="sm" className="bg-gradient-primary shadow-glow h-9">
        <Link to="/auth"><LogIn className="h-4 w-4 mr-1" /> {t("loginBtn")}</Link>
      </Button>
    );
  }

  const initial = (user.full_name || user.email || "U").trim()[0].toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-9 w-9 rounded-full bg-gradient-primary text-primary-foreground font-semibold grid place-items-center shadow-soft hover:scale-105 transition-smooth">
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 bg-popover z-50">
        <DropdownMenuLabel>
          <div className="font-medium">{user.full_name || t("unknownUser")}</div>
          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {roles.length === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">user</span>}
            {roles.map((r) => (
              <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase font-bold">
                {r}
              </span>
            ))}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/my-bookings")}>
          <Ticket className="h-4 w-4 mr-2" /> {t("myBookingsMenu")}
        </DropdownMenuItem>
        {isOwner && (
          <DropdownMenuItem onClick={() => navigate("/owner/dashboard")}>
            <LayoutDashboard className="h-4 w-4 mr-2" /> {t("stadiumPanel")}
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate("/admin")}>
            <Shield className="h-4 w-4 mr-2" /> {t("adminPanel")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { signOut(); navigate("/"); }}>
          <LogOut className="h-4 w-4 mr-2" /> {t("logOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
