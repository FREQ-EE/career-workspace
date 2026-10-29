# Optional cloud discovery

Local storage is the default. For searches while the computer is off, create a separate private repository containing only the approved search brief and incoming results. GitHub Free is sufficient for this storage; no GitHub Actions inference runner is required.

1. Create a private data-only repository and initialise its default branch.
2. Give the chosen AI cloud environment real read/write access to that repository. A read-only project attachment does not provide delivery.
3. In Settings → Cloud discovery, enter the repository and branch. Supply a repository-limited Contents read/write credential to the desktop credential store. The app refuses a public repository and performs a real write/read check.
4. Select whether the cloud brief may include confirmed capability evidence, then publish the selected brief. Contact details and original CV files are omitted.
5. Copy the generated task instructions into the AI service. Create and confirm its actual native schedule. ChatGPT and Claude have different scheduling interfaces and permissions.
6. Run the task once. Use Check delivery to import the first real result. Only then switch periodic discovery to cloud mode. Local periodic search is disabled in that mode to prevent duplicate runners.

Each run reads search-brief.json and writes one new inbox/<stable-run-id>.json with schemaVersion=1, id, createdAt, briefRevision and opportunities. The desktop importer deduplicates deliveries and opportunities, checks current employer pages and never overwrites local stages, notes or task completion.

A successful storage test does not prove a schedule exists. A recorded prompt is not a task. A completed provider session does not prove a result was delivered; verify the resulting file/commit. Missing permissions or expired credentials must remain visible failures.

The native provider task consumes its account allowance. Disable paid extra usage in the provider settings when a fixed subscription budget is required. Disconnecting the app's cloud inbox does not cancel an independently created provider schedule.
