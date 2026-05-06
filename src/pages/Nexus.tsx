import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { Network, Plus, Sparkles, X, Users, Car, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type Kind = "case" | "person" | "vehicle";
type GNode = { id: string; kind: Kind; label: string; sub?: string; raw: any };
type GLink = { source: string; target: string; label: string; id: string };

const KIND_COLOR: Record<Kind, string> = {
  case: "#FF2A2A",
  person: "#00FF41",
  vehicle: "#FFB020",
};

const Nexus = () => {
  const { user, isAdmin } = useAuth();
  const [cases, setCases] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [selected, setSelected] = useState<GNode | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [summarizing, setSummarizing] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const fgRef = useRef<any>();

  useEffect(() => {
    (async () => {
      if (!user) return;
      // Check role: investigator or admin
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const ok = (roles ?? []).some((r: any) => r.role === "investigator" || r.role === "admin");
      setAuthorized(ok);
    })();
  }, [user]);

  const load = useCallback(async () => {
    const [c, p, v, l] = await Promise.all([
      supabase.from("cases").select("*").order("created_at", { ascending: false }),
      supabase.from("persons").select("*").order("created_at", { ascending: false }),
      supabase.from("vehicles").select("*").order("created_at", { ascending: false }),
      supabase.from("case_links").select("*"),
    ]);
    if (c.error) toast.error(c.error.message);
    setCases(c.data ?? []);
    setPersons(p.data ?? []);
    setVehicles(v.data ?? []);
    setLinks(l.data ?? []);
  }, []);

  useEffect(() => { if (authorized) load(); }, [authorized, load]);

  const graph = useMemo(() => {
    const nodes: GNode[] = [
      ...cases.map((x) => ({ id: `case:${x.id}`, kind: "case" as const, label: x.title, sub: x.status, raw: x })),
      ...persons.map((x) => ({ id: `person:${x.id}`, kind: "person" as const, label: x.full_name, sub: x.role, raw: x })),
      ...vehicles.map((x) => ({ id: `vehicle:${x.id}`, kind: "vehicle" as const, label: x.plate, sub: [x.make, x.model].filter(Boolean).join(" "), raw: x })),
    ];
    const ids = new Set(nodes.map((n) => n.id));
    const edges: GLink[] = links
      .map((l) => ({ id: l.id, source: `${l.source_type}:${l.source_id}`, target: `${l.target_type}:${l.target_id}`, label: l.label }))
      .filter((e) => ids.has(e.source) && ids.has(e.target));
    return { nodes, links: edges };
  }, [cases, persons, vehicles, links]);

  const neighbors = useMemo(() => {
    if (!selected) return [];
    const set = new Set<string>();
    graph.links.forEach((l) => {
      if (l.source === selected.id || (l.source as any)?.id === selected.id) set.add(typeof l.target === "string" ? l.target : (l.target as any).id);
      if (l.target === selected.id || (l.target as any)?.id === selected.id) set.add(typeof l.source === "string" ? l.source : (l.source as any).id);
    });
    return graph.nodes.filter((n) => set.has(n.id));
  }, [selected, graph]);

  const summarize = async () => {
    if (!selected) return;
    setSummarizing(true);
    setSummary("");
    const { data, error } = await supabase.functions.invoke("case-summary", {
      body: { node: selected.raw, neighbors: neighbors.map((n) => ({ kind: n.kind, label: n.label, sub: n.sub, raw: n.raw })) },
    });
    setSummarizing(false);
    if (error) { toast.error(error.message); return; }
    setSummary((data as any)?.summary ?? "");
  };

  if (authorized === false) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container py-12">
          <div className="panel p-8 max-w-xl">
            <div className="text-[10px] font-mono uppercase tracking-widest text-alert mb-2">// access.denied</div>
            <h1 className="font-display text-2xl font-bold mb-2">Investigator clearance required</h1>
            <p className="text-sm text-muted-foreground">Case Nexus is restricted to <span className="text-foreground">investigator</span> or <span className="text-foreground">admin</span> roles. Contact command to be assigned.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 container py-6 space-y-4 animate-fade-in">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-primary mb-1">// case.nexus</div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2"><Network className="h-6 w-6 text-primary" /> Relationship Graph</h1>
            <p className="text-sm text-muted-foreground mt-1">Manually-entered cases, persons, vehicles. Link them. Let AI read the web.</p>
          </div>
          <div className="flex gap-2">
            <NewEntityDialog kind="case" onCreated={load} />
            <NewEntityDialog kind="person" onCreated={load} />
            <NewEntityDialog kind="vehicle" onCreated={load} />
            <Button variant="outline" onClick={() => setLinkOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Link</Button>
            <LinkDialog open={linkOpen} setOpen={setLinkOpen} nodes={graph.nodes} onCreated={load} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          <div className="panel relative overflow-hidden" style={{ height: "70vh" }}>
            {graph.nodes.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                No entities yet. Add a case, person, or vehicle to begin mapping the network.
              </div>
            ) : (
              <ForceGraph2D
                ref={fgRef}
                graphData={graph as any}
                nodeLabel={(n: any) => `${n.kind.toUpperCase()}: ${n.label}`}
                nodeRelSize={6}
                linkColor={() => "rgba(255,255,255,0.2)"}
                linkDirectionalParticles={1}
                linkDirectionalParticleColor={() => "#FF2A2A"}
                linkDirectionalParticleSpeed={0.006}
                backgroundColor="#050505"
                onNodeClick={(n: any) => { setSelected(n); setSummary(""); fgRef.current?.centerAt(n.x, n.y, 600); fgRef.current?.zoom(3, 600); }}
                nodeCanvasObject={(node: any, ctx, scale) => {
                  const r = 6;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
                  ctx.fillStyle = KIND_COLOR[node.kind as Kind];
                  ctx.fill();
                  if (selected?.id === node.id) {
                    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2 / scale; ctx.stroke();
                  }
                  ctx.font = `${10 / Math.max(scale, 0.6)}px monospace`;
                  ctx.fillStyle = "rgba(255,255,255,0.85)";
                  ctx.textAlign = "center";
                  ctx.fillText(node.label?.slice(0, 24) || "", node.x, node.y + r + 8 / scale);
                }}
              />
            )}
            <div className="absolute bottom-3 left-3 panel p-2 text-[10px] font-mono space-y-1">
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR.case }} /> CASE</div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR.person }} /> PERSON</div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR.vehicle }} /> VEHICLE</div>
            </div>
          </div>

          <div className="panel p-4 space-y-3 max-h-[70vh] overflow-y-auto">
            {!selected ? (
              <div className="text-sm text-muted-foreground">
                <div className="text-[10px] font-mono uppercase tracking-widest text-primary mb-2">// node.inspector</div>
                Click a node to inspect. Use <span className="text-foreground">AI Summary</span> to brief.
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Stat icon={Folder} n={cases.length} label="Cases" />
                  <Stat icon={Users} n={persons.length} label="Persons" />
                  <Stat icon={Car} n={vehicles.length} label="Vehicles" />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: KIND_COLOR[selected.kind] }}>// {selected.kind}</div>
                    <div className="font-bold text-lg">{selected.label}</div>
                    {selected.sub && <div className="text-xs font-mono text-muted-foreground">{selected.sub}</div>}
                  </div>
                  <button onClick={() => { setSelected(null); setSummary(""); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <pre className="text-[11px] font-mono bg-surface p-2 rounded overflow-x-auto whitespace-pre-wrap">{JSON.stringify(selected.raw, null, 2)}</pre>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">connections ({neighbors.length})</div>
                  {neighbors.length === 0 ? <div className="text-xs text-muted-foreground">— none —</div> : neighbors.map((n) => (
                    <button key={n.id} onClick={() => setSelected(n)} className="block w-full text-left text-xs p-1.5 hover:bg-surface-elevated rounded">
                      <span style={{ color: KIND_COLOR[n.kind] }}>●</span> {n.label} <span className="text-muted-foreground font-mono">· {n.kind}</span>
                    </button>
                  ))}
                </div>
                <Button onClick={summarize} disabled={summarizing} className="w-full bg-primary text-primary-foreground hover:bg-primary-glow shadow-glow">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" /> {summarizing ? "Analyzing…" : "AI Tactical Summary"}
                </Button>
                {summary && (
                  <div className="text-xs whitespace-pre-wrap font-mono bg-surface p-3 rounded border border-border">{summary}</div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const Stat = ({ icon: Icon, n, label }: any) => (
  <div className="panel p-2">
    <Icon className="h-4 w-4 mx-auto text-primary" />
    <div className="font-bold">{n}</div>
    <div className="text-[10px] font-mono uppercase text-muted-foreground">{label}</div>
  </div>
);

const NewEntityDialog = ({ kind, onCreated }: { kind: Kind; onCreated: () => void }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const { user } = useAuth();
  const submit = async () => {
    if (!user) return;
    const table = kind === "case" ? "cases" : kind === "person" ? "persons" : "vehicles";
    const required = kind === "case" ? "title" : kind === "person" ? "full_name" : "plate";
    if (!form[required]) { toast.error(`${required} required`); return; }
    const { error } = await supabase.from(table).insert({ ...form, created_by: user.id });
    if (error) { toast.error(error.message); return; }
    toast.success(`${kind} added`);
    setForm({}); setOpen(false); onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="capitalize"><Plus className="h-3.5 w-3.5 mr-1" /> {kind}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="capitalize">New {kind}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {kind === "case" && (<>
            <Input placeholder="Title *" onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="Summary" onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            <Select onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue placeholder="Status (open)" /></SelectTrigger>
              <SelectContent>{["open","active","cold","closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </>)}
          {kind === "person" && (<>
            <Input placeholder="Full name *" onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <Input placeholder="Alias" onChange={(e) => setForm({ ...form, alias: e.target.value })} />
            <Input placeholder="Phone" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Select onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue placeholder="Role (unknown)" /></SelectTrigger>
              <SelectContent>{["suspect","victim","witness","officer","associate","unknown"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea placeholder="Notes" onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </>)}
          {kind === "vehicle" && (<>
            <Input placeholder="Plate *" onChange={(e) => setForm({ ...form, plate: e.target.value })} />
            <Input placeholder="Make" onChange={(e) => setForm({ ...form, make: e.target.value })} />
            <Input placeholder="Model" onChange={(e) => setForm({ ...form, model: e.target.value })} />
            <Input placeholder="Color" onChange={(e) => setForm({ ...form, color: e.target.value })} />
            <Textarea placeholder="Notes" onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </>)}
        </div>
        <DialogFooter><Button onClick={submit}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const LinkDialog = ({ open, setOpen, nodes, onCreated }: any) => {
  const { user } = useAuth();
  const [src, setSrc] = useState("");
  const [tgt, setTgt] = useState("");
  const [label, setLabel] = useState("related");
  const submit = async () => {
    if (!user || !src || !tgt || src === tgt) { toast.error("Pick two distinct entities"); return; }
    const [st, sid] = src.split(":");
    const [tt, tid] = tgt.split(":");
    const { error } = await supabase.from("case_links").insert({ source_type: st, source_id: sid, target_type: tt, target_id: tid, label, created_by: user.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Link forged"); setOpen(false); setSrc(""); setTgt(""); setLabel("related"); onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Forge link</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Select value={src} onValueChange={setSrc}>
            <SelectTrigger><SelectValue placeholder="Source entity" /></SelectTrigger>
            <SelectContent>{nodes.map((n: GNode) => <SelectItem key={n.id} value={n.id}>{n.kind}: {n.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={tgt} onValueChange={setTgt}>
            <SelectTrigger><SelectValue placeholder="Target entity" /></SelectTrigger>
            <SelectContent>{nodes.map((n: GNode) => <SelectItem key={n.id} value={n.id}>{n.kind}: {n.label}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Relationship label (e.g. owns, suspect_in, witnessed)" />
        </div>
        <DialogFooter><Button onClick={submit}>Link</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Nexus;
