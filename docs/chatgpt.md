# ChatGPT setup and operation

## One-time setup

Create a ChatGPT Project for your private workspace. Copy docs/project-instructions.md into its instructions and replace the repository and branch placeholders. Connect GitHub and select the private repository. Check the actual tools available: repository reads alone are insufficient; saving requires create/update/commit tools and GitHub write permission. If only a read-only GitHub connector is available, use a Work/Codex repository environment that supports commits, or have ChatGPT prepare a patch that you review and apply locally. It must not report that a patch has already saved.

The local application has no ChatGPT plan requirement. Sites hosting currently requires an eligible paid plan. Voice, plugins and repository-writing capabilities can depend on the surface, plan, region, workspace settings and rollout. This project cannot guarantee that every Free account can perform voice-to-GitHub updates. Check the account's current capability rather than assuming that “GitHub connected” means write access. No OpenAI API key is needed for these ChatGPT workflows.

Official guidance: https://learn.chatgpt.com/docs/sites and https://learn.chatgpt.com/docs/build-plugins (checked 8 October 2026).

## Working procedure

State what changed, dictate or paste the actual facts, and ask ChatGPT to update the relevant canonical records. Ask it to read the current version first, use the documented schemas, preserve unrelated fields and confirm the final paths and commit. The locally running app will see those commits when configured for the same GitHub repository and branch. In local-file mode, cloud ChatGPT does not automatically see or modify files on your computer; use a local Work/Codex checkout or apply its patch.

A ChatGPT Project instruction is guidance, not an automatic trigger or a new permission grant. Schedules must be created explicitly through ChatGPT's scheduling capability when available; editing a config file does not schedule a task. Do not send credentials through dictation.

## Useful requests

- “Read my actual career preferences and CV source. Identify missing setup information, ask for it, and fill the empty fields from my answers.”
- “Log this job in Inbox. Verify the employer's live application page now, record the verification evidence and business summary, and do not invent salary or working language.”
- “Mark this application Applied as of today, preserve listing availability, add the stage history and record the next action.”
- “Prepare an English and German CV for this role using only the facts in my source. Leave unsupported claims out and flag missing translations.”
- “Create a recurring job search using my confirmed preferences and the discovery runbook. Do not activate it until the preferences and schedule are supplied.”
