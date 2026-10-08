# Optional discovery workflow

No schedule is active in this template. First gather the user's actual locations, remote/on-site preferences, working languages, role families, hours, compensation requirements and exclusions. Put them in data/profile.json and config/discovery.json; choose a timezone and schedule explicitly.

For each run, read current preferences and workspace.json. Search current sources. Follow each promising job to the employer's actual application page and verify that it still accepts applications. Search-result snippets and cached aggregators do not establish availability. Record the direct URL, checkedAt timestamp, method and evidence; leave the role Unverified if the source cannot be checked. Do not silently convert missing information into a positive match.

Deduplicate by canonical source URL and company/title. Summarise the company's product, industry and scale with an attributable source, leaving headcount unknown when not established. Separate fit, gaps and role context. Keep salary unpublished when the employer does not provide it. Add assessed new roles to Inbox without altering the user's existing stages or notes.

Create or update the actual ChatGPT scheduled task only after the user supplies the schedule and authorises it. Record status active in integrations.json only after the scheduler confirms creation. A configuration file is not a scheduler. Calendar entries are a separate optional connection and need their own setup/authorisation.
