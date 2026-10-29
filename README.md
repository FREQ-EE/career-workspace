# Career Workshop

A private career workspace for Windows and macOS. Keep career evidence, goals, opportunities, applications and documents together, with automatic saving and connections to the AI service already used.

The public distribution starts empty. It contains no personal profile, employment history, vacancies, application records, account connections or fixed career specialisations. MIT and third-party licences are included.

## Install

Download the appropriate installer from [Releases](https://github.com/FREQ-EE/career-workspace/releases): Windows x64, macOS Apple silicon or macOS Intel. Open the installer, launch Career Workshop and choose an AI service. No terminal commands, Git installation, Node installation or manual record editing are required for the installed application.

Desktop packages are currently unsigned. Windows may show an unknown-publisher prompt; macOS may require approval in Privacy & Security. Verify the release checksums and obtain installers only from this repository's releases.

## First setup

1. Choose ChatGPT or Claude, review sharing permissions and complete the provider's sign-in. Run the connection test.
2. Import a CV PDF or pasted profile. A readable LinkedIn URL can be attempted; if access is restricted, use a PDF or pasted text. Review extracted facts before accepting them.
3. Review evidence, career direction and practical constraints. Unknown facts remain unknown.
4. Calibrate with up to five real vacancies, distinguishing interest from the accuracy of the capability assessment.
5. Choose a routine, notification preferences and optional background operation.

A dedicated project in the chosen AI service helps keep conversations together. Settings can install a local MCP connector for compatible ChatGPT and Claude desktop clients. The connector reads and updates the actual career records; it does not grant access to the whole computer. [AI setup](docs/ai-connections.md) explains supported clients and account requirements.

## Daily use

Home shows upcoming actions, new roles and discovery progress. Search now starts an explicit search. Opportunities contains Inbox, Shortlist, Applications and Archive. Profile & Strategy keeps the current evidence, goals and constraints editable. Documents maintains a factual CV source, user-defined versions and application drafts. Changes save automatically.

Listings are checked independently of application stage. Unknown salaries, working languages and requirements remain unknown. The app does not submit applications or contact employers. Review all documents before use.

## Background and cloud work

The application can remain in the Windows tray or macOS menu bar after its window closes, and can launch at sign-in. Local work requires an awake, online computer and a valid AI connection. An overdue search runs once after resuming; missed intervals are not replayed.

Optional cloud discovery uses a private repository containing an approved search brief and incoming results. The provider's actual cloud scheduler runs the search. The app imports results later without overwriting local notes or application stages. A real delivery test is required before switching to cloud discovery. [Cloud setup](docs/cloud-discovery.md).

## Data and privacy

The local workspace is separate from installed code. Settings offers complete backup and restore. Backups include evidence and documents but exclude credentials. The desktop credential store uses operating-system encryption. A source/browser development session keeps credentials in memory only.

AI requests share the selected information with the chosen provider; local storage does not mean local AI inference. Search briefs omit contact details and original CV files. Capability evidence in the optional private cloud brief is a separate choice. No separately billed API fallback is configured. Disable paid extra usage in provider account settings when a fixed subscription budget is required.

Feedback reports are reviewed before opening the public GitHub issue form. The report is not posted merely by preparing it.

## Development

Requires Node.js 24 or newer. Contributors can clone this public repository, then run:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. Development data is initialised outside the checkout, in the application's per-user data directory. DATA_DIRECTORY selects an explicit isolated directory. Do not put personal data in this public checkout.

```sh
npm run typecheck
npm run validate
npm test
npm run audit
npm run build
npm run test:runtime
npm run test:ui
npm run build:sites
npm run package
npm run package:desktop
```

The native packaging job bundles the standalone local server and the unmodified official Claude helper, including its licence. Native installers must be built on their target operating systems. CI builds Windows x64 and macOS arm64/x64 packages. Source and optional browser/Worker archives remain available for contributors; desktop AI, tray and credential-store functionality require the local application.

[Architecture](docs/architecture.md) · [Data contracts](docs/data-contracts.md) · [Verification](docs/verification.md) · [Security](SECURITY.md) · [Licence](LICENSE) · [Notices](NOTICE)
