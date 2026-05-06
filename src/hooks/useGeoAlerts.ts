import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Incident = Database["public"]["Tables"]["incidents"]["Row"];

const RADIUS_KM = 2;

// Haversine distance in km
const dist = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const useGeoAlerts = () => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearby, setNearby] = useState<Incident[]>([]);
  const seen = useRef<Set<string>>(new Set());

  // Get user location once
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { maximumAge: 600_000, timeout: 8000 }
    );
  }, []);

  // Subscribe to inserts; when a high/critical incident lands within radius, alert.
  useEffect(() => {
    if (!coords) return;
    const ch = supabase
      .channel("geo-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "incidents" },
        (payload) => {
          const i = payload.new as Incident;
          if (seen.current.has(i.id)) return;
          if (!["high", "critical"].includes(i.severity)) return;
          const km = dist(coords.lat, coords.lng, i.latitude, i.longitude);
          if (km > RADIUS_KM) return;
          seen.current.add(i.id);
          setNearby((p) => [i, ...p].slice(0, 5));
          toast.error(`⚠ PROXIMITY ALERT — ${i.title}`, {
            description: `${i.category.replace("_", " ").toUpperCase()} · ${km.toFixed(2)} km · ${
              i.area || i.city || ""
            }`,
            duration: 12_000,
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [coords]);

  const dismiss = (id: string) => setNearby((p) => p.filter((x) => x.id !== id));

  return { coords, nearby, dismiss, radiusKm: RADIUS_KM };
};
