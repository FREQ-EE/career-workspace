# Career data contracts and authoring

## Canonical files

| File | Purpose | Schema |
| --- | --- | --- |
| data/workspace.json | Opportunities, tasks, activity | workspace.schema.json |
| data/profile.json | User-supplied identity, preferences and evidence | profile.schema.json |
| data/site-content.json | Dashboard direction, strategy and evidence cards | site-content.schema.json |
| career/cv.json | Shared bilingual CV source and studio options | cv.schema.json |
| config/discovery.json | Confirmed queries, sources and assessment rules | discovery.schema.json |
| config/integrations.json | Actual integration/schedule status | integrations.schema.json |
| assets/cv/ | Licensed fonts; optional user-supplied portrait.jpg | OFL.txt for fonts |
| applications/generated/ | Generated PDF and source snapshot | Created only after user setup |

## First setup

Fill profile and site-content from your actual preferences. The profile is an extensible record: identity can hold a chosen display name and contact details, employment can hold work arrangements, search can hold locations, languages and salary criteria, and qualifications can hold verified training. These start empty; the app does not infer them.

Dashboard text lives in site-content.json. Strategy priorities/calibration are lists of strings; requirements are pairs of label/value strings. Evidence cards have name, tag, body, detail and a repository-relative path. Use an actual evidence file, not a placeholder claim.

## Opportunities and tasks

The UI's Add opportunity form creates all required fields. For ChatGPT authoring, use the workspace schema: required opportunity fields are id, company, title, location, salary, language, source, retrievedOn, sourceStatus, assessment, family, fit, gaps, summary, stage, notes, nextAction, due and history. Use a stable UUID or slug. Leave an unknown due date as an empty string. A non-empty source must be an HTTP(S) URL. retrievedOn is YYYY-MM-DD; history entries have at (timestamp) and stage.

Application stage is one of Inbox, Shortlisted, Preparing, Applied, Interview, Offer, Closed or Dismissed. listingStatus is independently Live, Unavailable or Unverified. Optional verification records checkedAt (ISO timestamp), url, method and evidence. Company context records companySummary, companySource and companyCheckedOn. A role that disappears should not be marked as a dismissed application unless that is the user's decision.

Tasks have id, title, detail, due, done and opportunityId; an unrelated task uses an empty opportunityId. Activity has id, text, at and kind. External edits must preserve all other opportunities, tasks and historical entries.

## CV source

Contact fields are name, email, phone and location. headlines contains en/de strings. summaries contains operations, implementation and ai-enablement, each with en/de strings. skills and languages each contain en/de string arrays. The generic focus options are inherited technical presentation tools; they do not imply the user works in those fields.

Experience entries have dates, location, title (en/de), company and bullets (en/de lists). Education has dates, title (en/de), organisation and detail (en/de). Projects have name and detail (en/de). Keep every translation faithful to the same facts. Empty arrays are valid.

The default has no photo. To enable one, put your own JPEG in assets/cv/portrait.jpg in the private data store, then select Include portrait. No name artwork or original owner's portrait is required. The renderer uses the entered name and supplied licensed Raleway fonts. Generation refuses an empty name/profile. Generated PDFs and snapshots remain in the configured private store.

## Schema operation

Run npm run validate for every file/index change. Runtime CV and whole-record edits also validate their contracts. Never append a claim just to make a CV more persuasive. The initial files are schema-valid empty shells, not demo people or demo employment history.
