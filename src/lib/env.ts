/**
 * Deployment environment flags (safe on server and in next.config at build time).
 * Staging = any non-production Vercel deployment (preview/development) or STAGING=1.
 * Production (VERCEL_ENV=production) is NEVER noindexed by this flag.
 */
export const vercelEnv = process.env.VERCEL_ENV || "";
export const isStaging = process.env.STAGING === "1" || (vercelEnv !== "" && vercelEnv !== "production");

/**
 * Indexing switch for robots.txt + sitemap. Staging is never indexable. Production stays indexable by default
 * (preserves current behaviour); set NEXT_PUBLIC_INDEXABLE_SITE=false to block, or =true explicitly at launch
 * once the canonical custom domain is verified.
 */
export const indexable = !isStaging && process.env.NEXT_PUBLIC_INDEXABLE_SITE !== "false";
