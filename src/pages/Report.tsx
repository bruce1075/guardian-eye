import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Loader2, Sparkles, Upload, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CATEGORIES = ["theft","robbery","assault","burglary","vehicle_theft","cybercrime","fraud","harassment","vandalism","missing_person","suspicious_activity","other"] as const;
const SEVERITIES = ["low","medium","high","critical"] as const;

const schema = z.object({
  title: z.string().trim().min(4, "Title too short").max(120),
  description: z.string().trim().min(20, "Describe the incident in at least 20 characters").max(4000),
  category: z.enum(CATEGORIES),
  severity: z.enum(SEVERITIES),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  area: z.string().trim().max(120).optional().or(z.literal("")),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

type BNSResult = {
  bns_sections: { section: string; title: string; why: string; punishment: string }[];
  summary: string;
  fir_guidance: string;
  severity_estimate: "low" | "medium" | "high" | "critical";
};

const Report = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [aiResult, setAiResult] = useState<BNSResult | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "theft" as typeof CATEGORIES[number],
    severity: "medium" as typeof SEVERITIES[number],
    city: "",
    area: "",
    latitude: NaN,
    longitude: NaN,
  });

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude })),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const handleAnalyze = async () => {
    if (form.description.trim().length < 20) {
      toast.error("Write a longer description first (20+ chars).");
      return;
    }
    setAnalyzing(true);
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-bns", {
        body: {
          description: form.description,
          category: form.category,
          location: [form.area, form.city].filter(Boolean).join(", "),
        },
      });
      if (error) throw error;
      if ((data as any).error) throw new Error((data as any).error);
      setAiResult(data as BNSResult);
      // auto-set severity from AI
      setForm((f) => ({ ...f, severity: (data as BNSResult).severity_estimate }));
      toast.success("Sentinel analysis complete.");
    } catch (e: any) {
      toast.error(e.message || "AI analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      let photo_url: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("incident-photos").upload(path, photoFile, {
          upsert: false, contentType: photoFile.type,
        });
        if (upErr) throw upErr;
        photo_url = path; // store path, sign on read
      }

      const { data: ins, error: insErr } = await supabase.from("incidents").insert({
        reporter_id: user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        severity: parsed.data.severity,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        city: parsed.data.city || null,
        area: parsed.data.area || null,
        photo_url,
      }).select().single();
      if (insErr) throw insErr;

      // Save AI suggestion if present
      if (aiResult && ins) {
        await supabase.from("ai_suggestions").insert({
          incident_id: ins.id,
          user_id: user.id,
          bns_sections: aiResult.bns_sections,
          summary: `${aiResult.summary}\n\nFIR: ${aiResult.fir_guidance}`,
        });
      }

      toast.success("Signal logged. Stay safe.");
      nav("/dashboard");
    } catch (e: any) {
      toast.error(e.message || "Failed to file report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 container py-6 md:py-8 max-w-4xl animate-fade-in">
        <div className="text-[10px] font-mono uppercase tracking-widest text-primary mb-1">// new.signal</div>
        <h1 className="text-3xl font-display font-bold mb-1">File an incident report</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Take 60 seconds. Your signal helps every sentinel nearby.
        </p>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-5 gap-6">
          {/* Form */}
          <div className="lg:col-span-3 panel p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" required value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Phone snatching near metro station" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace("_"," ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">What happened</Label>
              <Textarea id="description" required rows={6} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the incident clearly. Who, what, when, what they wore, vehicle number if any, direction of escape." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="area">Area / Locality</Label>
                <Input id="area" value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  placeholder="HSR Layout, Sector 2" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Bengaluru" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lat">Latitude</Label>
                <Input id="lat" type="number" step="any" required value={Number.isNaN(form.latitude) ? "" : form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lng">Longitude</Label>
                <Input id="lng" type="number" step="any" required value={Number.isNaN(form.longitude) ? "" : form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) })} />
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => {
              navigator.geolocation?.getCurrentPosition((p) =>
                setForm((f) => ({ ...f, latitude: p.coords.latitude, longitude: p.coords.longitude })));
            }}>
              <MapPin className="h-3.5 w-3.5 mr-1.5" /> Use my location
            </Button>

            <div className="space-y-1.5">
              <Label htmlFor="photo">Photo (optional)</Label>
              <Input id="photo" type="file" accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Upload className="h-3 w-3" /> Stored encrypted. Only authorised viewers.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
                {analyzing ? "Analysing…" : "Run Sentinel AI"}
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1 bg-primary text-primary-foreground hover:bg-primary-glow shadow-glow">
                {submitting ? "Filing…" : "File signal"}
              </Button>
            </div>
          </div>

          {/* AI panel */}
          <aside className="lg:col-span-2 panel p-5 self-start sticky top-20">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-primary">// sentinel.lex</div>
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <h2 className="font-display font-bold mb-1">BNS section guidance</h2>
            <p className="text-xs text-muted-foreground mb-4">
              AI-suggested Bharatiya Nyaya Sanhita 2023 sections. So police file the right charges.
            </p>

            {!aiResult && !analyzing && (
              <div className="text-sm text-muted-foreground border border-dashed border-border rounded-md p-4 text-center">
                Write your description, then click <strong>Run Sentinel AI</strong>.
              </div>
            )}
            {analyzing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Analysing against 358 BNS sections…
              </div>
            )}
            {aiResult && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">summary</div>
                  <p className="text-sm">{aiResult.summary}</p>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">applicable sections</div>
                  {aiResult.bns_sections.map((s, i) => (
                    <div key={i} className="border border-border rounded p-3 bg-surface">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-mono font-bold text-primary">{s.section}</span>
                        <span className="text-xs text-muted-foreground">{s.punishment}</span>
                      </div>
                      <div className="text-sm font-medium mt-0.5">{s.title}</div>
                      <p className="text-xs text-muted-foreground mt-1">{s.why}</p>
                    </div>
                  ))}
                </div>
                <div className="border-l-2 border-warn pl-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-warn mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> file FIR at
                  </div>
                  <p className="text-sm">{aiResult.fir_guidance}</p>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Informational only, not legal advice. Consult a lawyer for representation.
                </p>
              </div>
            )}
          </aside>
        </form>
      </main>
    </div>
  );
};

export default Report;
