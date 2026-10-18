# Mandatory MFA recovery and containment — staging proposal

This is the runbook for the proposed staging security policy. It does not approve public release, accept permanent lockout or implement breached-password rejection. Keep passwords, email links, QR codes, setup keys and current codes out of evidence files and chat.

## Existing users

Keep the original Supabase account and financial owner ID. Sign in through the existing password or linked Google identity. Financial access stays locked until two existing or newly enrolled native authenticator factors are independently approved. Existing verified factors must retain their IDs; they are not deleted or silently replaced. Approval requires fresh proof from the account's existing confirmed mailbox and a current authenticator code.

For first enrollment, verify the mailbox link in the browser that requested it, then enroll and approve one authenticator. At one approval, financial access must remain closed. Approve a second distinct factor and retain a private backup independently of the primary device. Verify normal sign-in with that backup before relying on it. Two factors on one phone without another accessible copy do not establish recovery independence.

## Lost primary device, factor still enrolled

Sign in to the original account and verify the surviving approved backup. Obtain fresh mailbox proof in the same browser. Return to authenticator management, enroll and approve a replacement, and test it. Remove the lost factor only after two independently accessible factors are approved. This process does not change financial ownership.

A retained setup key can recreate its existing enrolled factor in a compatible authenticator. PRISM cannot redisplay a key after setup. Deleting the native factor invalidates that recovery path even if a copy of its old key remains.

## One approved factor already removed

Financial access remains closed with one approval. Verify the surviving approved factor and the existing mailbox, then add and test a replacement through the management flow. Restore two approvals before financial access resumes. A valid password or mailbox alone cannot replace a lost approved factor after activation.

## Every approved factor and every key copy lost

Financial access, in-app export and in-app deletion remain locked. There is no password-only, email-only or administrative financial recovery override. Do not create a new identity linked to the old records, remove sticky activation or promise a recovery method that has not been established.

Before public launch, the owner must decide whether this total-loss consequence is acceptable and define an identity-safe support/privacy process. A support request is not permission to disclose financial records or weaken MFA. Operational handling of a legitimate erasure request remains unresolved and requires a separately reviewed process.

## Containment and rollback

The safe emergency posture is unavailable financial access with identities, financial records, approvals, activation history and audit events preserved. A rollback of the frontend alone does not restore the database security policy. The pre-MFA frontend may lack required enrollment screens and must not be described as a working recovery release.

The disposable local restore test rehearses a transaction that replaces only `prism_private.session_allowed()` with false. It verifies all 44 financial table/view surfaces, representative writes and sensitive operations remain denied, preserves exact rows/history, then rolls back the transaction and checks the original guard, hook, ownership, ACLs and approved access. This drill is test code, not an authorized production recovery command.

Never restore optional-MFA financial access, drop approval/history tables, enable financial Realtime or disable the token hook to make a rollback appear healthy. Retain immutable deployment identifiers, the reviewed migration, effective non-secret Auth settings, guard definitions and exact receipts. Hosted backup/restore and actual operator objectives remain separate release requirements; local snapshot timing is not a promised recovery time.

## Required attended evidence

Record normal hosted sign-in to the original synthetic account, first-factor financial denial, second-factor activation, private backup retrieval without the primary device, backup code use and unchanged identity. Also retain the separate hosted password-only enrollment-attack/transaction-rollback receipt. Record human observation separately from native API and SQL fixtures. Software, a checkbox or two generated secrets cannot prove physical custody.

The existing successful owner Google sign-in is preserved. Do not repeat it merely to fill an evidence checklist. Production remains unchanged until all applicable gates and the owner's explicit policy/release permissions are satisfied.
