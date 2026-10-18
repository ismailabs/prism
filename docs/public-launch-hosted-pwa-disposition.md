# Native hosted PWA acceptance remains blocked

The protected staging preview serves application assets only to authorized
requests. On 14 October 2026 at20:03 UTC, a real native browser request with
`credentials: omit` returned an opaque redirect; anonymous HTTP returned302
to Vercel login. The same asset with the permitted preview cookie returned200.
An API request using its default cookie jar returned200, while an explicitly
empty Cookie header returned302. The receipt publishes no credentials:
[native transport evidence](public-launch/evidence/hosted-pwa-native-transport-blocker.json).

PRISM intentionally caches only its reviewed public asset inventory, fetched
without credentials. It rejects redirected/private/no-store responses and never
caches financial/API/Auth data. Current preview protection prevents native cache
installation. This is a staging acceptance constraint; current production PWA
behavior is not newly inspected under the owner's production-access restriction.

Earlier PWA observations used a request relay whose cookie jar could authenticate
credentialless requests. They are retained as historical observations but **do
not satisfy native hosted PWA acceptance**. The runner now explicitly preserves
an absent Cookie header. The full PWA assertion remains unchanged. A separately
declared `--without-pwa` run covers all other workflows and cannot pass G08.
Local CI PWA results remain local evidence.

[Vercel protection applies before application routing](https://vercel.com/docs/deployment-protection).
The documented Free OPTIONS allowance does not permit these GET requests;
[domain exceptions](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection)
make a preview publicly accessible and require higher-plan controls. No protection
was disabled, credential injected into worker requests, exception purchased,
secret query cached or worker security contract weakened.

## Safe alternative investigated

The connected Cloudflare account has a Workers subdomain and readable standard
Workers settings. Access configuration returned **9999, access.api.error.not_enabled**;
subscription inspection returned **10000, Authentication error**. No Worker,
subscription, Access policy or other resource was created or changed.

A supported alternative must protect application entry/private routes while
serving only the reviewed public manifest without credentials, bind the same
isolated Supabase project, prove its actual zero additional cost and provider
permissions, and pass native installation/offline/restart/cache/privacy tests.
It is not yet provisioned or certified equivalent to the production deployment.

The owner may open the [existing Cloudflare account](https://dash.cloudflare.com/44214a829e2337ca50cf40e4cd827cba)
and select **Zero Trust**. [Official onboarding](https://developers.cloudflare.com/cloudflare-one/setup/)
requires plan selection and private payment details even for Free. Only choose
**Zero Trust Free** if the actual checkout confirms zero cost; stop at a paid
plan, trial, upgrade or unexpected charge. This private account step requires
the owner. Do not select account-wide protection or alter existing applications.
Confirm the actual Workers plan and zero-cost eligibility through account Billing;
the connector cannot establish it. Return only non-secret plan/activation status.

After such evidence, the agent can review and provision a narrowly scoped
staging-only alternative using [supported Access controls](https://developers.cloudflare.com/workers/configuration/cloudflare-access/).
No alternative URL or Auth redirect exists yet; do not invent one or change
staging redirects prematurely. Owner activation alone does not pass G08 or any
other mandatory gate. Required breach protection, Google/CAPTCHA, human/operator
and current recovery acceptance remain separate blockers.
