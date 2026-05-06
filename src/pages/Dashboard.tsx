import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, MapPin, FilePlus2, Sparkles, Filter, ShieldAlert, X } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { ThreatMap } from "@/components/ThreatMap";
import { SignalTicker } from "@/components/SignalTicker";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useGeoAlerts } from "@/hooks/useGeoAlerts";

type Incident = Database["public"]["Tables"]["incidents"]["Row"];

const SEVERITY_TONE: Record<string, string> = {
  low: "text-safe",
  medium: "text-warn",
  high: "text-alert",
  critical: "text-alert text-glow",
};

const Dashboard = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [window, setWindow] = useState<string>("30");
  const { coords, nearby, dismiss, radiusKm } = useGeoAlerts();

  const load = async () => {
    setLoading(true);
    const sinceDays = parseInt(window, 10);
    const since = new Date(Date.now() - sinceDays * 86400_000).toISOString();
    let q = supabase.from("incidents").select("*").gte("occurred_at", since).order("occurred_at", { ascending: false }).limit(500);
    if (category !== "all") q = q.eq("category", category as any);
    if (severity !== "all") q = q.eq("severity", severity as any);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setIncidents(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [category, severity, window]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("incidents-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "incidents" }, (payload) => {
        setIncidents((prev) => [payload.new as Incident, ...prev]);
        toast(`New signal: ${(payload.new as Incident).title}`, { description: (payload.new as Incident).area || "" });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const stats = useMemo(() => {
    const total = incidents.length;
    const critical = incidents.filter((i) => i.severity === "critical" || i.severity === "high").length;
    const last24 = incidents.filter((i) => new Date(i.occurred_at) > new Date(Date.now() - 86400_000)).length;
    return { total, critical, last24 };
  }, [incidents]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 container py-6 md:py-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-primary mb-1">// command.console</div>
            <h1 className="text-3xl font-display font-bold">Threat Map</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live geospatial view of citizen-reported incidents across India.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={window} onValueChange={setWindow}>
              <SelectTrigger className="w-[110px] font-mono text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">24 hours</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[150px] font-mono text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {["theft","robbery","assault","burglary","vehicle_theft","cybercrime","fraud","harassment","vandalism","missing_person","suspicious_activity","other"].map(c => (
                  <SelectItem key={c} value={c}>{c.replace("_"," ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-[130px] font-mono text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severity</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary-glow shadow-glow">
              <Link to="/report"><FilePlus2 className="h-4 w-4 mr-1.5" /> Report</Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Activity} label="Total signals" value={stats.total.toString()} />
          <StatCard icon={AlertTriangle} label="High / critical" value={stats.critical.toString()} tone="alert" />
          <StatCard icon={MapPin} label="Last 24h" value={stats.last24.toString()} tone="primary" />
          <StatCard icon={Sparkles} label="AI status" value="ONLINE" tone="safe" mono />
        </div>

        {/* Proximity alert banner */}
        {nearby.length > 0 && (
          <div className="panel border-alert/60 bg-alert/5 p-3 space-y-2 animate-fade-in">
            <div className="flex items-center gap-2 text-alert">
              <ShieldAlert className="h-4 w-4 animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-widest">
                // proximity.alert · {radiusKm}km radius
              </span>
            </div>
            {nearby.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-alert">⚠ {i.title}</span>
                  <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                    {i.severity.toUpperCase()} · {i.category.replace("_", " ")} · {i.area || i.city || ""}
                  </span>
                </div>
                <button
                  onClick={() => dismiss(i.id)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Map + Ticker */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <ThreatMap incidents={incidents} height="62vh" />
          <div className="h-[62vh]">
            <SignalTicker incidents={incidents} />
          </div>
        </div>

        {/* Recent feed */}
        <div className="panel">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-alert animate-pulse-glow" />
              <h2 className="font-display font-bold">Live signal feed</h2>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {loading ? "syncing…" : `${incidents.length} records`}
            </span>
          </div>
          <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
            {incidents.length === 0 && !loading && (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No signals yet. Be the first sentinel — <Link to="/report" className="text-primary hover:underline">file a report</Link>.
              </div>
            )}
            {incidents.slice(0, 50).map((i) => (
              <div key={i.id} className="p-4 hover:bg-surface-elevated transition-colors flex items-start gap-3">
                <div className={`mt-1.5 h-2 w-2 rounded-full bg-current ${SEVERITY_TONE[i.severity] || ""}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{i.title}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {i.category.replace("_", " ")} · <span className={SEVERITY_TONE[i.severity]}>{i.severity}</span>
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{i.description}</p>
                  <div className="text-[11px] font-mono text-muted-foreground mt-1.5">
                    {i.area ? `${i.area} · ` : ""}{i.city || `${i.latitude.toFixed(3)}, ${i.longitude.toFixed(3)}`}
                    {" · "}{formatDistanceToNow(new Date(i.occurred_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, tone, mono }: { icon: any; label: string; value: string; tone?: "alert" | "primary" | "safe"; mono?: boolean }) => {
  const colorMap: Record<string, string> = {
    alert: "text-alert",
    primary: "text-primary text-glow",
    safe: "text-safe",
  };
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className={`h-3.5 w-3.5 ${tone ? colorMap[tone] : "text-primary"}`} />
      </div>
      <div className={`text-2xl font-bold mt-1 ${tone ? colorMap[tone] : ""} ${mono ? "font-mono text-base" : ""}`}>
        {value}
      </div>
    </div>
  );
};

export default Dashboard;
