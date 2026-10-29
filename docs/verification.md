# Verification

The release gate comprises type checking, record validation, unit/integration tests, the empty-distribution audit, a production Node build, production HTTP smoke checks, responsive browser checks, the optional Worker build and archive inspection.

Tests use isolated temporary data directories. They exercise revision conflicts and idempotence, account/credential boundaries, completed versus interrupted response streams, invalid AI output, job normalisation and deduplication, source URL restrictions, import review, schema rejection and full backup integrity. Fixture records are never written to the canonical public starter.

Production smoke checks verify actual HTTP reads, saves and rereads, invalid origins, schema rejection, current generic CV PDF generation, local MCP authentication and backup export. Browser acceptance covers laptop and narrow layouts, four palettes, onboarding, forms, saving and keyboard-visible controls.

Native installers are built on Windows and macOS, including the matching unmodified helper binary. Installer launch, tray behaviour and operating-system credentials require native acceptance. Provider protocol tests use simulated responses and do not constitute a real account sign-in. The onboarding connection test confirms an actual provider response for the selected user's account. Do not claim live provider research, public distribution or operating-system acceptance without the corresponding observed result.
