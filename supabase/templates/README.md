# Account email templates

These bilingual templates are prepared for the existing PRISM Supabase Auth project. Native-language and actual email-client acceptance remain required. A file in this directory does not deploy a hosted template.

| Dashboard template | Source | Subject |
|---|---|---|
| Confirm sign up | `confirmation.html` | `PRISM — Confirm your email / Sahkan e-mel anda` |
| Reset password | `recovery.html` | `PRISM — Reset your password / Tetapkan semula kata laluan` |

Both language sections use Supabase's `{{ .ConfirmationURL }}`. Preserve the provider's one-time link and the approved redirect allowlist. The current client uses PKCE, so completion requires the requesting browser. Do not enable email link tracking, put tokens in subjects, or include financial data, an invented support address, or a legal/privacy claim. These sender-only messages do not replace an approved public notice.

Before changing a hosted template, preserve its existing subject/body privately, compare the exact new subject/body, and verify the saved version. Then use one authorized synthetic recipient to check actual delivery, language rendering, same-browser confirmation/recovery, single use and invalid/expired-link feedback. Provider delivery status alone does not prove inbox receipt, successful link use or human comprehension.

Reference: [Supabase email templates and variables](https://supabase.com/docs/guides/auth/auth-email-templates).
