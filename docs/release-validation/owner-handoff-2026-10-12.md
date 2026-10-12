# PRISM: consolidated owner handoff

The upgraded release is not publicly launched. This packet requests external access/custody and genuine owner facts; ordinary engineering, migration, integration and deployment are already authorized. The current public site still serves the old revision and signup remains disabled. Human acceptance of the final upgraded revision must happen after the safe restricted deployment, not against this old site.

## Current technical access and custody

Updated 13 October 2026 MYT. Owner inputs are being requested one action at a time. The following is the durable resume record, not a request to perform every step together.

1. The owner created a one-day token with **Project Settings: Read, Auth Config: Read and API Keys: Read**, scoped to **PRISM only**. The signed-in Supabase permission viewer independently confirms one project and exactly those three Read capabilities, no read-write capability, and expiry on 14 October. Its permitted identity endpoint is `GET /v1/projects/{ref}`. Two owner-entered values returned HTTP 401 on that first endpoint; the dashboard still reports the token never used. This establishes an authentication-value failure, not a demonstrated need for broader permissions. The actual original secret must be used; the masked token-list value cannot authenticate. [Official scoped-token permissions](https://supabase.com/docs/guides/platform/personal-access-tokens).
2. The operator opens the following **owner-operated, masked local console**. Never paste a token or recovery phrase into chat. The tested helper permits only three exact-project GETs: project identity, Auth config and API-key metadata with `reveal=false`. It rejects masked placeholders and redirects, validates exact project/organization identity, and saves successful private captures and the temporary token under CurrentUser DPAPI outside Git. No token is printed or uploaded. These encrypted staging files are not independently recoverable backups; provider configuration must subsequently be sealed into the portable recovery package. No write capability is tested or used. Missing recovery permissions will be requested only when the real response demonstrates the specific missing capability.

```powershell
& 'C:/Users/moham/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' 'C:/Users/moham/AppData/Local/PRISM/production-recovery/20261011T1526-access/enter-prism-readonly-token.py'
```

3. Run the masked custody preparation below only when you have retained a private passphrase independently of this computer and the encrypted bundle. It creates a portable encrypted package locally and tests the actual archive using a fresh keyring without DPAPI. It neither reopens the cancelled OneDrive dialogs nor uploads anything. The encrypted database/roles/verification packet is already privately stored and independently retrieved from the connected owner's Google Drive; its bytes and every member hash match. The **portable protected key** still needs independent custody. Once prepared, the agent can upload/retrieve that encrypted package through the existing free connection and repeat verification. Actual independent passphrase retention must be supplied by the human custodian, not invented by the agent.

```powershell
& 'C:/Users/moham/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' 'C:/Users/moham/AppData/Local/PRISM/production-recovery/20261011T1526-access/prepare-private-custody-cli.py'
```

4. **No billing action is currently needed from the owner.** The supported browser now reads the authenticated [billing overview](https://github.com/settings/billing) and [budget table](https://github.com/settings/billing/budgets). GitHub Free includes 2,000 minutes; 1,123 are used, 877 remain. Actions billable spend is $0; the account-wide Actions budget is $0 with **Stop usage Yes**. Included artifact storage shows 0.5/0.5 GB rounded, with its accessible progress value at 98%. PRISM's six retained artifacts total 5,714,634 bytes; the latest full evidence archive is 1,261,228 bytes. Preserve those artifacts. The existing two possible push/PR runs are bounded to 45 minutes each and use standard Ubuntu runners; no larger runner, quota increase or paid storage is enabled. Every mandatory CI gate remains required. Check actual upload/quota results rather than claiming CI passed in advance. GitHub documents that cache storage is a separate allowance and deleting artifacts does not erase accrued usage; no unrelated project's evidence is removed.

If the private Auth export cannot recover the existing Turnstile server secret, provide the existing PRISM widget's secret through a masked local input as part of this same access session. Do not send it in chat. Server enforcement is staged only after the compatible new frontend is live, so it cannot strand existing users on the old Auth page. No CAPTCHA or email protection is disabled to pass tests.

```powershell
& 'C:/Users/moham/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' 'C:/Users/moham/AppData/Local/PRISM/production-recovery/20261011T1526-access/capture-turnstile-secret.py'
```

## Owner facts and one final human acceptance session

Return actual facts and reviewers for the existing [privacy/operations form](privacy-and-operations-draft.md): controller legal name/jurisdiction, monitored support/privacy contacts, intended users, retention/deletion/backup re-erasure policy, incident roles, recovery objectives and custodians, and an RM0 usage/registration-pause policy. These are currently unprovided facts, not ordinary implementation choices the agent can manufacture.

Reserve one acceptance session against the **restricted upgraded production revision** using the [actual acceptance matrix](production-acceptance-matrix.md): physical Android/iOS/desktop, real screen-reader listening, keyboard-only tasks, 200%/400% browser zoom/reflow and virtual keyboard, English/Malay comprehension, real signup/confirmation/recovery and critical financial tasks, privacy/legal review and operational/incident/recovery acceptance. Record tester, device/browser/AT, deployed SHA/schema, actual observation and dated approval. No approval is requested against the old site, and no signature is inferred from silence or automated tests.

After the technical access/custody inputs, the next operator action is to capture current provider state, refresh and rehearse the actual recovery point, then apply the five original forward proposals in order with bounded locks and verified postconditions. Complete final-SHA CI, deploy the matched application with signup disabled, and execute real hosted two-user/financial/Auth/CAPTCHA acceptance. After genuine final human approvals, the public cutover is already authorized and will be followed by a real new-user smoke test. No new roadmap or ordinary-operation approval is needed.

## Precise preserved evidence

- Actual database restoration, five original upgrade rehearsals, all original rows, privileges and exact native-currency reconciliation are retained. The newly repaired portable verifier authenticates actual ciphertext, rejects wrong passphrases/tampering, and includes encrypted provider attachments. It does not yet establish human key custody.
- Exact GoTrue v2.197.0 on the actual recovered clone passes password/session/refresh/MFA, restart persistence, recovery replay denial and password update. All original rows across sixty tables remain; all thirteen public-table contents/counts and eight exact aggregate sets are unchanged. No production credential or genuine user login was used. The isolated services and VM are stopped and their encrypted data is preserved.
- Actual synthetic confirmation email is in the designated Gmail Spam folder; SPF/DKIM/DMARC pass, bilingual buttons match one exact-project signup URL. Hosted confirmation/recovery and unrestricted public signup remain pending. The application now gives inbox/Spam guidance in both languages.
- Latest focused frozen-source run: `artifacts/phase7/gates-1791817676774`, typecheck/lint, 14 account-security browser cases, localization and package/build pass. Earlier unchanged unit/financial/PWA/responsive evidence remains retained; this is not claimed as new hosted or final-SHA CI evidence.
- Sanitized receipts: `artifacts/public-launch/` and `artifacts/production-release/private-recovery/`. Sensitive archives, keys, provider configuration and fixture journals remain outside Git in the private recovery directory. No real production data was mutated, no migration/main/deployment cutover occurred, and no paid resource was created.
