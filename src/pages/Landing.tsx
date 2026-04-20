import { Link } from "react-router-dom";
import { Shield, Map, FilePlus2, Sparkles, ShieldCheck, Network, Radio, Lock, ArrowRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 console-grid opacity-40 pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse-glow" />

        <div className="container relative pt-20 pb-28 md:pt-28 md:pb-36">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.3em] text-primary mb-6 animate-fade-in">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
            Operation · Citizen Sentinel · Live
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-bold leading-[0.95] tracking-tight max-w-4xl animate-fade-in">
            The brain of justice
            <br />
            <span className="bg-gradient-cyan bg-clip-text text-transparent">for a billion citizens.</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl animate-fade-in">
            VIGIL-INDIA is a citizen-powered crime intelligence network. Report incidents in seconds.
            Watch the threat map evolve in real time. Get AI-guided BNS sections so the right charges get filed.
          </p>

          <div className="mt-10 flex flex-wrap gap-3 animate-fade-in">
            <Button size="lg" asChild className="bg-primary text-primary-foreground hover:bg-primary-glow shadow-glow">
              <Link to="/auth?mode=signup">
                Enlist as Sentinel <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-border">
              <Link to="/auth">Access console</Link>
            </Button>
          </div>

          {/* live ticker */}
          <div className="mt-16 panel p-4 md:p-5 max-w-3xl">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-alert animate-pulse-glow" />
                Live · Bharat threat ticker
              </span>
              <span>system.online</span>
            </div>
            <div className="grid grid-cols-3 gap-4 font-mono">
              <Stat label="Stations linked" value="17,212" />
              <Stat label="BNS sections indexed" value="358" />
              <Stat label="Cities covered" value="28+UTs" tone="primary" />
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="container py-20 border-t border-border">
        <div className="grid md:grid-cols-3 gap-px bg-border rounded-md overflow-hidden">
          <Capability icon={Map} title="Threat Map" body="Real-time geospatial view of incidents across India. Filter by category, severity, and time window." />
          <Capability icon={FilePlus2} title="One-Tap Reporting" body="Citizens log incidents in under 60 seconds — location, photo, description. No bureaucracy." />
          <Capability icon={Sparkles} title="Sentinel AI" body="Plain-language description in. Correct BNS sections out. So police file the right charges, not generic ones." />
          <Capability icon={Network} title="Nexus Graph" body="Link suspects, vehicles, and cases across cities. (Investigator tier — coming v2)" />
          <Capability icon={Radio} title="OSINT Feeds" body="Public datasets, RSS, NCRB historicals. Layered with citizen signal. (v3)" />
          <Capability icon={Lock} title="Evidence Vault" body="Photos hashed and timestamped on upload. Tamper-evident chain of custody." />
        </div>
      </section>

      {/* WHY */}
      <section className="container py-20 border-t border-border">
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Most crimes are committed by <span className="text-alert">repeat offenders</span>.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Standard police databases see them as separate cases. VIGIL-INDIA links the dots —
              same vehicle, same modus operandi, same name spelling differing by two letters across two cities.
              The "invisible link" is what reduces crime.
            </p>
            <div className="mt-8 space-y-3 font-mono text-sm">
              <Tier level="1" tone="safe" label="Official record (CCTNS / e-Courts)" desc="Verified" />
              <Tier level="2" tone="warn" label="Multiple news sources" desc="Likely" />
              <Tier level="3" tone="alert" label="Single citizen / social signal" desc="Unverified" />
            </div>
          </div>
          <div className="panel p-6 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-4">
              <span>// sentinel.console</span>
              <span className="flex items-center gap-1"><Activity className="h-3 w-3 text-primary" /> active</span>
            </div>
            <div className="font-mono text-sm space-y-2 text-muted-foreground">
              <p><span className="text-primary">›</span> ingesting citizen.report#9281…</p>
              <p><span className="text-primary">›</span> matching MO against 47,219 historical cases</p>
              <p><span className="text-warn">›</span> link found: vehicle KA-03-XX-1247 → 3 prior incidents</p>
              <p><span className="text-alert">›</span> alert dispatched · jurisdiction.bengaluru</p>
              <p><span className="text-safe">›</span> bns.suggested: §303(2), §317(2)</p>
              <p className="opacity-50">› awaiting next signal_</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-24 border-t border-border text-center">
        <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-4 text-glow" />
        <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">Stand watch with us.</h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-8">
          Every report you file makes a neighborhood safer. Every link the AI surfaces brings a repeat offender closer to justice.
        </p>
        <Button size="lg" asChild className="bg-primary text-primary-foreground hover:bg-primary-glow shadow-glow">
          <Link to="/auth?mode=signup">Enlist now <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </section>

      <footer className="border-t border-border py-6">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-2 text-xs font-mono text-muted-foreground">
          <span>VIGIL-INDIA · classified · v1.0</span>
          <span>For emergencies dial <span className="text-alert font-bold">112</span></span>
        </div>
      </footer>
    </div>
  );
};

const Stat = ({ label, value, tone }: { label: string; value: string; tone?: "primary" }) => (
  <div>
    <div className={`text-2xl font-bold ${tone === "primary" ? "text-primary text-glow" : ""}`}>{value}</div>
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
  </div>
);

const Capability = ({ icon: Icon, title, body }: { icon: any; title: string; body: string }) => (
  <div className="bg-card p-6 hover:bg-surface-elevated transition-colors group">
    <Icon className="h-5 w-5 text-primary mb-3 group-hover:text-glow transition-all" />
    <h3 className="font-display font-bold mb-1.5">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
  </div>
);

const Tier = ({ level, tone, label, desc }: { level: string; tone: "safe" | "warn" | "alert"; label: string; desc: string }) => (
  <div className="flex items-center gap-3 panel p-3">
    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest rounded font-bold bg-${tone}/15 text-${tone}`}>
      Tier {level}
    </span>
    <span className="flex-1 text-foreground">{label}</span>
    <span className="text-muted-foreground text-xs">{desc}</span>
  </div>
);

export default Landing;
