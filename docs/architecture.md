# Architecture

The desktop application wraps the existing Next.js/React interface in Electron. A bundled standalone Node server binds to a random loopback port. The sandboxed renderer has a narrow preload bridge for external links, native settings, connector installation and notifications. Electron's utility process runs the server; a separately authenticated loopback bridge provides operating-system credential encryption and native notifications.

Personal data lives outside the installation. Initialisation copies only missing empty starter files and preserves existing records. The application supports schema-checked local records, atomic file writes and revision-aware field patches. The browser and MCP share these validation and saving paths. No database service or application hosting subscription is required.

The MCP endpoint is a stateless authenticated Streamable HTTP JSON-RPC service. A small standard-I/O bridge reads its per-user local connection file and forwards requests. Provider desktop configuration references the installed app's --mcp entry point. Tools expose career records, contracts and confirmed field edits, never arbitrary filesystem access or credentials.

Provider execution is separate from MCP. The ChatGPT adapter implements the documented open-source sign-in flow with PKCE, state, nonce, signed identity validation, token refresh and streamed Responses completion. The Claude adapter uses the unmodified official native helper with subscription authentication and a restricted tool list. Provider output is untrusted until parsed and validated. Interrupted or failed streams never become completed results.

Discovery snapshots the current approved direction, constraints, evidence and calibration. It uses provider-supported web research, then independently checks employer pages, deduplicates and appends new inbox items. A per-workspace process lock prevents overlapping searches. The background timer checks due work, daily backups, cloud delivery and reminders. Computer resume performs a due check rather than replaying every missed interval.

Optional cloud delivery stores an approved minimal search brief and append-only result files in a private repository. It is not a second master for the application pipeline. Native provider schedules supply the cloud execution. The desktop importer independently checks incoming job pages and preserves local decisions.

Complete backups contain canonical records, source evidence and generated documents. Credentials, runtime state, helper binaries and installed code are excluded. Restore validates the complete archive before replacing the local data tree and creates a recovery backup first.

The optional Worker build retains browser record/CV compatibility. Native helpers, local files, background services, local MCP and the credential bridge require the local application.
