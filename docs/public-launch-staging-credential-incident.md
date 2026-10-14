# Staging preview credential incident

14 October 2026. A browser-test teardown closed its context while a live
`route.fetch` was pending. Node printed an unhandled transport error containing
the temporary staging development OIDC access header. The token value is excluded
from this record and all repository files. This was an actual logging failure;
the interrupted workspace run cannot be counted as a complete PASS.

The token identifies the newly isolated Vercel project
`prj_nrfjV3bBN8WnVcGINUUZlLL4HuYe`, development environment. Its privately decoded
expiry is **15 October 2026, 01:04:12 UTC**. No Supabase user session, password,
service-role key or production key was printed by that failure. Production was
not accessed or changed during containment. No third-party OIDC relying party
was configured for this new staging project by the mission.

## Containment actually verified

The supported project API update returned **404, Deployment Protection Trusted
Sources not found**. Firewall inspection/creation also returned **404, Seawall
Config not found**. Neither unsuccessful request is described as an applied
control. The authenticated staging dashboard was available; its self-access
editor saved only production→production and preview→preview. Both development
rules were removed. Vercel Authentication and the release freeze remain enabled.

At **15:03:35 UTC**, the actual exposed token was sent privately to the stable
staging alias and the immutable tested preview. Both returned **403** with
`TRUSTED_SOURCES_ENVIRONMENT_MISMATCH`. Independent CLI metadata confirmed the
saved pairs and unchanged authentication/automatic-domain settings. Receipt:
`artifacts/public-launch/staging-preview-credential-containment.json`.

This withdraws protected-preview admission; it does **not** revoke the signed
JWT globally. Keep development trust withdrawn, including until its expiry.
Do not reset Trusted Sources to defaults, re-add development admission, or
claim that pulling a fresh token invalidates this token. Other relying parties
were not contacted; no global revocation claim is made. See
[Vercel's documented self-access control](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/trusted-sources#customize-this-projects-self-access)
and [OIDC lifetime](https://vercel.com/docs/oidc/reference).

The interrupted run's disposable B fixtures were cleaned through ordinary B
authorization at **14:58:15 UTC**: five transactions, one transfer and four
accounts. Exact namespace/owner checks and zero remaining-row rechecks passed;
the retained A financial oracle was preserved. No privileged key or customer
data was used. Receipt: `artifacts/public-launch/staging-ui-interrupted-cleanup.json`.

## Engineering repair and remaining acceptance

The browser harness now catches transport/teardown errors without printing
header-bearing diagnostics, drains route handlers before closing contexts,
permits exact origins only, refuses unapproved redirects, and redacts every
known private input before writing failures. A separate local output containment
wrapper also redacts unexpected native errors. Tests use a permitted temporary
Vercel share-link session; development trust stays withdrawn and protected
previews remain protected. No protection exception or public preview was added.

Syntax and explicit JavaScript lint passed. A fresh complete hosted run and final
candidate CI/artifact verification are still required; repairs alone cannot
claim a PASS. The mandatory leaked-password protection requirement and missing
provider/human/operator/recovery evidence continue to block public release.
