"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface ActivityTypeOption {
  value: string; // canonical type key (e.g. "running", "rowing")
  label: string; // proper-case display text (e.g. "Running", "Rowing")
}

/**
 * Activity-type filter dropdown. Writes the selection to the `type` search param,
 * which re-renders the page server-side; "All" (the default) omits the param.
 */
export function ActivityTypeFilter({ options }: { options: ActivityTypeOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = searchParams.get("type") ?? "all";

  function navigate(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("type");
    } else {
      params.set("type", value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Activity</span>
      <select
        value={current}
        onChange={(e) => navigate(e.target.value)}
        className="rounded-md border bg-card px-3 py-1.5 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-forest"
      >
        <option value="all">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
