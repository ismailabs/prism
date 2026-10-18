# Private owner setup for staging Turnstile and Google

Prepared 14 October 2026. Neither integration is accepted yet. Work only in
staging. Keep free options, and stop at billing, paid add-ons or an ownership
requirement you cannot truthfully satisfy. Keep secrets out of chat/screenshots.

| Setting | Exact staging value |
| --- | --- |
| Protected preview | https://prism-staging-acceptance-ismailstudio.vercel.app/ |
| Supabase project | `prism-staging`, `zwqcdfzfsudqccclficx` |
| Supabase API origin | `https://zwqcdfzfsudqccclficx.supabase.co` |
| Vercel project | `prism-staging`, `prj_nrfjV3bBN8WnVcGINUUZlLL4HuYe` |
| Turnstile allowed hostname | `prism-staging-acceptance-ismailstudio.vercel.app` |
| Google JavaScript origin | `https://prism-staging-acceptance-ismailstudio.vercel.app` |
| Google redirect URI | `https://zwqcdfzfsudqccclficx.supabase.co/auth/v1/callback` |
| Supabase Site URL | `https://prism-staging-acceptance-ismailstudio.vercel.app` |
| Supabase allowed app redirect | `https://prism-staging-acceptance-ismailstudio.vercel.app/**` |

The app returns to `/login?next=%2Fdashboard` for ordinary confirmation/sign-in;
recovery uses `/?recovery=1`. This exact hostname covers supported app destinations
and grants no production origin. Preview protection was verified: anonymous 302,
authorized 200. Use your permitted Vercel account if an access screen appears.

## Cloudflare Turnstile

1. Open [your account's Turnstile dashboard](https://dash.cloudflare.com/44214a829e2337ca50cf40e4cd827cba/turnstile)
   and select **PRISM staging**. Codex created this separate free widget at
   **14 October 2026, 14:16 UTC** and independently read back its settings.
   Do not create a duplicate or edit the existing production widget.
2. Confirm its sole hostname matches the table, **Managed** mode and
   **no pre-clearance**. Enterprise features are off. Privately copy its secret
   for the next step; keep it out of chat, screenshots, source and `VITE_` values.
3. Open [staging Attack Protection](https://supabase.com/dashboard/project/zwqcdfzfsudqccclficx/auth/protection).
   Enable CAPTCHA, select **Cloudflare Turnstile**, enter its secret there, save.
4. Open [staging Vercel environment variables](https://vercel.com/ismailstudio/prism-staging/settings/environment-variables).
   Add `VITE_TURNSTILE_SITE_KEY` with the public site key. Select **Preview** and
   **Development** only; leave Production unchecked. Never use a secret as a
   `VITE_` value. No key needs to be sent to Codex.
5. Reply **“staging Turnstile configured”**. Codex will inspect non-secret
   settings, rebuild the preview and test absent/invalid/expired/used-token denial.
   You will complete a genuine challenge for the success path. Keep CAPTCHA
   enabled if a test fails; record the error and leave acceptance blocked.

These steps follow [Cloudflare setup](https://developers.cloudflare.com/turnstile/get-started/)
and [Supabase server CAPTCHA configuration](https://supabase.com/docs/guides/auth/auth-captcha).
A displayed widget does not prove server validation. Fixture keys and simulated
challenge success cannot satisfy the genuine hosted acceptance requirement.

## Google OAuth

1. In [Google Cloud](https://console.cloud.google.com/), select an existing
   test-only project or create `PRISM staging` without billing. Do not change a
   production client's consent screen or enable paid APIs.
2. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview).
   If prompted, set truthful test-app Branding and your actual private contacts.
   In [Audience](https://console.cloud.google.com/auth/audience), use **External /
   Testing** where applicable and add your intended test Google account.
   Keep testing status; do not publish or falsely attest to verification.
3. In [Data Access](https://console.cloud.google.com/auth/scopes), request only
   `openid`, `https://www.googleapis.com/auth/userinfo.email` and
   `https://www.googleapis.com/auth/userinfo.profile`.
4. Open [Clients](https://console.cloud.google.com/auth/clients), create a
   **Web application** OAuth client named `PRISM staging`, and add exactly the
   JavaScript origin and authorized redirect URI from the table. Save.
5. Open [staging Google provider](https://supabase.com/dashboard/project/zwqcdfzfsudqccclficx/auth/providers?provider=Google).
   Enable Google and privately enter that client ID/secret. Preserve nonce checks.
   Save and verify [staging URL Configuration](https://supabase.com/dashboard/project/zwqcdfzfsudqccclficx/auth/url-configuration)
   matches the table. No production URL belongs in this staging allowlist.
6. Reply **“staging Google configured”**, naming the test identity by label only.
   Codex will guide actual consent/callback/sign-in, cancellation/denial, return
   destination and isolation verification.

These fields follow [Supabase's Google instructions](https://supabase.com/docs/guides/auth/social-login/auth-google).
If Google requires domain ownership/verification or additional permission, report
the exact requirement. Do not claim ownership of `vercel.app` or `supabase.co`,
buy a custom Auth domain or add unrelated scopes. Production eligibility remains
a separate acceptance gate.

## Verification and reply

Configuration is not a PASS. Record the setup date, selected project/widget/client
names, permitted test identity label and any non-secret error. Send no credentials.
After configuration Codex must refresh the preview, inspect its binding/protection
and collect actual success/denial receipts. If one is unavailable, report why;
independent work continues.

Real inbox confirmation and recovery already worked for synthetic A/B using
staging's current transport; this does not claim production SMTP parity. The
expired confirmation test twice encountered actual `over_email_send_rate_limit`
(HTTP 429), including at 14:16 UTC. No third identity was created. The temporary
60-second link lifetime was restored and independently read back as **3600 seconds**.
Wait for the provider quota or configure an existing free, test-safe SMTP transport
before the remaining expired-link test; never disable confirmation to make it pass.
Update at 16:27 UTC: C's ordinary signup and actual Gmail INBOX receipt succeeded
after quota recovery, without changing the normal 3600-second policy. No session
was issued. The first-use expired-link check is pending until after 17:28:44 UTC.
Subsequent actual check at17:28:46 UTC: first use after3662seconds returned303 with
`otp_expired`; unconfirmed signin was still denied. All four checks passed; the
normal3600-second lifetime remains unchanged. Google/CAPTCHA and transport parity
are still outstanding, so this does not pass G06.
If later email parity needs
a staging SMTP credential, enter it privately in [staging Emails](https://supabase.com/dashboard/project/zwqcdfzfsudqccclficx/auth/templates)
with an existing free provider. No SMTP secret needs to be sent to Codex.

The Supabase MCP lacks an Auth-config writer, and the installed CLI authenticates
to another organization. Browser policy requires owner entry of new authentication
credentials and per-action confirmation for a genuine CAPTCHA completion. These
are the reasons for this specific private-account handoff.

Use the [single acceptance form](public-launch-owner-acceptance.md) for devices,
Malay, privacy/contact/operations and recovery. The owner has explicitly retained
the breached-password requirement; see [decision record](public-launch-owner-decisions.md)
and [security disposition](public-launch-password-security-disposition.md).

## Native hosted PWA dependency

See [PWA disposition](public-launch-hosted-pwa-disposition.md). Preview protection
redirects credentialless public-cache GETs, so G08 remains BLOCKED. The existing
worker/security contract and preview protection are preserved. An alternate free
protected host was investigated: Cloudflare Access is not enabled and subscription
billing is not readable through this connection. Official Free enrollment requires
private owner plan/payment steps. No new host or paid resource was provisioned.
The disposition gives the minimum optional account action and subsequent verification;
no private payment details, secrets or account codes belong in replies.
