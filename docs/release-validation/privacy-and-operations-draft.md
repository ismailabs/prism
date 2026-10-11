# PRISM privacy and operations acceptance packet

11 October 2026, Asia/Kuala_Lumpur. Internal draft only; **not approved for publication**. This packet supplies executable acceptance work without inventing owner facts or legal approval. The [manual device procedure](acceptance-and-blockers.md#manual-acceptance-procedure--every-result-unverified) remains applicable.

## Owner facts required before publishing a notice

| Item | Required evidence | Status |
|---|---|---|
| Controller and jurisdiction | Legal entity/name, postal address, authority and applicable service markets | UNVERIFIED |
| Privacy/support/security contacts | Owned, monitored channels; test delivery and escalation; approved response expectations | UNVERIFIED |
| Data purposes and choices | Actual collected fields, mandatory/optional fields, purpose/legal-basis review and consequences of refusal | UNVERIFIED |
| Processors and destinations | Current provider contracts, storage/processing/backup locations, subprocessors and cross-border safeguards | UNVERIFIED |
| Retention and deletion | Approved retention by category, backup expiry, provider-log limits, legal holds and deletion verification | UNVERIFIED |
| Rights and complaints | Identity-safe request procedure, access/correction/export/deletion and applicable regulator route | UNVERIFIED |
| Children, profiling and incidents | Actual intended age group; DPIA/profiling/DPO/DBN applicability and reviewed notification procedures | UNVERIFIED |

Current provider identity metadata reports the production database in `ap-northeast-1`; this alone does not establish all processor or backup locations. Review Malaysia's [official notice guidance](https://www.pdp.gov.my/ppdpv1/en/akta/guidance-on-the-preparation-of-personal-data-protection-notices/) and [current regulatory material](https://www.pdp.gov.my/ppdpv1/en/akta/personal-data-protection-general-practice/). No applicability exemption, reporting deadline or approved compliance claim is inferred.

## Bilingual notice text for owner/legal completion

Replace every bracketed field with verified facts; native-language and legal reviewers must approve both versions together. Add any mandatory disclosures their applicability review requires. Do not publish unresolved placeholders.

**English draft:** P.R.I.S.M. is operated by [verified controller name and address]. We process the account information and financial records you choose to enter, including [approved complete data categories], to [approved purposes]. [Mandatory/optional fields, legal basis and choices, including consequences of not supplying information]. Access to your records is restricted by account ownership, current-session checks and enrolled MFA. Our current implementation uses online access for financial data; offline mode stores public application assets. Browser storage also contains authentication-session information and preferences. [Verified processors, destinations, international-transfer safeguards and disclosures]. We retain information for [approved periods/criteria by category]. Confirmed account deletion removes the account and its owned application records from the active database. Copies may remain in backups and provider records according to [verified retention/erasure limits and legal-hold policy]; deletion does not promise immediate backup erasure. Contact [verified monitored privacy channel] to request [applicable rights and approved procedure], or use [approved complaint route]. [Approved incident notice and changes/effective-date wording].

**Draf Bahasa Melayu:** P.R.I.S.M. dikendalikan oleh [nama dan alamat pengawal data yang disahkan]. Kami memproses maklumat akaun dan rekod kewangan yang anda pilih untuk masukkan, termasuk [kategori data lengkap yang diluluskan], bagi [tujuan yang diluluskan]. [Medan wajib/pilihan, asas pemprosesan dan pilihan anda, termasuk kesan jika maklumat tidak diberikan]. Akses kepada rekod anda dihadkan melalui pemilikan akaun, semakan sesi semasa dan MFA yang didaftarkan. Pelaksanaan semasa memerlukan akses dalam talian untuk data kewangan; mod luar talian menyimpan aset aplikasi awam. Storan pelayar juga mengandungi maklumat sesi pengesahan dan pilihan. [Pemproses, destinasi, perlindungan pemindahan antarabangsa dan pendedahan yang disahkan]. Maklumat disimpan selama [tempoh/kriteria yang diluluskan mengikut kategori]. Pemadaman akaun yang disahkan menghapuskan akaun dan rekod aplikasi miliknya daripada pangkalan data aktif. Salinan mungkin kekal dalam sandaran dan rekod penyedia mengikut [had penyimpanan/pemadaman dan dasar penahanan undang-undang yang disahkan]; pemadaman tidak menjanjikan penghapusan sandaran serta-merta. Hubungi [saluran privasi yang disahkan dan dipantau] untuk memohon [hak yang terpakai dan prosedur yang diluluskan], atau gunakan [saluran aduan yang diluluskan]. [Teks notis insiden, perubahan dan tarikh kuat kuasa yang diluluskan].

**Financial disclaimer draft:** PRISM records user-entered financial information and shows estimates and planning scenarios. Forecasts, FX conversions and debt assumptions may differ from actual results; they do not create recorded transactions or establish a complete valuation or net worth. The new double-entry ledger remains a shadow implementation. [Owner/legal-approved financial-advice, liability and intended-use wording].

**Draf penafian kewangan:** PRISM merekodkan maklumat kewangan yang dimasukkan pengguna serta memaparkan anggaran dan senario perancangan. Ramalan, penukaran mata wang dan andaian hutang mungkin berbeza daripada hasil sebenar; semuanya tidak mewujudkan transaksi yang direkodkan atau menentukan penilaian atau nilai bersih yang lengkap. Lejar catatan bergu baharu kekal sebagai pelaksanaan bayangan. [Teks nasihat kewangan, liabiliti dan tujuan penggunaan yang diluluskan oleh pemilik/penasihat undang-undang].

## Deletion, support and security incident procedures

1. Before opening customer access, resolve current hosted helper permissions using an established read-only transport and the revised catalog inspection. Any repair requires separate hosted authorization. Capture ACL/schema/role/default/API-exposure evidence, rehearse the exact forward repair, and verify confirmed-text behavior on a separately approved disposable target. Do not test deletion against customer records.
2. A support request collects only an opaque incident reference, app version, language, device/browser, coarse time and safe error category. Ask the customer to remove names, amounts, notes, exports, tokens, QR seeds and factors. Never ask for passwords or complete financial screenshots. Validate identity through an approved procedure before disclosing or deleting anything.
3. Assign an incident lead, security lead, finance/reconciliation operator, privacy/legal decision-maker and backup contact. Record the staffed schedule, monitored channels and response targets before launch; all are presently UNVERIFIED.
4. Triage suspected unauthorized access/deletion, financial inconsistency, unavailable saves and failed recovery as release stops. Contain affected access/writes through separately authorized controls. Preserve restricted, redacted evidence and its chain of custody. Reconcile accepted requests and exact native-currency amounts; never guess postings.
5. Have the designated legal/privacy owner determine any customer/regulator communications and timing using current rules and actual impact. Draft messages for approval; this mission sends none. Restore only to an approved target, verify Auth/MFA/ownership and exact reconciliation, and obtain an explicit return-to-service decision.
6. After restoration, prevent restored backups from reviving accounts already deleted after the recovery point. The owner must approve a minimized, secured deletion-request record and retention policy sufficient for re-erasure, reconcile it before enabling access, and verify any provider/backups limitations. No such record or retention period is invented here.

## Monitoring, recovery and rollback acceptance

Approve privacy-safe events before introducing hosted instrumentation: build/worker version, safe request outcome class, synthetic health, coarse duration, duplicate-request outcome and reconciliation exception count. Exclude financial payloads, customer identities/notes, exports, bearer tokens and factors. Verify that even nested exceptions are sanitized. Owner-selected thresholds, alert recipients, delivery confirmation and escalation are required; none is currently operationally accepted.

Specify RPO (maximum accepted data loss), RTO (maximum accepted recovery time), permitted downtime, backup/key custodians, Storage/Auth/provider coverage and a free supported recovery mechanism. Measure a separately approved recovery drill against those objectives. Local cold-copy parity does not establish managed backups or recovery guarantees. PostgreSQL version differences require compatibility review; no physical cross-version copy is authorized.

For a release, reconcile existing hosted migration receipts and aliases before applying only separately approved missing forward migrations. Preserve all 17 local migration files. Capture before/after catalog fingerprints, exact reconciliation and authorization evidence. Transaction failure before commit rolls back; after commit, prefer a reviewed forward fix. Removing debt protection or dropping new tables loses safeguards/data and is not a recovery plan. Schema must support the matched frontend before publication.

Frontend/worker rollback must use an approved compatible artifact, verify headers and alias identity, and handle installed clients retaining a newer worker. Check old/new asset availability and controlled update acceptance without interrupting saves. A frontend rollback cannot undo accepted financial writes. Production deployment remains prohibited in this mission.

## Human acceptance form

One form per candidate and supported combination; all rows start UNVERIFIED. Record actual observations instead of copying automated results.

| Field | Required entry |
|---|---|
| Candidate | Full Git SHA, schema/migration receipt, worker/build version and exact environment |
| Participant | Actual tester/reviewer and approved role; do not invent sign-off |
| Setup | Date/timezone, physical device/OS/browser/AT and language/theme/text-scaling versions |
| Procedure | Linked step, literal expected outcome, synthetic fixture and authorized scope |
| Observation | Actual outcome, PASS/FAIL/BLOCKED, sanitized screenshot/audio notes and defect reference |
| Resolution | Owner, remediation, retest evidence and outstanding restrictions |
| Acceptance | Actual device/AT/native-speaker, security, legal/privacy and operations signatures/dates |

Required human sessions: Windows PWA/Narrator or NVDA, Android Chrome/TalkBack, iOS Safari/VoiceOver, Malay speech/comprehension, actual 200%/400% browser zoom, OS text scaling/forced colors and virtual-keyboard/safe-area behavior. Follow the existing eight-step manual procedure. Owned equipment and qualified participants may allow RM0; availability and any service cost must be established before proceeding.
