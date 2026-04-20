import { useEffect, useState } from "react";
import { ShieldCheck, UserPlus, Trash2, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type ProfileRow = { id: string; full_name: string | null; phone: string | null; city: string | null };
type RoleRow = { user_id: string; role: "admin" | "investigator" | "citizen" };

const Admin = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [grantEmail, setGrantEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("id,full_name,phone,city"),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    if (p.error) toast.error(p.error.message);
    if (r.error) toast.error(r.error.message);
    setProfiles(p.data ?? []);
    setRoles((r.data as RoleRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const rolesFor = (uid: string) => roles.filter((x) => x.user_id === uid).map((x) => x.role);

  const grant = async (uid: string, role: "admin" | "investigator") => {
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
    if (error) toast.error(error.message); else { toast.success(`${role} granted.`); load(); }
  };

  const revoke = async (uid: string, role: "admin" | "investigator") => {
    if (uid === user?.id && role === "admin") {
      toast.error("Refuse to demote yourself.");
      return;
    }
    const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
    if (error) toast.error(error.message); else { toast.success(`${role} revoked.`); load(); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 container py-6 md:py-8 animate-fade-in">
        <div className="text-[10px] font-mono uppercase tracking-widest text-alert mb-1 flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3" /> // command.tier
        </div>
        <h1 className="text-3xl font-display font-bold mb-1">Command Console</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Manage sentinels, grant investigator access, oversee the network.
        </p>

        <div className="panel">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-display font-bold">Sentinels ({profiles.length})</h2>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {loading ? "syncing…" : "synced"}
            </span>
          </div>
          <div className="divide-y divide-border">
            {profiles.map((p) => {
              const userRoles = rolesFor(p.id);
              const isAdmin = userRoles.includes("admin");
              const isInv = userRoles.includes("investigator");
              return (
                <div key={p.id} className="p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-medium">{p.full_name || "Unnamed"}{p.id === user?.id && <span className="ml-2 text-[10px] font-mono text-primary">YOU</span>}</div>
                    <div className="text-xs font-mono text-muted-foreground">
                      {[p.city, p.phone].filter(Boolean).join(" · ") || p.id.slice(0, 8) + "…"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isAdmin && <RoleBadge tone="alert">admin</RoleBadge>}
                    {isInv && <RoleBadge tone="primary">investigator</RoleBadge>}
                    {!isAdmin && !isInv && <RoleBadge tone="muted">citizen</RoleBadge>}
                  </div>
                  <div className="flex gap-1.5">
                    {!isInv ? (
                      <Button size="sm" variant="outline" onClick={() => grant(p.id, "investigator")}>
                        <UserPlus className="h-3 w-3 mr-1" />Investigator
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => revoke(p.id, "investigator")}>
                        <ShieldOff className="h-3 w-3" />
                      </Button>
                    )}
                    {!isAdmin ? (
                      <Button size="sm" variant="outline" onClick={() => grant(p.id, "admin")}
                        className="border-alert/40 text-alert hover:bg-alert/10">
                        <ShieldCheck className="h-3 w-3 mr-1" />Admin
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => revoke(p.id, "admin")} className="text-alert">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

const RoleBadge = ({ tone, children }: { tone: "alert" | "primary" | "muted"; children: React.ReactNode }) => {
  const cls = tone === "alert" ? "bg-alert/15 text-alert border-alert/30"
    : tone === "primary" ? "bg-primary/15 text-primary border-primary/30"
    : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest rounded border font-mono ${cls}`}>
      {children}
    </span>
  );
};

export default Admin;
