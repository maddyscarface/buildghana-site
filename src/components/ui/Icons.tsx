import type { IconName } from "@/content/services";

const paths: Record<IconName | "check" | "arrow" | "whatsapp" | "menu" | "close" | "camera" | "doc" | "chart" | "clock" | "lock" | "upload" | "scale" | "card" | "fileCheck" | "user" | "pin", React.ReactNode> = {
  map: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></>,
  compass: <><path d="M4 20 12 4l8 16" /><path d="M7.5 13h9" /><circle cx="12" cy="4" r="1.2" /></>,
  ledger: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  shield: <><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  crane: <><path d="M6 21V5h12" /><path d="M6 5 3 9M18 5v5" /><path d="M16 10h4v3h-4z" /><path d="M3 21h8" /></>,
  rescue: <><path d="M3 21h18" /><path d="M5 21V10l7-5 7 5v11" /><path d="M10 21v-5h4v5" /><path d="M9 11h.01M15 11h.01" /></>,
  building: <><rect x="4" y="3" width="10" height="18" /><path d="M14 9h6v12h-6" /><path d="M7 7h1M10 7h1M7 11h1M10 11h1M7 15h1M10 15h1M17 13h1M17 17h1" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  whatsapp: <><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19l-4 1Z" /><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1.2-1.2 1.8.8-.4 1.6c-3.5.4-7.8-3.9-7.4-7.4l1.6-.4.8 1.8L9 9.5Z" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  doc: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  chart: <><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /><path d="M12 14.5v2.5" /></>,
  upload: <><path d="M12 16V4m-4.5 4.5L12 4l4.5 4.5" /><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></>,
  scale: <><path d="M12 4v16M7 20h10" /><path d="M5 8h14" /><path d="m5 8-2.5 6a3 3 0 0 0 5 0L5 8Zm14 0-2.5 6a3 3 0 0 0 5 0L19 8Z" /></>,
  card: <><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h3" /></>,
  fileCheck: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="m9 14 2 2 4-4" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>,
  pin: <><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></>,
};

export type AnyIcon = keyof typeof paths;

export function Icon({ name, className = "h-6 w-6" }: { name: AnyIcon; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap">
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
        <rect width="40" height="40" rx="10" fill={light ? "#F7F3EB" : "#12291F"} />
        <path d="M9 21 20 11l11 10" fill="none" stroke="#D6AA64" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 19.5V29h14v-9.5" fill="none" stroke={light ? "#12291F" : "#F7F3EB"} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M18 29v-5h4v5" fill="none" stroke={light ? "#12291F" : "#F7F3EB"} strokeWidth="2.2" />
      </svg>
      <span className={`font-display text-[1.28rem] leading-none ${light ? "text-ivory" : "text-forest"}`}>
        BuildGhana <span className="italic text-gold">Abroad</span>
      </span>
    </span>
  );
}
