import { Link, useLocation, useNavigate } from "react-router-dom";
import { Shield, Map, FilePlus2, Sparkles, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Threat Map", icon: Map },
  { to: "/report", label: "Report Incident", icon: FilePlus2 },
  { to: "/sentinel", label: "Sentinel AI", icon: Sparkles },
];

export const AppHeader = () => {
  const { user, isAdmin, signOut } = useAuth();
  const loc = useLocation();
  const nav2 = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    nav2("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="container flex h-14 items-center justify-between gap-6">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 group">
          <div className="relative">
            <Shield className="h-5 w-5 text-primary text-glow" />
            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-alert animate-pulse-glow" />
          </div>
          <span className="font-display font-bold tracking-tight">
            VIGIL<span className="text-primary">-INDIA</span>
          </span>
          <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border border-border rounded text-muted-foreground">
            v1.0 · classified
          </span>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-1">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = loc.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md flex items-center gap-1.5 transition-colors",
                    active
                      ? "bg-surface-elevated text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                to="/admin"
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md flex items-center gap-1.5 transition-colors",
                  loc.pathname === "/admin"
                    ? "bg-alert/10 text-alert"
                    : "text-alert/70 hover:text-alert hover:bg-alert/10"
                )}
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Command
              </Link>
            )}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {user ? (
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="font-mono text-xs">
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button size="sm" asChild className="bg-primary text-primary-foreground hover:bg-primary-glow shadow-glow">
                <Link to="/auth?mode=signup">Enlist</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
