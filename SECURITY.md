# Security and privacy

Career Workshop is a single-user local application. The public starter must remain empty. Personal records belong in the separate per-user workspace, never in this public repository or release assets.

The server binds to loopback. Browser mutations require same-origin JSON requests; the MCP endpoint requires a separate local bearer credential. The installed renderer is sandboxed, has no Node integration and uses a narrow preload interface. External websites open in the system browser.

Only named career records are available to MCP. Revisions and field-level patches prevent silent replacement of unrelated changes. Record schemas reject unsupported shapes. Confirmed application submission is separate from drafting, exporting or discovering a role. AI content, imported documents and employer pages are untrusted data.

Provider credentials are stored through operating-system encryption in the installed application. They do not enter browser storage, records, prompts, diagnostics, backups or public reports. Source/browser development keeps credentials in process memory. The official Claude helper owns its own authentication and is run unmodified with a restricted tool set; this app does not collect Claude website session tokens. It removes API-key configuration from the helper's inherited environment and requires subscription authentication.

The application does not enable paid inference fallback. A provider account can independently have paid extra usage enabled; disable it in that account when a fixed subscription budget is required. Usage limits stop or reject work rather than causing the application to purchase credits.

URL import requires public HTTPS destinations and refuses private/local network addresses. Redirects are checked. Documents and responses have size limits. Avoid enabling provider tools or remote connectors broader than the career task needs.

Cloud discovery is optional. Its repository must be private and pass a real write/read check. Use a fine-grained credential restricted to Contents read/write on that repository. Application storage credentials and provider repository permissions are separate. Disconnecting the desktop inbox does not delete a provider's native schedule; pause or delete that schedule in the provider as well.

Complete backups contain private records and documents. Store them carefully. Restore validates checksums, record contracts and paths, and creates a recovery backup before replacing data. Credentials and runtime files are excluded. Public feedback requires review; never include private career content or secrets in a public issue.

For optional remote Node hosting configure APP_RUNTIME=server, APP_PASSWORD and HTTPS. Loopback checks are not internet authentication. Optional Worker hosting requires its own private access boundary and a remote record backend; desktop-only functions are unavailable there.

Report security vulnerabilities through a private repository security advisory where available. Do not include real credentials or private records in a public report.
