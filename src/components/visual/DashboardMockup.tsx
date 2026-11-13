import { Icon } from "@/components/ui/Icons";

/**
 * Sample owner reporting dashboard. ALL DATA IS ILLUSTRATIVE and labelled as such.
 * It shows the format of reporting, not results from a real project.
 */
const stages = [
  { name: "Site preparation & setting out", pct: 100 },
  { name: "Foundations", pct: 100 },
  { name: "Ground-floor blockwork & columns", pct: 85 },
  { name: "First-floor slab", pct: 20 },
  { name: "Roofing", pct: 0 },
];

export function DashboardMockup() {
  return (
    <div className="relative">
      <div className="absolute -top-3 left-5 z-10 rounded-full bg-gold px-3 py-1 text-xs font-bold uppercase tracking-wider text-forest">
        Sample report · illustrative data
      </div>
      <div className="overflow-hidden rounded-[1.5rem] border border-ivory/15 bg-[#0E2018] text-ivory shadow-2xl">
        <div className="flex items-center justify-between border-b border-ivory/10 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-ivory/50">Owner report · Week 14</p>
            <p className="font-display text-lg">4-bedroom residence · Sample project</p>
          </div>
          <span className="rounded-full bg-[#2f6b47] px-3 py-1 text-xs font-semibold">On schedule</span>
        </div>

        <div className="grid grid-cols-3 divide-x divide-ivory/10 border-b border-ivory/10 text-center">
          {[
            { k: "Progress", v: "41%" },
            { k: "Budget used", v: "38%" },
            { k: "Open issues", v: "2" },
          ].map((m) => (
            <div key={m.k} className="px-3 py-4">
              <p className="font-display text-2xl text-gold">{m.v}</p>
              <p className="text-xs uppercase tracking-wider text-ivory/55">{m.k}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3 px-5 py-5">
          {stages.map((s) => (
            <div key={s.name}>
              <div className="flex justify-between text-[13px]"><span className="text-ivory/85">{s.name}</span><span className="text-ivory/55">{s.pct}%</span></div>
              <div className="mt-1.5 h-1.5 rounded-full bg-ivory/10"><div className="h-1.5 rounded-full bg-gold" style={{ width: `${s.pct}%` }} /></div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 border-t border-ivory/10 px-5 py-4 text-[13px] sm:grid-cols-2">
          <div className="flex items-start gap-2.5"><Icon name="camera" className="h-4 w-4 shrink-0 text-gold" /><span>36 dated, geo-tagged photos · 3 videos uploaded</span></div>
          <div className="flex items-start gap-2.5"><Icon name="doc" className="h-4 w-4 shrink-0 text-gold" /><span>Payment request #4 verified — recommended for release</span></div>
          <div className="flex items-start gap-2.5"><Icon name="clock" className="h-4 w-4 shrink-0 text-gold" /><span>Next inspection: first-floor slab rebar (hold point)</span></div>
          <div className="flex items-start gap-2.5"><Icon name="chart" className="h-4 w-4 shrink-0 text-gold" /><span>Change orders: 1 approved, 0 pending</span></div>
        </div>
      </div>
    </div>
  );
}
