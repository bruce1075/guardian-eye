import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Radio } from "lucide-react";

type Incident = Database["public"]["Tables"]["incidents"]["Row"];

const TONE: Record<string, string> = {
  low: "border-l-safe text-safe",
  medium: "border-l-warn text-warn",
  high: "border-l-alert text-alert",
  critical: "border-l-alert text-alert text-glow",
};

export const SignalTicker = ({ incidents }: { incidents: Incident[] }) => {
  const [pulse, setPulse] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    incidents.slice(0, 5).forEach((i) => seen.current.add(i.id));
  }, []); // eslint-disable-line

  useEffect(() => {
    const ch = supabase
      .channel("ticker-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "incidents" }, (p) => {
        const id = (p.new as Incident).id;
        if (!seen.current.has(id)) {
          seen.current.add(id);
          setPulse(id);
          setTimeout(() => setPulse(null), 2400);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="panel h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-elevated">
        <div className="flex items-center gap-1.5">
          <Radio className="h-3 w-3 text-primary animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
            // live.ticker
          </span>
        </div>
        <span className="font-mono text-[9px] text-muted-foreground uppercase">
          {incidents.length} sig
        </span>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-border/50">
        {incidents.length === 0 && (
          <div className="p-6 text-center text-xs text-muted-foreground font-mono">
            no signals · standing by
          </div>
        )}
        {incidents.slice(0, 80).map((i) => (
          <div
            key={i.id}
            className={`p-2.5 border-l-2 ${TONE[i.severity] || ""} ${
              pulse === i.id ? "bg-alert/10 animate-pulse" : "hover:bg-surface-elevated/60"
            } transition-colors`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-[9px] uppercase tracking-wider opacity-80">
                {i.severity} · {i.category.replace("_", " ")}
              </span>
              <span className="font-mono text-[9px] text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(i.occurred_at), { addSuffix: false })}
              </span>
            </div>
            <div className="text-xs font-medium mt-0.5 text-foreground line-clamp-2">{i.title}</div>
            <div className="font-mono text-[10px] text-muted-foreground mt-1 truncate">
              ◉ {i.area || i.city || `${i.latitude.toFixed(2)},${i.longitude.toFixed(2)}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
