# Career record contracts

Canonical records are human-readable JSON. The installed application provides forms and AI tools; normal use does not require editing these files manually.

| File | Purpose |
| --- | --- |
| data/workspace.json | Opportunities, tasks and activity |
| data/profile.json | Confirmed identity, evidence, goals and constraints |
| data/settings.json | Appearance, provider choice, routine, notifications and sharing choices |
| data/journey.json | Resumable onboarding, unconfirmed import draft and calibration |
| data/documents.json | Application drafts and review status |
| data/searches.json | Discovery run outcomes, timestamps and imported delivery IDs |
| career/cv.json | Version-2 factual CV source and user-defined versions |
| config/discovery.json | Optional source/query configuration |
| config/integrations.json | Integration metadata; not a scheduler |
| assets/evidence/ | User-supplied source documents |
| applications/generated/ | Exported PDFs and source snapshots |

Schemas live in schemas/. Runtime validation uses compiled validators. Run npm run validate after contract changes. Public records start empty and with all sharing, routine and cloud connections disabled.

## Opportunities

Stable IDs, company, title, location, salary, language, direct source URL, retrieval date, assessment, role family, fit, gaps, summary, application stage, notes, next action, due date and stage history are required. Unknown fields use empty strings or explicit unknown text, not invented values. Goal and capability scores, when present, are separate ordinal assessments from 0 to 5.

Application stages are Inbox, Shortlisted, Preparing, Applied, Interview, Offer, Closed and Dismissed. Listing availability is independently Live, Unavailable or Unverified. Verification stores the time, URL, method and actual evidence. Source access failure leaves availability Unverified. A draft never implies Applied.

Tasks refer to an existing opportunity ID or an empty unrelated reference. IDs are unique. Preserve unrelated records and user stage decisions when importing new opportunities.

## Profile and CV

The extensible profile separates identity, employment, direction, capability, search constraints, qualifications, presentation and privacy. The version-2 CV stores plain contact fields, language, headline, factual summary, skills, languages, experience, education and projects. Entries use stable IDs. Versions have user-defined labels, language, headline, summary and optional opportunity links. There are no prescribed professional tracks.

An AI import is saved in journey.draft until the user reviews it. Confirming the draft populates the profile and CV source. Original documents and uncertainty notes are retained for review. Never strengthen unsupported claims to improve an assessment or application.

## Saving and external tools

The browser and MCP submit field patches with prior values. Unrelated changes merge; a conflicting field is retained for review. Full-record replacement requires its current revision. Record only successful saves as saved. Generated PDFs record the exact CV source used.

Credentials and local connection files live outside these records and are excluded from backup/export. A native schedule is created only through the selected provider's actual scheduling interface. Storing preferences or instructions does not activate one.
