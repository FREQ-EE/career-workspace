# Architecture

The application has two interchangeable data backends: local JSON files, or GitHub contents in a configured repository and branch. Canonical records remain human-readable. The browser calls same-origin server APIs; only the server reads credentials.

Local writes use SHA-1 revision tokens, an exclusive data-directory lock and atomic file renames. GitHub writes submit the current blob SHA. The server serialises field changes, compares prior values, recognises idempotent redelivery and refuses conflicting edits. A network failure is not proof that a commit failed; retry logic checks current records before overwriting anything.

Career autosave submits field patches. Unrelated external updates merge; a same-field conflict requires review. CV generation waits for pending edits, records a snapshot and stores the PDF. Recipe/pantry updates use individually allowlisted fields and read current canonical documents. Kitchen GitHub corpus reads pin one commit so the displayed files agree.

The UI does not create ChatGPT schedules, send applications, contact employers, purchase ingredients or write to calendars. Those are separate, explicitly authorised ChatGPT actions. Empty preferences remain empty until the user supplies them.

Node access uses proxy.ts and loopback binding or a configured remote password. Sites publication uses the platform's owner-private access boundary. No personal account identity is present in the hosting manifest.
