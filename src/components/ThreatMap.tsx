import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { format } from "date-fns";
import { Database } from "@/integrations/supabase/types";

type Incident = Database["public"]["Tables"]["incidents"]["Row"];

const SEVERITY_COLOR: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#dc2626",
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

  return (
    <div
      className="relative rounded-md overflow-hidden border border-border panel"
      style={{ height }}
    >
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer url={tile} attribution='&copy; CARTO &copy; OpenStreetMap contributors' />
        <RecenterOnFirst incidents={incidents} />
        {incidents.map((i) => {
          const color = SEVERITY_COLOR[i.severity] || "#06d6d6";
          const radius = i.severity === "critical" ? 12 : i.severity === "high" ? 9 : 7;
          return (
            <CircleMarker
              key={i.id}
              center={[i.latitude, i.longitude]}
              radius={radius}
              pathOptions={{
                color,
                weight: 2,
                fillColor: color,
                fillOpacity: 0.45,
              }}
            >
              <Popup>
                <div className="font-mono text-xs space-y-1 min-w-[180px]">
                  <div className="font-bold text-sm">{i.title}</div>
                  <div className="uppercase tracking-wider opacity-70">
                    {i.category} · <span style={{ color }}>{i.severity}</span>
                  </div>
                  <div className="opacity-80">{i.area || i.city || ""}</div>
                  <div className="opacity-60">
                    {format(new Date(i.occurred_at), "dd MMM yyyy · HH:mm")}
                  </div>
                  {i.description && <p className="pt-1 opacity-90">{i.description.slice(0, 120)}{i.description.length > 120 ? "…" : ""}</p>}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <div className="pointer-events-none absolute top-2 left-2 z-[400] font-mono text-[10px] uppercase tracking-widest text-primary/80 px-2 py-1 rounded bg-background/70 border border-primary/30">
        ● LIVE · {incidents.length} signals
      </div>
    </div>
  );
};
