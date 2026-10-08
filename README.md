# Career Workshop

A private career workspace with job tracking, automatic saving, bilingual CVs and optional GitHub and ChatGPT workflows.

This is an empty, reusable application. It contains no personal profile, jobs, CV text, ingredients, recipes, ratings, activity, kitchen layout, sample records or inherited account connections. Configuration files define the structure; the user supplies their own records. The code and documentation are MIT licensed. Third-party notices remain attached to their assets.

## What it does

Opportunity inbox, shortlist and application stages; independent live-listing status; company context and verification evidence; tasks, deadlines and activity; automatic saving and field-level conflict review; import/export; strategy and project evidence; English/German CV editing, emphasis selection, optional user-supplied portrait, PDF generation and source snapshots.

## Run locally

Install **Node.js 24 or newer** and Git. No ChatGPT subscription, API key or GitHub token is needed for local-file mode.

Clone **your own private repository** or extract the source ZIP into an empty directory:

```sh
git clone <your-private-repository-url> career-workspace
cd career-workspace
npm ci
npm run validate
npm run dev
```

Open `http://127.0.0.1:3000`. The commands bind to loopback. The empty records load immediately. Changes save to the JSON files in this checkout; no separate database is required. Use Settings → Set up and edit records to edit the structured configuration. Valid JSON saves on blur; invalid or conflicting edits stay in the editor. See the authoring guide for adding records and their required fields.

For a production build:

```sh
npm run build
npm start
```

Alternatively, in a cloned repository run `node scripts/assemble-local.mjs` to assemble the checksum-verified `career-workspace-local.zip` from the parts in `downloads/`. Extract the ZIP, then follow its `RUN.md`. Assembly needs only Node and no installed project dependencies. It contains a built Node server, assets and empty records. It is a Node server application, not a static `index.html`; opening files directly or using a static file server cannot run its APIs. Standard source-based installation works on Windows, macOS and Linux. The prebuilt local archive was built on Linux; rebuild from source if platform-specific dependencies differ on another system.

## Make a private personal copy

Keep this public starter separate from your personal data. GitHub does not allow a public fork to become private. Create a new private repository and copy the files into it, or use GitHub's template option if the repository owner enables it. A source ZIP is suitable for this: it contains no Git history. Do not put personal records into a public fork.

```sh
# Inside the extracted source ZIP, after creating an empty private repository:
git init -b main
git add .
git commit -m "Initial empty workspace"
git remote add origin <your-private-repository-url>
git push -u origin main
```

Use your own Git identity. The software's MIT licence does not make your private records public.

## Connect the local application to GitHub

The **application's connection** and **ChatGPT's GitHub connection** are separate. Connecting GitHub in ChatGPT does not give a locally running server an access token.

1. Keep the complete starter structure in your private repository and commit the empty records.
2. Create a fine-grained GitHub personal access token limited to that repository, with **Contents: read and write**. It does not need Issues, Actions or administration permissions. Set an expiry and renew it in server settings when needed.
3. Copy `.env.example` to `.env.local` and fill these values locally. Never commit the resulting file:

```dotenv
DATA_BACKEND=github
GITHUB_REPOSITORY=OWNER/PRIVATE_REPOSITORY
GITHUB_BRANCH=main
GITHUB_TOKEN=
APP_RUNTIME=local
```

Enter the token only in your local environment file or secret manager. Do not paste it into ChatGPT, a web form, a repository file or a URL. On Windows, `Copy-Item .env.example .env.local` copies the template. On macOS/Linux use `cp .env.example .env.local`.

4. Restart the server. Record edits now commit to the configured repository; the token stays server-side. ChatGPT changes become visible on Refresh and periodic synchronisation. Code changes require a rebuild, while data changes do not.

GitHub branch protections may reject direct writes. For a personal data branch, choose branch rules that permit your authorised account to update it, or use a separate permitted branch and configure `GITHUB_BRANCH`. Never disable another project's protections for this application.

Set `DATA_DIRECTORY` to an absolute path to use a separate local data tree. It must contain the same record directories and files as this starter. In GitHub mode this setting is ignored.

## Use it through ChatGPT

Read [ChatGPT setup and operation](docs/chatgpt.md), then copy [Project instructions](docs/project-instructions.md) into your own ChatGPT Project and fill its repository/branch placeholders. Connect the GitHub plugin and grant access only to your private data repository. The workflow needs actual repository **write tools**; a read-only connection can inspect records but cannot log changes.

You can use voice dictation in ChatGPT where available: dictate the facts, review any ambiguity, and ask ChatGPT to record them in the repository. The application does not contain speech recognition or call the OpenAI API. ChatGPT must read the current file, preserve unrelated fields, validate the update and confirm the resulting commit. Automatic search/calendar schedules are optional and require explicit setup; no automation is enabled by this template.

## Deploy with ChatGPT Sites

Local running is the simplest independent option. Sites hosting is optional. As checked on **8 October 2026**, OpenAI's Sites documentation lists Plus, Pro, Business, Enterprise and Edu; Free is not listed. Access can also depend on rollout, region and workspace settings. [Official Sites documentation](https://learn.chatgpt.com/docs/sites).

See [deployment instructions](docs/deployment.md). The source has a generic `.openai/hosting.json` with **no project ID**. Register a new Site in your own account; never reuse another person's Site ID, URL or credentials. Hosted mode uses your private GitHub repository, not a Worker-local filesystem.

## Records and schemas

See [data contracts and authoring](docs/data-contracts.md). JSON schemas are in `schemas/`. They are compiled to standalone validators for runtime use, avoiding dynamic evaluation in Workers. Run `npm run validate` after external edits; it checks required structure and cross-record references.

## Saving and conflict handling

Interactive field changes save automatically. Whole-record editing in Settings uses a revision check. A concurrent whole-record edit returns a conflict instead of replacing the other writer's data; retain your text, fetch the latest record, merge it and try again. The record editor does not retry ambiguous full-file replacements automatically.

GitHub is durable only after a successful commit. Local data is durable only while the data directory is retained. Do not treat a pending-draft message as a completed save. Keep backups of your private repository. For device caches and pending edits, use a trusted browser profile; exported files can contain your own private data after setup.

## Validation and release archives

```sh
npm run typecheck
npm run validate
npm test
npm run build
npm run build:sites
npm run test:runtime
npm run package
```

`npm run audit` checks an empty public starter, so it intentionally fails after entering personal data. Set the GitHub Actions repository variable `EMPTY_STARTER=true` only for a public starter that must remain empty; private personal copies validate schemas without that audit. `ASSERT_EMPTY_STARTER=1 npm test` also enables the strict empty-distribution test.

`releases/` contains source, prebuilt local and Sites Worker ZIPs plus `SHA256SUMS`. The repository's `downloads/` contains the audited empty distribution. The large prebuilt local ZIP is stored in two parts and reconstructed with the supplied Node script; the source and Sites ZIPs are single files. To generate a personal backup after entering records, use your private repository or export tools; do not upload a newly generated personal archive to this public starter.

The Sites Worker ZIP contains build output and a generic manifest; it still requires your Site identity and runtime secrets before publication. The source ZIP is the appropriate input for a new user's Sites import/build workflow.

## Development

Next.js runs the local Node application. Vinext/Vite builds the same React application and HTTP APIs for Sites Workers. `lib/runtime.ts` reads Node environment variables; the Worker build aliases it to `lib/runtime-sites.ts`. GitHub reads and writes go through `lib/storage-backend.ts`. No telemetry SDK, account-specific endpoint or external analytics is added by this project.

[Security and privacy](SECURITY.md) · [Architecture](docs/architecture.md) · [Licence](LICENSE) · [Third-party notices](NOTICE)
