# Deployment

## Local source installation

Run `npm ci`, `npm run validate`, `npm run build`, then `npm start`. Read README.md for loopback access, environment files and optional GitHub synchronisation. For a prebuilt Linux archive follow RUN.md inside the local ZIP. A private external DATA_DIRECTORY separates records from software updates.

## ChatGPT Sites

1. Create a private copy of the source repository and initialise its empty record tree. Obtain a repository-scoped Contents read/write credential through GitHub's secure token workflow.
2. In an account where Sites is available, provide the source ZIP or point ChatGPT Work at the private source repository. Ask: “Create a new owner-private Site from this project. Use its Vinext `build:sites` configuration. Do not reuse any existing Site identity or publish publicly.”
3. The Sites workflow registers the new project and writes its own project_id into `.openai/hosting.json`. This starter deliberately has no project_id. The user can retain that ID in their private source copy; do not add a personal ID to the public starter.
4. In the **new Site's runtime settings**, set `DATA_BACKEND=github`, `GITHUB_REPOSITORY` to your private repository, `GITHUB_BRANCH` to the chosen branch, and `APP_RUNTIME=sites`. Set `GITHUB_TOKEN` as a secret through the supported secure configuration path. Do not put the credential in a prompt or file attachment.
5. Install dependencies with `npm ci`, then run `npm run typecheck`, `npm run validate`, and `npm run build:sites`. The build emits `dist/` with the Worker and client assets. The Sites workflow synchronises source, packages this exact build with the assigned manifest, saves a version and deploys it privately.
6. Confirm private access and test a read and a real update in your own data repository. Code publication and data commits are different: editing a recipe/job record needs no new Site build, while changing application code does.

The supplied sites ZIP is prebuilt output with no account binding. It is not a one-click authenticated deployment and cannot supply a user's token or Site project ID. Use the source ZIP to create the new Site, or rebuild the output after registering it. No deployment in the original author's account is needed.

## Other Node hosting

Use `APP_RUNTIME=server`, set APP_PASSWORD through runtime secrets, require HTTPS (set APP_ORIGIN to the external HTTPS origin when behind a reverse proxy), and choose GitHub or a persistent local data directory. A provider that only serves static files cannot run this application's server APIs. Do not expose a shared repository token on an unauthenticated public deployment.
