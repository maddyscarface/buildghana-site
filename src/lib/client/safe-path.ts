/**
 * Privacy-filtered page paths for analytics (blueprint v1 §02.5 / §03.5: "zero customer sensitive data
 * in URL query strings and analytics"). Pure functions so they can be unit-tested.
 *
 * - Only attribution parameters survive (UTM + ad click ids). Tokens (`t`), emails, ids and anything
 *   else are dropped.
 * - Record ids in private paths are replaced with placeholders.
 * - Staff/admin paths are never tracked at all (see `isUntrackedPath`).
 */
const KEEP_PARAM = /^(utm_[a-z_]+|gclid|gbraid|wbraid|fbclid|msclkid|ttclid|li_fat_id|oppref|obref)$/i;

const REDACTIONS: [RegExp, string][] = [
  [/^\/ghana-build-readiness-review\/case\/[^/]+/, "/ghana-build-readiness-review/case/[id]"],
];

/** Paths that must never send page views to analytics or ad platforms. */
export function isUntrackedPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function redactPath(pathname: string): string {
  for (const [re, rep] of REDACTIONS) if (re.test(pathname)) return pathname.replace(re, rep);
  return pathname;
}

export function safeSearch(search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const out = new URLSearchParams();
  for (const [k, v] of params) if (KEEP_PARAM.test(k)) out.append(k, v.slice(0, 300));
  const s = out.toString();
  return s ? `?${s}` : "";
}

export function safePagePath(pathname: string, search = ""): string {
  return redactPath(pathname) + safeSearch(search);
}

/** Inline-script version for gtag/GTM `page_location` (kept in sync with the functions above by tests). */
export const SAFE_LOCATION_JS = `(function(){try{var u=new URL(location.href),k=Array.from(u.searchParams.keys()),re=${KEEP_PARAM.toString()};k.forEach(function(x){if(!re.test(x))u.searchParams.delete(x)});var p=u.pathname.replace(/^\\/ghana-build-readiness-review\\/case\\/[^/]+/,'/ghana-build-readiness-review/case/[id]');return u.origin+p+u.search;}catch(e){return location.origin+location.pathname;}})()`;
