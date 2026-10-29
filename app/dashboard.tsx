"use client";
import { useEffect, useRef, useState } from "react";
import {
  House,
  BriefcaseBusiness,
  Compass,
  FileText,
  Settings as SettingsIcon,
  Search,
  Plus,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Cloud,
  MoreHorizontal,
} from "lucide-react";
import {
  WorkshopProvider,
  useWorkshop,
  api,
  download,
  localDate,
} from "./state";
import { Modal, Empty, relativeDate } from "./ui";
import Onboarding from "./onboarding";
import SettingsPanel from "./settings";
import { ProfileFields, Interview } from "./profile-fields";
import CVEditor from "./documents/cv-studio";
import { stages, type Opportunity, type Stage } from "@/lib/model";
const destinations = [
  { name: "Home", icon: House },
  { name: "Opportunities", icon: BriefcaseBusiness },
  { name: "Profile & Strategy", icon: Compass },
  { name: "Documents", icon: FileText },
  { name: "Settings", icon: SettingsIcon },
];
export default function Dashboard() {
  return (
    <WorkshopProvider>
      <Application />
    </WorkshopProvider>
  );
}
function Application() {
  const w = useWorkshop();
  const [page, setPage] = useState("Home"),
    [onboarding, setOnboarding] = useState(false),
    [selected, setSelected] = useState(""),
    [adding, setAdding] = useState<"role" | "task" | null>(null),
    [collapsed, setCollapsed] = useState(false);
  const welcomed = useRef(false);
  useEffect(() => {
    if (w.ready && !welcomed.current) {
      welcomed.current = true;
      if (!w.journey.data.complete) setOnboarding(true);
    }
  }, [w.ready]);
  const pending = Object.values(w.editors).some((v) => v.dirty || v.saving),
    errors = Object.entries(w.editors).filter(([, v]) => v.error);
  if (!w.ready)
    return (
      <div className="startup">
        <span className="app-mark">CW</span>
        <h1>Career Workshop</h1>
        {w.fatal ? (
          <>
            <p role="alert">{w.fatal}</p>
            <button className="button" onClick={() => void w.reload()}>
              Try again
            </button>
          </>
        ) : (
          <p>
            <LoaderCircle size={16} className="spin" />
            Opening the local workspace…
          </p>
        )}
      </div>
    );
  const chosen = w.workspace.data.opportunities.find((o) => o.id === selected);
  return (
    <div className={"app-shell " + (collapsed ? "nav-collapsed" : "")}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="app-sidebar">
        <div className="brand">
          <span className="app-mark">CW</span>
          <div>
            <strong>Career Workshop</strong>
            <small>Private career workspace</small>
          </div>
        </div>
        <nav aria-label="Main navigation">
          {destinations.map(({ name, icon: Icon }) => (
            <button
              title={collapsed ? name : undefined}
              aria-label={name}
              aria-current={page === name ? "page" : undefined}
              key={name}
              className={page === name ? "active" : ""}
              onClick={() => {
                setPage(name);
                setSelected("");
              }}
            >
              <Icon size={19} />
              <span>{name}</span>
              {name === "Opportunities" &&
                w.workspace.data.opportunities.filter(
                  (o) => o.stage === "Inbox",
                ).length > 0 && (
                  <b>
                    {
                      w.workspace.data.opportunities.filter(
                        (o) => o.stage === "Inbox",
                      ).length
                    }
                  </b>
                )}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="privacy-line">
            <ShieldCheck size={16} />
            <span>Local by default</span>
          </div>
          <button
            className="collapse-control"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeftOpen size={17} />
            ) : (
              <PanelLeftClose size={17} />
            )}
            <span>Collapse</span>
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <span
              className={"save-indicator " + (errors.length ? "error" : "")}
              role="status"
            >
              {pending ? (
                <LoaderCircle size={13} className="spin" />
              ) : errors.length ? (
                <Clock size={13} />
              ) : (
                <Check size={13} />
              )}
              <span>
                {errors.length
                  ? "Needs review"
                  : pending
                    ? "Saving…"
                    : "All changes saved"}
              </span>
            </span>
            <span
              className="profile-initial"
              title={w.profile.data.identity.name || "Local workspace"}
            >
              {(w.profile.data.identity.name || "CW")
                .split(" ")
                .map((v) => v[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {w.fatal && (
            <div className="alert" role="alert">
              {w.fatal}
              <button className="text-button" onClick={() => void w.reload()}>
                Retry
              </button>
            </div>
          )}
          {errors.map(([name, editor]) => (
            <div className="alert" role="alert" key={name}>
              <span>{editor.error}</span>
              <div className="button-row">
                <button
                  className="button subtle"
                  onClick={() => w.resolveConflict(name, true)}
                >
                  Keep these edits
                </button>
                <button
                  className="button subtle"
                  onClick={() => w.resolveConflict(name, false)}
                >
                  Use latest saved record
                </button>
              </div>
            </div>
          ))}
          {page === "Home" ? (
            <Home
              onOpen={(id) => {
                setSelected(id);
              }}
              onOpportunities={() => setPage("Opportunities")}
              onSetup={() => setOnboarding(true)}
              onTask={() => setAdding("task")}
            />
          ) : page === "Opportunities" ? (
            <Opportunities
              selected={selected}
              onSelect={setSelected}
              onAdd={() => setAdding("role")}
            />
          ) : page === "Profile & Strategy" ? (
            <>
              <div className="page-title">
                <div>
                  <span className="eyebrow">PROFILE & STRATEGY</span>
                  <h1>A direction grounded in evidence.</h1>
                  <p className="muted">
                    Review the current profile, goals and constraints. Changes
                    save automatically.
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => {
                    w.journey.change((j) => ({ ...j, step: 1 }), true);
                    setOnboarding(true);
                  }}
                >
                  Review onboarding
                  <ArrowRight size={16} />
                </button>
              </div>
              <div className="profile-layout">
                <div className="card">
                  <ProfileFields
                    groups={[
                      "identity",
                      "employment",
                      "capability",
                      "direction",
                      "search",
                    ]}
                  />
                </div>
                <aside className="card strategy-summary">
                  <span className="eyebrow">CURRENT DIRECTION</span>
                  <h3>
                    {w.profile.data.direction.targets ||
                      "Define a target direction"}
                  </h3>
                  <p>
                    {w.profile.data.direction.motivations ||
                      "The reasons behind the next move will appear here."}
                  </p>
                  <div className="divider" />
                  <h4>Non-negotiables</h4>
                  <p className="muted">
                    {w.profile.data.search.nonNegotiables ||
                      "No requirements recorded."}
                  </p>
                  <h4>Evidence to build on</h4>
                  <p className="muted">
                    {w.profile.data.capability.skills ||
                      "Add verified experience and skills."}
                  </p>
                  <div className="divider" />
                  <span className="small muted">
                    {w.journey.data.calibration.length} calibration decisions
                    recorded
                  </span>
                </aside>
              </div>
              <div className="card">
                <Interview step="profile review" />
              </div>
            </>
          ) : page === "Documents" ? (
            <DocumentsPanel />
          ) : (
            <>
              <div className="page-title">
                <div>
                  <span className="eyebrow">PREFERENCES & CONNECTIONS</span>
                  <h1>Make the workspace work for you.</h1>
                </div>
              </div>
              <SettingsPanel />
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>Career Workshop · {w.version}</span>
          <span>
            {w.settings.data.cloud.enabled ? (
              <>
                <Cloud size={13} />
                Cloud delivery
              </>
            ) : w.settings.data.routine.enabled ? (
              "Periodic local discovery"
            ) : (
              "Manual discovery"
            )}
            {w.desktop ? " · Desktop" : " · Local browser"}
          </span>
        </footer>
      </div>
      {onboarding && <Onboarding onClose={() => setOnboarding(false)} />}
      {adding && (
        <AddRecord kind={adding} onClose={() => setAdding(null)} />
      )}{" "}
      {chosen && (
        <RoleDetails
          opportunity={chosen}
          onClose={() => setSelected("")}
          onDocuments={() => {
            setSelected("");
            setPage("Documents");
          }}
        />
      )}
      {w.busy && (
        <div className="work-status" role="status">
          <LoaderCircle size={17} className="spin" />
          {w.busy}…
        </div>
      )}
      {w.toast && (
        <div className="toast" role="status">
          {w.toast}
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => w.notify("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
function SearchControl() {
  const w = useWorkshop();
  return (
    <button
      className="button"
      disabled={!!w.active || !!w.busy}
      onClick={() => void w.search()}
    >
      {w.active ? (
        <LoaderCircle size={17} className="spin" />
      ) : (
        <Search size={17} />
      )}{" "}
      {w.active ? "Search in progress" : "Search now"}
    </button>
  );
}
function Home({
  onOpen,
  onOpportunities,
  onSetup,
  onTask,
}: {
  onOpen: (id: string) => void;
  onOpportunities: () => void;
  onSetup: () => void;
  onTask: () => void;
}) {
  const w = useWorkshop(),
    roles = w.workspace.data.opportunities,
    inbox = roles.filter((o) => o.stage === "Inbox"),
    applications = roles.filter((o) =>
      ["Preparing", "Applied", "Interview", "Offer"].includes(o.stage),
    ),
    tasks = w.workspace.data.tasks
      .filter((t) => !t.done)
      .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999")),
    last = w.searches.runs[0];
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR CAREER, IN VIEW</span>
          <h1>Make the next move.</h1>
          <p className="muted">
            A clear place to find opportunities, prepare thoughtfully and follow
            through.
          </p>
        </div>
        <SearchControl />
      </div>
      {!w.journey.data.complete && (
        <div className="welcome-banner">
          <div>
            <span className="eyebrow">START WITH A CLEAR PICTURE</span>
            <h2>Build the search around your evidence and goals.</h2>
            <p>
              Connect the AI service, review the profile and calibrate with real
              vacancies.
            </p>
          </div>
          <button className="button" onClick={onSetup}>
            Continue setup
            <ArrowRight size={16} />
          </button>
        </div>
      )}
      <div className="stats-row">
        <button onClick={onOpportunities}>
          <span>New to review</span>
          <strong>{inbox.length}</strong>
          <small>In the opportunity inbox</small>
        </button>
        <button onClick={onOpportunities}>
          <span>Shortlisted</span>
          <strong>
            {roles.filter((o) => o.stage === "Shortlisted").length}
          </strong>
          <small>Worth a closer look</small>
        </button>
        <button onClick={onOpportunities}>
          <span>In progress</span>
          <strong>{applications.length}</strong>
          <small>Applications and conversations</small>
        </button>
      </div>
      {w.active && (
        <div className="search-progress">
          <LoaderCircle className="spin" size={18} />
          <div>
            <strong>{w.active.stage}</strong>
            <span>
              Results appear after employer checks and saving are complete.
            </span>
          </div>
          <button
            className="text-button"
            onClick={() =>
              void api("/api/search", { action: "cancel" }).then(() =>
                w.reload(),
              )
            }
          >
            Cancel search
          </button>
        </div>
      )}
      <div className="home-grid">
        <section className="card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">FOCUS</span>
              <h2>The next useful action.</h2>
            </div>
            <button
              className="icon-button"
              aria-label="Add action"
              onClick={onTask}
            >
              <Plus size={18} />
            </button>
          </div>
          {tasks.length ? (
            <div className="task-list">
              {tasks.slice(0, 7).map((task) => (
                <div className="task-row" key={task.id}>
                  <label className="task-check">
                    <input
                      type="checkbox"
                      checked={task.done}
                      aria-label={"Complete " + task.title}
                      onChange={(e) =>
                        w.workspace.change((data) => {
                          const t = data.tasks.find((t) => t.id === task.id);
                          if (t) t.done = e.target.checked;
                          return data;
                        }, true)
                      }
                    />
                  </label>
                  <div>
                    <strong>{task.title}</strong>
                    {task.detail && <p>{task.detail}</p>}
                    {task.due && (
                      <small
                        className={task.due < localDate() ? "overdue" : ""}
                      >
                        {task.due === localDate() ? "Today" : task.due}
                      </small>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Room for the next step">
              Add an action or finish onboarding to create a realistic
              application routine.
            </Empty>
          )}
        </section>
        <section className="card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">OPPORTUNITIES</span>
              <h2>Fresh possibilities.</h2>
            </div>
            <button className="text-button" onClick={onOpportunities}>
              View all
              <ArrowRight size={15} />
            </button>
          </div>
          {inbox.length ? (
            <div className="preview-roles">
              {inbox
                .slice(-4)
                .reverse()
                .map((role) => (
                  <button key={role.id} onClick={() => onOpen(role.id)}>
                    <span className="company-avatar">
                      {role.company.slice(0, 2).toUpperCase()}
                    </span>
                    <span>
                      <strong>{role.title}</strong>
                      <small>
                        {role.company} ·{" "}
                        {role.location || "Location not established"}
                      </small>
                      <span className="badge">{role.assessment}</span>
                    </span>
                    <ChevronRight size={17} />
                  </button>
                ))}
            </div>
          ) : (
            <Empty title="The inbox starts here">
              Searches add relevant vacancies after reviewing the approved
              criteria.
            </Empty>
          )}
        </section>
      </div>
      <section className="card discovery-summary">
        <div>
          <span className="eyebrow">DISCOVERY</span>
          <h3>{last ? last.stage : "Ready when the criteria are clear."}</h3>
          <p className={last?.error ? "error-text" : "muted"}>
            {last?.error ||
              "Matches consider both the work you want and the evidence supporting your candidacy."}
          </p>
        </div>
        <dl>
          <div>
            <dt>Last successful search</dt>
            <dd>{relativeDate(w.searches.lastSuccessAt)}</dd>
          </div>
          <div>
            <dt>Routine</dt>
            <dd>
              {w.settings.data.routine.enabled
                ? `Every ${w.settings.data.routine.intervalHours} hours`
                : "Manual searches"}
            </dd>
          </div>
        </dl>
      </section>
    </>
  );
}
function Opportunities({
  selected,
  onSelect,
  onAdd,
}: {
  selected: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  const w = useWorkshop();
  const [tab, setTab] = useState("Inbox"),
    [query, setQuery] = useState("");
  const match = (o: Opportunity) =>
    tab === "Inbox"
      ? o.stage === "Inbox"
      : tab === "Shortlist"
        ? o.stage === "Shortlisted"
        : tab === "Applications"
          ? ["Preparing", "Applied", "Interview", "Offer"].includes(o.stage)
          : ["Closed", "Dismissed"].includes(o.stage);
  const filtered = w.workspace.data.opportunities
    .filter(match)
    .filter((o) =>
      (o.company + " " + o.title + " " + o.location)
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">DISCOVER, ASSESS, FOLLOW THROUGH</span>
          <h1>Opportunities.</h1>
          <p className="muted">
            A pipeline with evidence, context and a clear next action.
          </p>
        </div>
        <div className="button-row">
          <button className="button secondary" onClick={onAdd}>
            <Plus size={16} />
            Add opportunity
          </button>
          <SearchControl />
        </div>
      </div>
      <div className="opportunity-toolbar">
        <div className="tabs" role="tablist" aria-label="Opportunity views">
          {["Inbox", "Shortlist", "Applications", "Archive"].map((name) => (
            <button
              role="tab"
              aria-selected={tab === name}
              className={tab === name ? "active" : ""}
              key={name}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Filter opportunities"
            placeholder="Filter by role or company…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="opportunity-list">
        {filtered.length ? (
          filtered
            .slice()
            .reverse()
            .map((o) => (
              <button
                className={
                  "opportunity-row " + (selected === o.id ? "selected" : "")
                }
                key={o.id}
                onClick={() => onSelect(o.id)}
              >
                <span className="company-avatar">
                  {o.company.slice(0, 2).toUpperCase()}
                </span>
                <span className="role-main">
                  <small>{o.company}</small>
                  <strong>{o.title}</strong>
                  <span>
                    {o.location || "Location not established"}
                    {o.salary ? " · " + o.salary : ""}
                  </span>
                </span>
                <span className="role-assessment">
                  <span className="badge">{o.assessment}</span>
                  <small>
                    {tab === "Applications"
                      ? o.stage
                      : o.listingStatus || "Unverified"}
                  </small>
                </span>
                <ChevronRight size={18} />
              </button>
            ))
        ) : (
          <div className="card">
            <Empty
              title={
                query
                  ? "No matching opportunities"
                  : "Nothing in " + tab.toLowerCase() + " yet"
              }
            >
              {query
                ? "Try another role or company."
                : "New roles arrive in the inbox. Shortlisting and stage changes save immediately."}
            </Empty>
          </div>
        )}
      </div>
    </>
  );
}
function RoleDetails({
  opportunity: o,
  onClose,
  onDocuments,
}: {
  opportunity: Opportunity;
  onClose: () => void;
  onDocuments: () => void;
}) {
  const w = useWorkshop();
  return (
    <Modal title="Opportunity details" onClose={onClose} wide>
      <div className="role-detail">
        <div className="role-heading">
          <span className="company-avatar large">
            {o.company.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <span className="eyebrow">{o.company}</span>
            <h2>{o.title}</h2>
            <p className="muted">{o.location || "Location not established"}</p>
          </div>
          {o.source && (
            <a
              href={o.source}
              target="_blank"
              rel="noreferrer"
              className="button secondary"
            >
              Employer page
              <ArrowUpRight size={15} />
            </a>
          )}
        </div>
        <div className="role-badges">
          <span className="badge">{o.assessment}</span>
          <span
            className={"badge " + (o.listingStatus === "Live" ? "green" : "")}
          >
            {o.listingStatus || "Unverified"}
          </span>
        </div>
        <div className="assessment-grid">
          <div className="assessment-card">
            <span className="eyebrow">PREFERENCE FIT</span>
            <strong>{o.goalScore == null ? "—" : o.goalScore + " / 5"}</strong>
            <p>Alignment with the approved direction and constraints.</p>
          </div>
          <div className="assessment-card">
            <span className="eyebrow">EVIDENCE FIT</span>
            <strong>
              {o.capabilityScore == null ? "—" : o.capabilityScore + " / 5"}
            </strong>
            <p>How strongly existing experience supports candidacy.</p>
          </div>
        </div>
        <div className="detail-section">
          <h3>Why it could fit</h3>
          <p>
            {o.fit || "An evidence-based assessment has not been recorded."}
          </p>
          <h3>Gaps and uncertainty</h3>
          <p>
            {o.gaps || "Review the employer requirements before proceeding."}
          </p>
          <h3>The work</h3>
          <p>{o.summary || "No role context recorded."}</p>
          {o.companySummary && (
            <>
              <h3>About the organisation</h3>
              <p>{o.companySummary}</p>
              {o.companySource && (
                <a
                  href={o.companySource}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link"
                >
                  Company source ↗
                </a>
              )}
            </>
          )}
        </div>
        <dl className="facts">
          <div>
            <dt>Compensation</dt>
            <dd>{o.salary || "Unpublished"}</dd>
          </div>
          <div>
            <dt>Working language</dt>
            <dd>{o.language || "Unknown"}</dd>
          </div>
          <div>
            <dt>Availability check</dt>
            <dd>{o.verification?.evidence || o.sourceStatus}</dd>
          </div>
          {o.verification && (
            <div>
              <dt>Checked</dt>
              <dd>{relativeDate(o.verification.checkedAt)}</dd>
            </div>
          )}
        </dl>
        <div className="divider" />
        <div className="form-grid">
          <label>
            Application stage
            <select
              value={o.stage}
              onChange={(e) =>
                w.patchOpportunity(o.id, { stage: e.target.value as Stage })
              }
            >
              {stages.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Next action or deadline date
            <input
              type="date"
              value={o.due}
              onChange={(e) =>
                w.patchOpportunity(o.id, { due: e.target.value })
              }
            />
          </label>
          <label className="span-two">
            Next action
            <input
              value={o.nextAction}
              onChange={(e) =>
                w.patchOpportunity(o.id, { nextAction: e.target.value })
              }
              onBlur={() => void w.workspace.flush()}
            />
          </label>
          <label className="span-two">
            Notes
            <textarea
              rows={4}
              value={o.notes}
              onChange={(e) =>
                w.patchOpportunity(o.id, { notes: e.target.value })
              }
              onBlur={() => void w.workspace.flush()}
            />
          </label>
        </div>
        <div className="button-row">
          <button
            className="button"
            disabled={o.stage === "Shortlisted"}
            onClick={() => w.patchOpportunity(o.id, { stage: "Shortlisted" })}
          >
            <Check size={16} />
            Shortlist
          </button>
          <button className="button secondary" onClick={onDocuments}>
            Prepare documents
            <ArrowRight size={16} />
          </button>
          <button
            className="button subtle"
            onClick={() => w.patchOpportunity(o.id, { stage: "Dismissed" })}
          >
            Dismiss
          </button>
        </div>
        <p className="muted small">
          Recording an application stage does not submit anything. Listing
          availability remains separate.
        </p>
        <details className="disclosure">
          <summary>Stage history</summary>
          {o.history.map((h, i) => (
            <p key={i} className="small">
              {h.stage} · {relativeDate(h.at)}
            </p>
          ))}
        </details>
      </div>
    </Modal>
  );
}
function AddRecord({
  kind,
  onClose,
}: {
  kind: "role" | "task";
  onClose: () => void;
}) {
  const w = useWorkshop();
  return (
    <Modal
      title={kind === "role" ? "Add an opportunity" : "Add an action"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget),
            title = String(data.get("title") || "").trim(),
            detail = String(data.get("detail") || "");
          if (!title) return;
          w.workspace.change((value) => {
            if (kind === "task")
              value.tasks.push({
                id: crypto.randomUUID(),
                title,
                detail,
                due: String(data.get("due") || ""),
                done: false,
                opportunityId: String(data.get("opportunityId") || ""),
              });
            else
              value.opportunities.push({
                id: crypto.randomUUID(),
                company: String(data.get("company") || "").trim(),
                title,
                location: String(data.get("location") || ""),
                salary: "Unpublished",
                language: "Unknown",
                source: String(data.get("source") || ""),
                retrievedOn: localDate(),
                sourceStatus: "Added manually; availability unverified",
                assessment: "Uncertain",
                family: "",
                fit: "",
                gaps: "Assessment not yet recorded",
                summary: detail,
                stage: "Inbox",
                listingStatus: "Unverified",
                notes: "",
                nextAction: "Review the employer requirements",
                due: String(data.get("due") || ""),
                history: [{ at: new Date().toISOString(), stage: "Inbox" }],
              });
            return value;
          }, true);
          onClose();
        }}
      >
        {kind === "role" && (
          <label>
            Organisation
            <input name="company" required maxLength={300} autoFocus />
          </label>
        )}
        <label>
          {kind === "role" ? "Role title" : "Action"}
          <input
            name="title"
            required
            maxLength={500}
            autoFocus={kind === "task"}
          />
        </label>
        {kind === "role" ? (
          <>
            <label>
              Employer posting URL
              <input name="source" type="url" pattern="https?://.*" />
            </label>
            <label>
              Location
              <input name="location" />
            </label>
          </>
        ) : (
          <label>
            Related opportunity
            <select name="opportunityId">
              <option value="">None</option>
              {w.workspace.data.opportunities.map((o) => (
                <option value={o.id} key={o.id}>
                  {o.company} · {o.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Context
          <textarea name="detail" rows={4} />
        </label>
        <label>
          Due date · optional
          <input name="due" type="date" />
        </label>
        <div className="dialog-actions">
          <button type="button" className="button subtle" onClick={onClose}>
            Cancel
          </button>
          <button className="button" type="submit">
            <Plus size={16} />
            Add {kind === "role" ? "opportunity" : "action"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function DocumentsPanel() {
  const w = useWorkshop(),
    cv = w.cv.data;
  const [tab, setTab] = useState("CV"),
    [role, setRole] = useState(""),
    [variant, setVariant] = useState(""),
    [draftId, setDraftId] = useState(""),
    [label, setLabel] = useState("");
  const current = cv.variants.find((v) => v.id === variant),
    draft =
      w.documents.data.drafts.find((v) => v.id === draftId) ||
      w.documents.data.drafts[0];
  async function exportCV() {
    await w.act("Preparing the PDF", async () => {
      const r = await fetch("/api/cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: variant,
          photo: cv.studio.photo,
          opportunityId: role,
        }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error);
      }
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = (cv.name || "Career") + "-CV.pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      w.notify("The PDF and its source snapshot are saved in the workspace.");
    });
  }
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">EVIDENCE INTO PRESENTATION</span>
          <h1>Prepare with purpose.</h1>
          <p className="muted">
            Maintain one factual source, then tailor and review each
            application.
          </p>
        </div>
        {tab === "CV" && (
          <button
            className="button"
            disabled={!!w.busy}
            onClick={() => void exportCV()}
          >
            <FileText size={16} />
            Export CV PDF
          </button>
        )}
      </div>
      <div
        className="tabs document-tabs"
        role="tablist"
        aria-label="Document type"
      >
        {["CV", "Application drafts"].map((t) => (
          <button
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="documents-layout">
        <aside className="card document-options">
          <h3>Application context</h3>
          <label>
            Related opportunity
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">Choose an opportunity…</option>
              {w.workspace.data.opportunities.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.company} · {o.title}
                </option>
              ))}
            </select>
          </label>
          {tab === "CV" ? (
            <>
              <label>
                CV version
                <select
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                >
                  <option value="">Factual source CV</option>
                  {cv.variants.map((v) => (
                    <option value={v.id} key={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="divider" />
              <label>
                Name a tailored version
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="A label that makes sense to you"
                />
              </label>
              <button
                className="button secondary"
                disabled={!label.trim()}
                onClick={() => {
                  const id = crypto.randomUUID();
                  w.cv.change((c) => {
                    c.variants.push({
                      id,
                      label: label.trim(),
                      language: c.language,
                      headline: c.headline,
                      summary: c.summary,
                      opportunityId: role,
                    });
                    return c;
                  }, true);
                  setVariant(id);
                  setLabel("");
                }}
              >
                <Plus size={16} />
                Create version
              </button>
              <button
                className="button subtle"
                disabled={!role || !!w.busy}
                onClick={() =>
                  void w.act("Preparing a tailored CV profile", async () => {
                    const result = await api("/api/actions", {
                      action: "prepare-cv",
                      opportunityId: role,
                    });
                    setVariant(result.id);
                    w.notify(
                      "A proposed profile is ready for review. The factual source is unchanged.",
                    );
                  })
                }
              >
                Suggest a tailored profile
              </button>
              <p className="muted small">
                Tailored versions have user-defined labels and draw on the same
                evidence.
              </p>
            </>
          ) : (
            <>
              <button
                className="button"
                disabled={!role || !!w.busy}
                onClick={() =>
                  void w.act("Preparing an application draft", async () => {
                    const result = await api("/api/actions", {
                      action: "prepare-draft",
                      opportunityId: role,
                      kind: "cover-letter",
                    });
                    setDraftId(result.id);
                    w.notify(
                      "A cover-letter draft is ready. Review all claims before using it.",
                    );
                  })
                }
              >
                Prepare cover-letter draft
              </button>
              <div className="divider" />
              <h4>Saved drafts</h4>
              <div className="draft-list">
                {w.documents.data.drafts.map((d) => (
                  <button
                    className={draft?.id === d.id ? "selected" : ""}
                    key={d.id}
                    onClick={() => setDraftId(d.id)}
                  >
                    <strong>{d.title}</strong>
                    <small>{d.reviewed ? "Reviewed" : "Review required"}</small>
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>
        <section className="card document-editor">
          {tab === "CV" ? (
            current ? (
              <>
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">TAILORED VERSION</span>
                    <h2>{current.label}</h2>
                  </div>
                  <button
                    className="text-button danger"
                    onClick={() => {
                      w.cv.change((c) => {
                        c.variants = c.variants.filter(
                          (v) => v.id !== current.id,
                        );
                        return c;
                      }, true);
                      setVariant("");
                    }}
                  >
                    Remove version
                  </button>
                </div>
                <div className="form-grid">
                  <label>
                    Version label
                    <input
                      value={current.label}
                      onChange={(e) =>
                        w.cv.change((c) => {
                          c.variants.find((v) => v.id === current.id)!.label =
                            e.target.value;
                          return c;
                        })
                      }
                    />
                  </label>
                  <label>
                    Language code
                    <input
                      value={current.language}
                      onChange={(e) =>
                        w.cv.change((c) => {
                          c.variants.find(
                            (v) => v.id === current.id,
                          )!.language = e.target.value;
                          return c;
                        })
                      }
                    />
                  </label>
                </div>
                <label>
                  Headline
                  <input
                    value={current.headline}
                    onChange={(e) =>
                      w.cv.change((c) => {
                        c.variants.find((v) => v.id === current.id)!.headline =
                          e.target.value;
                        return c;
                      })
                    }
                  />
                </label>
                <label>
                  Profile for this application
                  <textarea
                    rows={9}
                    value={current.summary}
                    onChange={(e) =>
                      w.cv.change((c) => {
                        c.variants.find((v) => v.id === current.id)!.summary =
                          e.target.value;
                        return c;
                      })
                    }
                  />
                </label>
                <p className="muted">
                  Experience, qualifications and skills come from the factual
                  source CV. Review the tailored profile for accuracy and
                  relevance.
                </p>
              </>
            ) : (
              <>
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">FACTUAL SOURCE</span>
                    <h2>The record behind every version.</h2>
                  </div>
                </div>
                <CVEditor value={cv} onChange={(fn) => w.cv.change(fn)} />
              </>
            )
          ) : draft ? (
            <>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">APPLICATION DRAFT</span>
                  <h2>{draft.title}</h2>
                </div>
                <span className="badge">
                  {draft.reviewed ? "Reviewed" : "Review required"}
                </span>
              </div>
              <label>
                Title
                <input
                  value={draft.title}
                  onChange={(e) =>
                    w.documents.change((d) => {
                      const target = d.drafts.find((v) => v.id === draft.id)!;
                      target.title = e.target.value;
                      return d;
                    })
                  }
                />
              </label>
              <label>
                Draft
                <textarea
                  className="draft-body"
                  rows={20}
                  value={draft.body}
                  onChange={(e) =>
                    w.documents.change((d) => {
                      const target = d.drafts.find((v) => v.id === draft.id)!;
                      target.body = e.target.value;
                      target.reviewed = false;
                      return d;
                    })
                  }
                />
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={draft.reviewed}
                  onChange={(e) =>
                    w.documents.change((d) => {
                      d.drafts.find((v) => v.id === draft.id)!.reviewed =
                        e.target.checked;
                      return d;
                    }, true)
                  }
                />
                <span>I have reviewed the facts and wording.</span>
              </label>
              <div className="button-row">
                <button
                  className="button secondary"
                  onClick={() => download("Application-Draft.txt", draft.body)}
                >
                  Export text
                </button>
                <button
                  className="button subtle"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(draft.body)
                      .then(() => w.notify("Draft copied."))
                  }
                >
                  Copy draft
                </button>
              </div>
              <p className="muted small">
                Exporting or copying does not send the application.
              </p>
            </>
          ) : (
            <Empty title="A place to prepare the application">
              Choose an opportunity and ask the connected AI to prepare a draft
              from the confirmed evidence.
            </Empty>
          )}
        </section>
      </div>
    </>
  );
}
