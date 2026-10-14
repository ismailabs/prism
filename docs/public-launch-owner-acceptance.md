# PRISM — one owner acceptance form

Prepared **14 October 2026, 13:32 UTC**. No human checks or operator acceptance
have been performed or signed off. G09–G11 remain **BLOCKED** where evidence is
missing. The owner has retained the breach-password protection requirement;
G04/G12 remain **BLOCKED**. This form cannot waive that requirement or authorize release.

**Protected staging:** [Open PRISM staging](https://prism-staging-acceptance-ismailstudio.vercel.app/).
Its database must be **zwqcdfzfsudqccclficx**. The preview includes the repaired
mobile sign-out, accurate deletion wording and readable entrance motion.
The current exact candidate/preview SHA and final CI receipt are supplied in
[PR #6](https://github.com/ismailabs/prism/pull/6) and the mission's final gate ledger.
Record that refreshed full SHA before testing; old baseline receipts are historical.
Production stays unchanged; this form authorizes no production access, data export or restore.

**Known staging PWA limit:** native credentialless asset requests are redirected
by preview protection. Earlier relayed PWA observations are superseded; G08 stays
BLOCKED until a supported protected staging setup serves the reviewed public asset
manifest without credentials. Do not disable protection or alter the worker's
private-cache contract. Record affected installation/offline checks as BLOCKED,
with the actual observation; continue the other checks.

Create your **own separate synthetic test identity**, using a mailbox you control
and a password entered privately. Do not use the automated A/B accounts or
passwords. Use invented data only. Never send credentials, MFA QR codes/secrets,
session state, email links, financial exports or full financial screenshots.

## Complete these 14 checks once

Do Windows first, then reuse its synthetic records on the phones. Rough planning
allowance: 20 minutes for Windows and 10 minutes per phone. Mark each result
PASS, FAIL or BLOCKED and describe what actually happened. A missing device,
mail quota, reviewer or voice is BLOCKED; an unperformed test cannot be PASS.

| ID | Check | What to do and report |
| --- | --- | --- |
| W1 | Windows: registration and keyboard | In staging, register/confirm through your actual inbox and sign in when mail quota allows. Complete actual CAPTCHA personally when shown. Tab/Shift+Tab through public pages, navigation and a private link. Use Enter/Space/Escape; open/close Add and verify focus returns. Report actual inbox/redirect results and keyboard problems. |
| W2 | Windows: exact money | Create MYR Device QA with opening 10.00; add one account-linked income 0.01. Expect balance 10.01, income 0.01. Try 0.001: saving must be denied clearly. Cancel it. Do not create the valid transaction again on each phone. |
| W3 | Windows: Narrator or NVDA | Listen to labels/currency, precision error, dialog title, save result and analytics table. Enable Privacy Mode; displayed and spoken amounts/percentages must be masked. Record actual screen reader/version and unclear speech. |
| W4 | Windows: readability | Check English/light and Malay/dark at actual 200% and 400% browser zoom, enlarged Windows text and a contrast theme. Forms, errors and buttons must stay reachable. Record settings, clipping and focus visibility; restore preferred settings afterwards. |
| A1 | Physical Android: Chrome/TalkBack | Sign in, reach Transactions/Plans/Settings using phone navigation, inspect the same record, try invalid precision and cancel. Check spoken labels, virtual keyboard, drawer focus, rotation and bottom safe area. Record device/Android/Chrome/TalkBack versions. |
| I1 | Physical iPhone: Safari/VoiceOver | Repeat A1 on the actual iPhone; record model/iOS/Safari/VoiceOver setup. Reopen the browser; if PWA installation is offered, record install/relaunch and any limitation separately. |
| M1 | Malay comprehension/speech | A Malay-speaking reviewer checks sign-in/recovery, money errors, cash balance versus income, estimates, privacy and deletion wording. Record reviewer, confusing phrases and actual MYR/decimal speech. An unavailable Malay voice is not a speech PASS. |
| P1 | Offline and sign-out | On each platform, finish/cancel the form before disconnecting. Offline saves must not claim success or appear automatically after reconnecting. Sign out, refresh a private link and use Back: private values must not remain visible. Report actual outcomes. |
| O1 | Privacy/terms and contact | Read staging EN/MS privacy/terms and deletion warning. Confirm Ismail/Malaysia and the existing contact route are accurate. Confirm you own/monitor that destination and receive a harmless test request. Postal address/email remain intentionally omitted. |
| O2 | Support, incidents and provider use | Name who monitors/supports PRISM, staffed schedule, response goal, incident escalation/fallback and who approves user messages. State actual intended users/markets and any commercial purpose; verify [Hobby eligibility](https://vercel.com/docs/plans/hobby). Record quota response; no paid upgrade or continuous-availability promise. |
| O3 | Retention and requests | Decide who handles identity-safe access/correction/deletion, backup/provider/support-record retention and re-erasure after recovery. Record actual rules and unresolved provider limits; active deletion does not erase every backup/log immediately. |
| R1 | Backup frequency/current point | Provide a non-secret receipt for the actual backup schedule, latest encrypted recovery point and integrity verification. The October 13 bundle is historical evidence, not proof of a current recovery point or daily frequency. |
| R2 | Independent custody/access | Confirm independent encrypted-archive retrieval, separate key custody, availability after losing this Windows device/profile, and provider-account recovery. Report only who is responsible and dated evidence; never reveal keys/passphrases/codes/private storage links. |
| R3 | Recovery permissions/compatibility | Identify actual permission and a safe mechanism for an isolated rehearsal, plus application/database/Auth/configuration coverage and exclusions. Production restore, customer-data export/decryption and production financial access remain unauthorized. Record gaps before accepting targets. |

Narrator: [Microsoft documents Ctrl+Windows+Enter to start/stop it](https://support.microsoft.com/en-us/accessibility/windows/narrator/chapter-1-introducing-narrator).
TalkBack: enable it in Android accessibility settings and use
[Google's navigation guide](https://support.google.com/accessibility/android/answer/6006598?hl=en).
VoiceOver: Settings → Accessibility → VoiceOver; try
[Apple's practice area](https://support.apple.com/guide/iphone/turn-on-and-practice-voiceover-iph3e2e415f/ios)
first. Actual assistive-technology use is required; viewport emulation and axe
scans are separate engineering evidence.

## Recovery facts and unapproved targets

Local metadata receipt reviewed **14 October, 06:49 UTC**: **40 manifest hashes
match**, and the detached signature verifies with the declared bundled public key
**5A7EEBBABE21D136F99F852B4FDA63B1033E8DCC**. No customer payload was decrypted and
no restore occurred in this mission. Database point: **13 October, 02:11:48 UTC**;
Auth delta: **13 October, 06:41:50 UTC**. The database point is over 24 hours old.
The delta describes signup disabled; an existing October 14 metadata receipt
describes signup enabled. These receipts do not establish today's config correspondence.

Current backup **frequency, independent custody and recovery permission remain UNKNOWN**.
Historical custody/rehearsal statements do not close those current questions.
[Supabase documents paid-plan daily backups and recommends off-site copies for Free](https://supabase.com/docs/guides/platform/backups).
No new customer-data backup/export, decryption or production restore is performed or authorized here.

**Provisional only — NOT APPROVED:** application rollback **30 minutes**;
database RPO **24 hours** (at most one day's recent records lost);
full-recovery RTO **24 hours** (time to restore usable service).
Verify frequency, integrity, permissions, custody and feasible recovery coverage
first. An old signed bundle does not prove these targets are supported.
Deployment rollback does not restore database/Auth state or reverse accepted writes.
Preserved application rollback candidate: **dpl_7ybY6ao53z2BG6yhhyrDpKX7CGNk**,
SHA **d1438197a33d179cedd6c54bad3bfcf9a06db31f**; see the
[conditional playbook](public-launch-deployment-playbook.md). Its present live
availability/permission is not rechecked through production access under this form.

## One response template

```text
Date/time + timezone; actual tester/reviewer:
Protected staging URL + refreshed full SHA:
Windows / Android / iPhone: actual device, OS, browser, screen reader + versions:
Language/theme; zoom/text/contrast settings:
W1–W4, A1, I1, M1, P1: each PASS/FAIL/BLOCKED + actual observation/defect/retest:
O1–O3: actual decisions, contact receipt, responsibilities, schedules, retention and gaps:
R1–R3: dated non-secret evidence and unknowns; no keys, customer rows or private links:
Targets: NOT APPROVED until supporting recovery evidence has been reviewed.
Unavailable equipment/reviewer/provider action:
```

The mission records actual observations and repairs/retests failures. All mandatory
G01–G13 must genuinely PASS before production operations; security remains blocked
while required breach-password protection is absent. General permission to continue
and completion of this form alone do not constitute GO.
