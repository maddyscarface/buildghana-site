# 14 — Deployment (Vercel)

**Nothing has been deployed.** These are the steps to do it.

## 1. Repository
```bash
git init && git add . && git commit -m "BuildGhana Abroad v1"
gh repo create buildghana-abroad --private --source=. --push
```

## 2. Vercel project
1. vercel.com → Add New → Project → import the repo. Framework: Next.js (auto). Node 20+.
2. Settings → Environment Variables: add everything from `.env.example`.
   - Production **and** Preview: `GHL_*` (consider a separate GHL sub-account or pipeline for Preview), `UPSTASH_*`, `CRM_WEBHOOK_SECRET` (generate: `openssl rand -hex 32`).
   - Production only: `META_*`, `GA4_*`, `NEXT_PUBLIC_GTM_ID` (or a GTM staging environment for Preview).
   - **Never** set `LEAD_ALLOW_MEMORY_STORE` on Vercel.
3. Deploy. Preview deployments automatically get `robots.txt: Disallow: /`.

## 3. Upstash Redis (storage, idempotency, rate limiting)
Vercel Marketplace → Upstash → Redis (choose a U.S. East region) → connect to the project (injects `UPSTASH_REDIS_REST_URL/TOKEN`). Enable TLS (default) and daily backups if on a paid plan.

## 4. Domain
Buy/confirm the domain (doc 01: check availability first) → Vercel → Domains → add apex + `www` → follow DNS records → set `NEXT_PUBLIC_SITE_URL=https://www.yourdomain.com` → redeploy.

## 5. Integrations (in order)
1. GHL custom fields, pipeline, tokens → doc 07
2. GHL workflows + webhook → doc 08
3. GTM container + GA4 + Ads + Pixel → doc 09
4. Meta CAPI token: Events Manager → Dataset → Settings → Generate access token
5. GA4 MP secret: Admin → Data streams → Measurement Protocol API secrets
6. Turnstile (optional): Cloudflare dashboard → Turnstile → add site → keys
7. Run doc 13 integration checks with `META_TEST_EVENT_CODE` set → remove it → redeploy

## 6. Runbook
- **Health:** `GET /api/health`
- **GHL retry queue:** in Upstash console `LRANGE leads:ghl_retry 0 -1` → for each id `GET lead:data:{id}` → create in GHL manually (or add a small script). Then `LREM`.
- **Change scoring without deploy:** edit JSON → paste into `LEAD_SCORING_JSON` → redeploy (env changes need a redeploy on Vercel).
- **Rotate secrets:** regenerate in source system → update Vercel env → redeploy → update GHL webhook header for `CRM_WEBHOOK_SECRET`.
- **Data retention:** set a policy (privacy doc) and periodically delete old `lead:data:*` keys.

## Local development
```bash
cp .env.example .env.local   # fill what you have; integrations stay off otherwise
npm install
npm run dev                  # http://localhost:3000  (dev mode stores leads in memory)
npm test && npm run typecheck && npm run build
# E2E smoke (needs playwright: npm i -D playwright && npx playwright install chromium)
LEAD_ALLOW_MEMORY_STORE=1 npm start &  BASE_URL=http://localhost:3000 node scripts/e2e-smoke.mjs
```
