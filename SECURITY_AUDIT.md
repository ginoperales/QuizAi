# Security and logic audit

Audit date: 2026-09-03

## Remediated findings

- **Critical — privilege escalation:** users could create/update profiles with an arbitrary `role`, including `admin`. New accounts are now forced to `student`, protected profile fields are immutable to their owner, and only an existing administrator may change roles.
- **Critical — cross-user writes:** every authenticated user could overwrite any quiz. Writes are now limited to the creator/admin, with a narrowly scoped atomic completer update.
- **Critical — exposed DeepSeek secret:** a live-looking provider key was embedded in `geminiService.ts`. It was removed and direct browser calls were disabled. The key must still be revoked because it remains in Git history and may exist in deployed bundles.
- **High — stored XSS:** AI explanations were rendered through `dangerouslySetInnerHTML`. They are now rendered as escaped React text while preserving line breaks.
- **High — private profile enumeration:** all authenticated users could list complete user records, including emails and progress. Invitations now use a separate minimal `user_directory` collection containing only UID, alias and readable ID.
- **High — falsified records:** attempts, reports, feedback, logs and notifications trusted caller-supplied identities. Firestore rules and client guards now bind those identities to `request.auth.uid` and restrict mutable fields.
- **High — spreadsheet formula injection:** exported AI/user strings could be interpreted as formulas. Dangerous leading characters are now escaped before spreadsheet export.
- **High — dependency vulnerabilities:** npm reported vulnerable transitive packages, including a critical WebSocket issue. The lockfile was updated and `npm audit` reports zero known vulnerabilities.
- **Medium — untrusted runtime dependencies:** Tailwind and jsPDF were loaded as executable CDN scripts. They are now built from npm dependencies. The remaining pinned SheetJS script has Subresource Integrity.
- **Medium — invalid model output:** answer indices and grades were insufficiently validated. Questions now have strict shape/range/length checks; scores/confidence are clamped; invalid option indices become `null`.
- **Medium — predictable correct option:** generated questions always placed the answer first. Options are now independently shuffled while preserving the correct index.
- **Medium — data loss on save:** quiz state was cleared before Firestore persistence completed. Save is now awaited, protected from double submission, and progress remains if persistence fails.
- **Medium — history changes did not persist:** deleting or renaming a completed attempt only changed local state and reappeared after login. Both actions now update Firestore.
- **Medium — corrupt local storage crash/cross-account leakage:** JSON parsing could crash startup, and local favorites survived logout. Reads now recover safely and user data is cleared on logout.
- **Medium — abusive file input:** uploads had no size enforcement and spreadsheet answer indices accepted invalid values. File size/type/row count and cell data are now bounded and validated.
- **Low — event leak:** the PWA `appinstalled` listener could not be removed. It now uses a stable callback and proper cleanup.
- **Low — fabricated image fallback:** failed image OCR generated unrelated canned questions. The flow now reports failure instead of presenting invented content.

## Remaining production risks

- **High — Gemini key in the browser:** Vite still embeds `GEMINI_API_KEY` for the client SDK. A static frontend cannot keep it secret. Move AI calls to a server/Cloud Function, store the key in a secret manager, authenticate callers, add quotas and rate limits, and rotate the current key afterward.
- **Medium — client-writable audit trail and abuse controls:** Firestore rules validate identity and shape but cannot provide strong rate limiting or tamper-proof server timestamps. Move logs, invitations, reports and feedback creation to trusted functions; enable Firebase App Check and provider quotas.
- **Medium — SheetJS 0.18.5:** spreadsheet parsing still relies on the pinned browser build because the original app has no maintained server import pipeline. Treat spreadsheets as untrusted, keep the new size/row bounds, and plan migration to a maintained parser or server-side conversion.
- **Medium — bundle size:** the main bundle remains large. Route/component code splitting would improve startup performance but requires a broader UI refactor.
- **Operational:** the hardened Firestore rules have not been deployed by this audit. Deploy them with the matching frontend, migrate/sync `user_directory`, then run authenticated smoke tests for registration, invitations, public quizzes, history and the admin dashboard.

## Verification

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm audit`

The Firebase CLI dry run compiled `firestore.rules` successfully against the configured project without deploying changes. Behavioral allow/deny tests should additionally run with the Firebase Emulator Suite in CI; Java was not available in the audit environment, so those emulator scenarios could not be executed locally.
