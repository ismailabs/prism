# Isolated staging and external acceptance

Status: **BLOCKED**. This is an executable handoff; no staging or human result is
claimed. Use the candidate linked by `docs/public-launch-progress.md` and the actual
current PR head. Reverify its immutable SHA, checks, source changes and permissions.

## Environment prerequisite

Connect an already provisioned, separate, zero-cost Supabase test environment with
permission to initialize only synthetic schema/data. The connected Free organization
already has two active production projects and no PRISM branch. Branching and the
hosted leaked-password control require paid plans under current provider docs; no
upgrade, quota workaround or use of Hearthline/customer data is authorized.

Record the staging ref, organization/plan, PostgreSQL/Auth versions, Vercel project,
protected preview hostname, exact candidate SHA, redirect allowlist, test recipients,
OAuth test identity and Turnstile allowed hostname. Preview must use its own client
configuration and server credentials. Existing variables named `preview` do not
prove isolation. Never publish their values or decrypt production environment files.

Once isolated, review/apply the repository migrations there only, replay clean
synthetic schema, verify public views/functions/grants and create synthetic users A/B
through permitted Auth flows. Keep hosted traces and storage state disabled. Before
any provisioning, verify the actual cost and provider confirmation requirement; text
in this document is no permission to buy, expose or migrate production.

## Hosted checks to complete

For each item retain UTC, candidate SHA, staging ref/URL, named synthetic identity,
expected/actual outcome, safe receipt and defect/retest. Never include tokens or
email addresses in published evidence.

1. Register A through the public UI; require actual recipient confirmation and
   sign-in; deny unconfirmed sign-in, bad passwords, expired/reused links, malformed
   callbacks and unsupported redirects. Test recovery in the requesting browser,
   prior-session termination, MFA setup/challenge/un-enrollment and configured Google
   OAuth. Human credential entry and CAPTCHA follow actual tool handoff rules.
2. Confirm server-enforced challenge, email delivery/authentication and password
   protections. Provider delivery status alone is insufficient. Resolve the current
   leaked-password warning through a genuinely supported, approved control; a
   client-only check does not satisfy server protection.
3. With synthetic A/B, verify anon/cross-owner read and write denial on exposed
   tables, views and RPCs; revoked session and insufficient MFA must fail closed.
   Read only records created by these identities. No service-role shortcuts.
4. Exercise all sixteen routes, EN/MS and themes, exact MYR/USD/EUR/JPY entry and
   rejected precision, account transfers, goal earmarks, funded debt principal,
   recurrence confirmation/idempotency, CSV mitigation, notes/reminders/calendar,
   six-month reports/FX fallback, privacy/ARIA and public-only offline behavior.
   Reconcile the mission oracle: flow 2140.00, cash A 2840.00/B 2200.00, allocation
   60 percent, debt 900.00. These values are exclusively synthetic.
5. Measure large synthetic data over representative mobile network conditions,
   request counts, load/interaction times and console failures. The local 2005-row
   test proves exact three-page aggregation; it is not hosted/mobile performance.
6. Preserve all failed results; rerun affected acceptance on the current candidate.
   Keep Production stable and automatic domain assignment disabled until GO.

## Actual human record

Use the isolated staging candidate, synthetic records and no real customer account.
Generic permission to continue is already supplied and need not be requested again.
The rows below require observations by actual people.

| Required acceptance | Actual person/date and system | Observation / defects / retest | State |
| --- | --- | --- | --- |
| Windows keyboard, Narrator/NVDA, real 200/400 percent zoom | UNPROVIDED | Money errors, navigation, focus return, charts and recovery | BLOCKED |
| Physical Android Chrome, TalkBack, touch/rotation/virtual keyboard | UNPROVIDED | Entry, sign-in, PWA restart/offline/reconnect | BLOCKED |
| Physical iOS Safari, VoiceOver, touch/rotation/virtual keyboard | UNPROVIDED | Same supported critical flows; record platform limits | BLOCKED |
| Malay comprehension and spoken currency/error language | UNPROVIDED | Named reviewer and EN/MS issues/retests | BLOCKED |
| Privacy/terms and operator acceptance | UNPROVIDED | Approve actual published wording and required scope/facts | BLOCKED |
| Operations and recovery acceptance | UNPROVIDED | Named incident/contact owners, monitored schedule, RPO/RTO/custody and quota controls | BLOCKED |

The supplied Ismail/Malaysia identity and choice to omit postal address/email remain
preserved. Do not request those intentionally omitted fields again or invent them.
The existing public operator contact link is visible; actual receipt/monitoring,
retention/re-erasure process and named dated acceptance remain separate obligations.
No professional certificate is invented or demanded without a genuine requirement.

## Resume and release

After the prerequisites exist, continue M4 and complete the real receipt matrix;
update every G01-G13 gate with current environment/SHA evidence. Re-run exact-head
CI and check current branch/provider controls. Only when all mandatory gates PASS,
follow the deployment playbook and perform L01-L04. No merge, production build,
promotion or production synthetic write is permitted before GO.
