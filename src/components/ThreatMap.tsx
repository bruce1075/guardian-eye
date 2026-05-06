import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Rectangle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { format } from "date-fns";
import { Database } from "@/integrations/supabase/types";
import { Grid3x3, MapPin } from "lucide-react";

type Incident = Database["public"]["Tables"]["incidents"]["Row"];

const SEVERITY_COLOR: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#dc2626",
};

const SEVERITY_WEIGHT: Record<string, number> = {
  low: 1, medium: 2, high: 4, critical: 6,
};

const RecenterOnFirst = ({ incidents }: { incidents: Incident[] }) => {
  const map = useMap();
  useEffect(() => {
    if (incidents.length > 0) {
      const lats = incidents.map((i) => i.latitude);
      const lngs = incidents.map((i) => i.longitude);
      map.fitBounds(
        [
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)],
        ],
        { padding: [40, 40], maxZoom: 13 }
      );
    }
  }, [incidents, map]);
  return null;
};

const CELL = 0.05; // ~5.5km lat

const buildGrid = (incidents: Incident[]) => {
  const cells = new Map<string, { lat: number; lng: number; weight: number; count: number }>();
  for (const i of incidents) {
    const lat = Math.floor(i.latitude / CELL) * CELL;
    const lng = Math.floor(i.longitude / CELL) * CELL;
    const k = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
    const w = SEVERITY_WEIGHT[i.severity] ?? 1;
    const cur = cells.get(k);
    if (cur) { cur.weight += w; cur.count += 1; }
    else cells.set(k, { lat, lng, weight: w, count: 1 });
  }
  const max = Math.max(1, ...Array.from(cells.values()).map((c) => c.weight));
  return Array.from(cells.values()).map((c) => ({ ...c, intensity: c.weight / max }));
};

export const ThreatMap = ({
  incidents,
  center = [20.5937, 78.9629],
  zoom = 5,
  height = "60vh",
}: {
  incidents: Incident[];
  center?: [number, number];
  zoom?: number;
  height?: string;
}) => {
  const tile = useMemo(
    () => "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    []
  );
  const [showGrid, setShowGrid] = useState(true);
  const [showPins, setShowPins] = useState(true);
  const grid = useMemo(() => buildGrid(incidents), [incidents]);

  return (
    <div
      className="relative rounded-md overflow-hidden border border-border panel"
      style={{ height }}
    >
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer url={tile} attribution='&copy; CARTO &copy; OpenStreetMap contributors' />
        <RecenterOnFirst incidents={incidents} />

        {showGrid && grid.map((c) => {
          const opacity = 0.15 + c.intensity * 0.55;
          // red→orange→yellow heat
          const color = c.intensity > 0.66 ? "#dc2626" : c.intensity > 0.33 ? "#f59e0b" : "#facc15";
          return (
            <Rectangle
              key={`${c.lat}_${c.lng}`}
              bounds={[[c.lat, c.lng], [c.lat + CELL, c.lng + CELL]]}
              pathOptions={{ color, weight: 0.5, fillColor: color, fillOpacity: opacity }}
            >
              <Popup>
                <div className="font-mono text-xs">
                  <div className="font-bold">RISK CELL</div>
                  <div>signals: {c.count}</div>
                  <div>weight: {c.weight}</div>
                  <div>intensity: {(c.intensity * 100).toFixed(0)}%</div>
                </div>
              </Popup>
            </Rectangle>
          );
        })}

        {showPins && incidents.map((i) => {
          const color = SEVERITY_COLOR[i.severity] || "#06d6d6";
          const radius = i.severity === "critical" ? 12 : i.severity === "high" ? 9 : 7;
          return (
            <CircleMarker
              key={i.id}
              center={[i.latitude, i.longitude]}
              radius={radius}
              pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.45 }}
            >
              <Popup>
                <div className="font-mono text-xs space-y-1 min-w-[180px]">
                  <div className="font-bold text-sm">{i.title}</div>
                  <div className="uppercase tracking-wider opacity-70">
                    {i.category} · <span style={{ color }}>{i.severity}</span>
                  </div>
                  <div className="opacity-80">{i.area || i.city || ""}</div>
                  <div className="opacity-60">{format(new Date(i.occurred_at), "dd MMM yyyy · HH:mm")}</div>
                  {i.description && <p className="pt-1 opacity-90">{i.description.slice(0, 120)}{i.description.length > 120 ? "…" : ""}</p>}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute top-2 left-2 z-[400] font-mono text-[10px] uppercase tracking-widest text-primary/80 px-2 py-1 rounded bg-background/70 border border-primary/30">
        ● LIVE · {incidents.length} signals · {grid.length} cells
      </div>

      <div className="absolute top-2 right-2 z-[400] flex gap-1">
        <button
          onClick={() => setShowGrid((v) => !v)}
          className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border flex items-center gap-1 transition-colors ${showGrid ? "bg-alert/20 border-alert/60 text-alert" : "bg-background/70 border-border text-muted-foreground"}`}
        >
          <Grid3x3 className="h-3 w-3" /> Risk Grid
        </button>
        <button
          onClick={() => setShowPins((v) => !v)}
          className={`font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded border flex items-center gap-1 transition-colors ${showPins ? "bg-primary/20 border-primary/60 text-primary" : "bg-background/70 border-border text-muted-foreground"}`}
        >
          <MapPin className="h-3 w-3" /> Pins
        </button>
      </div>
    </div>
  );
};
