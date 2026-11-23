import type { Readiness } from "../../domain/readiness";

const STYLES: Record<Readiness["status"], { badge: string; dot: string }> = {
  ready: { badge: "bg-forest/10 text-forest border-forest/30", dot: "bg-forest" },
  caution: { badge: "bg-orange-500/10 text-orange-600 border-orange-500/30", dot: "bg-orange-500" },
  rest: { badge: "bg-red-500/10 text-red-600 border-red-500/30", dot: "bg-red-500" },
  "no-data": { badge: "bg-stone-500/10 text-muted-foreground border-stone-400/30", dot: "bg-stone-400" },
};

export function ReadinessIndicator({ readiness }: { readiness: Readiness }) {
  const style = STYLES[readiness.status];
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-6 ${style.badge}`}>
      <span className={`h-3 w-3 shrink-0 rounded-full ${style.dot}`} />
      <div>
        <p className="text-sm font-bold tracking-wide">{readiness.label}</p>
        <p className="text-xs opacity-80">{readiness.detail}</p>
      </div>
    </div>
  );
}
