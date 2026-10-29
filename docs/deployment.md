# Distribution and optional hosting

The primary distribution is the installed local application. Native packaging wraps the standalone Node server, static assets and empty starter records in an Electron application. It includes the unmodified official Claude helper and its licence. Personal data is initialised in a separate per-user directory.

Run the required release checks before packaging. Windows and macOS installers are built on their respective CI runners. Source, local server and optional Worker archives contain no Git history, credentials, runtime caches or personal records. Published installer checksums accompany the release.

The optional Worker build is for contributors maintaining browser record/CV compatibility. It requires a separately provisioned private hosting identity and remote record backend. Do not reuse another person's project ID. Configure runtime credentials server-side. The generic .openai/hosting.json contains no project ID.

Hosted content edits and application-code publication are different operations. Desktop helpers, tray operation, local scheduling, operating-system credentials and local MCP are available only in the local application. A hosted browser interface is not a replacement for those native capabilities.
