# Runbook — staging, rollback, production gate

## Staging (preview) deploy
Upload deploy, not Git-linked. From a clean `git archive` of the branch (no `.next`, `node_modules`, `.env*`):
```bash
vercel deploy --yes --scope space-up-solutions        # preview target only; never --prod
vercel alias set <deployment-url> <staging-alias> --scope space-up-solutions
```
Preview deployments get `X-Robots-Tag: noindex, nofollow, noarchive` (next.config.ts) and `<meta name="robots" content="noindex">` (src/lib/env.ts `indexable`), and an empty sitemap.

Preview env shares the production Upstash DB. Do **not** submit synthetic forms on staging unless you delete the keys afterwards.

## Rollback
- Staging: re-alias the previous staging deployment.
- Production: unchanged by this branch. Production rollback target stays as recorded in the Phase 4 handoff.

## Production gate (G5)
Requires Justin's explicit approval. Merge `blueprint-v1` → release branch, deploy with `--prod`, smoke `/`, `/who-we-serve`, `/ghana-build-readiness-review`, `/property`, `/api/health` (check `blueprint.violations === 0`), robots + sitemap.
