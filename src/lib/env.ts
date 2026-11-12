/**
 * Deployment environment flags (safe on server and in next.config at build time).
 * Staging = any non-production Vercel deployment (preview/development) or STAGING=1.
 * Production (VERCEL_ENV=production) is NEVER noindexed by this flag.
 */
export const vercelEnv = process.env.VERCEL_ENV || "";
export const isStaging = process.env.STAGING === "1" || (vercelEnv !== "" && vercelEnv !== "production");
