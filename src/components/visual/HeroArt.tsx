/**
 * Original architectural illustration used until licensed or genuine project photography is available.
 * A contemporary two-storey tropical residence: deep roof overhangs, breeze-block screen, veranda.
 * Replace with real Ghana project imagery once it exists (see docs/17-assets-visuals.md).
 */
export function HeroArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 520" className={className} role="img" aria-label="Illustration of a contemporary two-storey home with deep roof overhangs and a veranda">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#203B2C" />
          <stop offset="1" stopColor="#12291F" />
        </linearGradient>
        <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E9C88E" />
          <stop offset="1" stopColor="#D6AA64" />
        </linearGradient>
        <pattern id="breeze" width="18" height="18" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" fill="#EFE8DA" />
          <circle cx="9" cy="9" r="5" fill="none" stroke="#C9BBA0" strokeWidth="2" />
        </pattern>
        <clipPath id="frame"><rect x="0" y="0" width="640" height="520" rx="28" /></clipPath>
      </defs>
      <g clipPath="url(#frame)">
        <rect width="640" height="520" fill="url(#sky)" />
        <circle cx="500" cy="120" r="58" fill="url(#sun)" opacity="0.9" />
        {/* distant hills */}
        <path d="M0 360 C120 320 200 340 300 318 C420 292 520 330 640 300 V520 H0Z" fill="#2C4D3A" />
        {/* ground */}
        <path d="M0 410 H640 V520 H0Z" fill="#B7774A" opacity="0.55" />
        <path d="M0 418 H640" stroke="#D6AA64" strokeOpacity="0.35" />

        {/* palm */}
        <g stroke="#0E2018" strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M84 412 C92 340 96 300 110 250" />
          <path d="M110 250 C80 236 58 244 40 262" />
          <path d="M110 250 C96 222 74 214 52 214" />
          <path d="M110 250 C124 222 148 212 172 220" />
          <path d="M110 250 C138 246 160 258 172 280" />
          <path d="M110 250 C112 226 104 206 92 196" />
        </g>

        {/* house — ground floor */}
        <rect x="180" y="300" width="330" height="112" fill="#F7F3EB" />
        <rect x="200" y="322" width="110" height="90" fill="#12291F" />
        <path d="M228 322 V412 M255 322 V412 M282 322 V412" stroke="#2C4D3A" strokeWidth="3" />
        <rect x="336" y="330" width="78" height="56" fill="#203B2C" />
        <rect x="430" y="330" width="62" height="82" fill="#5B3B26" />
        {/* veranda slab */}
        <rect x="164" y="292" width="364" height="10" fill="#18241C" />
        {/* upper floor */}
        <rect x="236" y="196" width="260" height="96" fill="#EFE8DA" />
        <rect x="236" y="196" width="96" height="96" fill="url(#breeze)" />
        <rect x="350" y="216" width="126" height="54" fill="#12291F" />
        <path d="M392 216 V270 M434 216 V270" stroke="#2C4D3A" strokeWidth="3" />
        {/* roof overhang */}
        <rect x="214" y="180" width="304" height="16" fill="#18241C" />
        <rect x="214" y="180" width="304" height="4" fill="#D6AA64" />
        {/* balcony rail */}
        <path d="M350 270 H496" stroke="#18241C" strokeWidth="3" />
        {/* columns */}
        <rect x="174" y="302" width="8" height="110" fill="#18241C" />
        <rect x="510" y="302" width="8" height="110" fill="#18241C" />
        {/* wall + gate */}
        <rect x="20" y="398" width="600" height="14" fill="#EFE8DA" opacity="0.85" />
        {/* shrubs */}
        <g fill="#2C4D3A">
          <ellipse cx="200" cy="410" rx="28" ry="12" />
          <ellipse cx="540" cy="408" rx="34" ry="14" />
          <ellipse cx="590" cy="410" rx="22" ry="10" />
        </g>
        {/* survey line + pins (oversight motif) */}
        <g stroke="#D6AA64" strokeWidth="1.5" strokeDasharray="5 6" fill="none" opacity="0.9">
          <path d="M150 470 H560" />
        </g>
        <g fill="#D6AA64"><circle cx="150" cy="470" r="5" /><circle cx="560" cy="470" r="5" /></g>
      </g>
    </svg>
  );
}
