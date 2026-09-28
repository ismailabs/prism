# Historical integration notes — obsolete

AI Studio, its routes, API, and services are removed. Do not restore them. Only the exchange-rate integration remains in the current application. See [Phase 1 report](codex/PHASE_1_REPORT.md) for verified configuration; the material below is retained solely as historical context.

## Former AI Studio behavior (2026-09-19)

AI Studio is a local demo. It requires no Higgsfield credentials, service-role key, report database migration, or server setup. Existing finance authentication and data configuration remain in use.

`src/services/higgsfield.ts` simulates a 1.5-second generation, returns sample metrics, localized month titles, summaries, and self-contained SVG previews. The weekly recap produces a clearly labeled sample storyboard, not an actual generated video. No financial account data is sent to an AI provider.

Creations are saved under `prism_mock_creations` with a versioned schema and filtered by signed-in user ID. Each user retains their latest 100 creations. LocalStorage persists until browser data is cleared; when storage is unavailable or full, new creations remain in memory until the page closes. This browser storage is demo convenience, not an access-control boundary for sensitive data. No actual financial data is stored in mock creations. Other tabs synchronize stored changes.

The former `/api/higgsfield` endpoint now returns HTTP 410 and cannot submit paid jobs. The legacy server/provider files and their security tests remain as inactive reference code; the integration instructions below describe that former implementation and do not apply to the current AI Studio.

---
# P.R.I.S.M. integration setup

## Server credentials

Set these values in the ignored `.env.local` for local development and in the Vercel project's environment settings for deployment. Private credentials have no `VITE_` prefix.

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Public project URL used by browser and server |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase client key, protected by database RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for saving provider job identifiers and results; obtain it from the Supabase project settings |
| `HIGGSFIELD_API_KEY` | Server-only `KEY_ID:KEY_SECRET` credentials |
| `EXCHANGE_RATE_API_KEY` | Server-only ExchangeRate-API key; Frankfurter remains available if this is missing or unavailable |

The public Supabase key cannot replace the service-role key. Report submission returns a specific configuration error until both private keys and the SQL migration are configured. Standard finance CRUD continues to use the public client with the signed-in user's bearer token.

## Higgsfield jobs

The application uses the official [`@higgsfield/client` TypeScript SDK](https://github.com/higgsfield-ai/higgsfield-js) only on the server. The image model is [`ideogram/v4.0`](https://open.higgsfield.ai/models/ideogram/v4.0/api-reference). The video model is [`bytedance/seedance-2.0/text-to-video`](https://open.higgsfield.ai/models/bytedance/seedance-2.0/text-to-video/api-reference), configured for a 15-second, 720p presenter recap with native audio. These are documented production endpoints; this build does not establish that the account has model access or sufficient credits. No billable generation is made by installation or build.

`POST /api/higgsfield` accepts `{ "kind": "image" | "video", "month": "YYYY-MM", "currency": "USD" | "EUR" | "JPY" | "MYR", "locale": "en" | "ms" }`. The browser supplies no totals, prompt, provider request identifier or media URL. The server verifies the Supabase bearer token, enforces AAL2 for enrolled MFA accounts, and reads transactions through the user's RLS-protected client. It computes the monthly totals and category split itself. A weekly recap covers the trailing seven days ending at the selected month's end, or now for the current month, and compares that period with its preceding seven days. Timestamps use UTC, and currency conversion uses the latest available reference rates rather than historical booking rates.

An atomic database reservation serializes quota checks per user: at most two active reports and ten reservations per rolling 24 hours. Failed reservations remain in the private quota ledger. Only the server service-role client can write provider identifiers and processing results, and each such write is constrained by both report ID and verified user ID. The browser has no report UPDATE or DELETE permission.

Generation is asynchronous. `GET /api/higgsfield` lists the caller's latest 100 reports; `GET /api/higgsfield?id=<report UUID>` checks one owned job against the documented [status endpoint](https://docs.higgsfield.ai/docs/api-reference/requests/get-request-status). Closing the browser does not cancel a provider job. Opening the report page again resumes status checks. The SDK does not retry generation POST requests: an ambiguous network failure can already have created a charged job. Check the provider request history before manually resubmitting after such an error. A reservation without a saved provider reference is marked interrupted after five minutes; the SQL reservation routine expires active records after one hour.

Generated figures and spoken audio may contain model mistakes; the ledger and deterministic dashboard remain the source of truth. The prompt asks for a fictional AI presenter. This flow produces a new presenter for each report; it does not clone an identity or guarantee a consistent face. Reports are generated on demand from the chosen weekly period. No unattended weekly schedule is installed. Reduced-motion-aware UI transitions are local Framer Motion animations; there is no documented Higgsfield API for generating application animation states.

Higgsfield documents generated output retention of at least seven days in its [platform overview](https://docs.higgsfield.ai/docs). The app persists the result URL, not a durable media copy; use the report download link to retain files. Automatic archival to private object storage is a separate operational extension.

## Exchange rates

`GET /api/rates?base=USD` returns `{ base, rates: { USD, EUR, JPY, MYR }, updatedAt, source }`; `updatedAt` is a Unix timestamp in milliseconds representing the provider's rate timestamp. The server uses the documented [ExchangeRate-API standard endpoint](https://www.exchangerate-api.com/docs/standard-requests) and falls back to [Frankfurter v2](https://frankfurter.dev/). Values are validated as finite positive numbers. Each currency is cached for one hour in-process and public responses permit CDN caching. Concurrent requests for the same base share one upstream request. A previously fetched value can be used for up to seven days if both providers fail, with its cached origin shown. There are no hardcoded currency rates.

These APIs provide reference rates at their respective update frequencies, generally daily; they are not a streaming intraday trading feed. The timestamp and source are preserved so the UI can show freshness accurately.

## Vercel and local routing

`api/higgsfield.ts` and `api/rates.ts` use Vercel's documented [Web Standard fetch handler](https://vercel.com/docs/functions/functions-api-reference). The shared `Request` to `Response` implementations live in `server/`. `npm run dev` serves the frontend only; use `vercel dev` to run the API handlers locally. Keep SPA fallback rewrites behind real files and API routes. Set the server environment values separately in each Vercel environment that needs working integrations.

After applying `supabase/migrations/001_prism_schema.sql` and configuring Supabase Auth providers and redirect URLs, run `npm run dev`. Validate with `npm run typecheck`, `npm test`, and `npm run build`. The server tests exercise authentication denial, MFA enforcement, report ownership filters, request size limits and reporting periods without sending paid generation requests.

