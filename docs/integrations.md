# Current integrations

Supabase provides Auth, PostgreSQL, RLS, and Realtime. Vercel serves the SPA and `/api/rates`. Setup is in the [README](../README.md).

`server/rates.ts` fetches validated reference rates from the optional configured provider with a public fallback. The browser uses the same-origin API. Source/time are preserved; bounded caching may reuse a verified rate for up to seven days with a cached label. Conversion is approximate presentation only.

AI Studio, Higgsfield, and report processing were removed before this upgrade. Their credentials, endpoints, and migrations are not current requirements. PostHog is optional and was not added.
