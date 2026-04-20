import { Shield } from "lucide-react";

export const LoadingShell = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <Shield className="h-8 w-8 text-primary animate-pulse-glow" />
      <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
        Establishing secure channel…
      </p>
    </div>
  </div>
);
