"use client";
import { useState } from "react";
import {
  Palette,
  Link2,
  Search,
  Bell,
  Database,
  Cloud,
  LifeBuoy,
  MessageSquare,
  Download,
  Upload,
  FolderOpen,
  ShieldCheck,
  ArrowUpRight,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { useWorkshop, api, external } from "./state";
import { ConnectionPanel } from "./connections";
import { RoutineFields } from "./onboarding";
import { relativeDate } from "./ui";
const sections = [
  {
    name: "Appearance",
    icon: Palette,
    description: "Comfortable reading, clear controls and personal preference.",
  },
  {
    name: "AI & connections",
    icon: Link2,
    description:
      "Your AI account, conversation connector and available capabilities.",
  },
  {
    name: "Search & routine",
    icon: Search,
    description: "Discovery frequency, application focus and regular reviews.",
  },
  {
    name: "Notifications & background",
    icon: Bell,
    description:
      "Choose when the application works and how it gets your attention.",
  },
  {
    name: "Data & privacy",
    icon: Database,
    description: "Local ownership, complete backups and controlled sharing.",
  },
  {
    name: "Cloud discovery",
    icon: Cloud,
    description:
      "Optional searches and saved results while the computer is off.",
  },
  {
    name: "Updates & help",
    icon: LifeBuoy,
    description: "Installed version, updates and practical guidance.",
  },
  {
    name: "Feedback",
    icon: MessageSquare,
    description: "Report a problem or suggest an improvement.",
  },
];
export default function SettingsPanel() {
  const w = useWorkshop(),
    { settings: s } = w;
  const [section, setSection] = useState("Appearance"),
    [token, setToken] = useState(""),
    [cloud, setCloud] = useState<any>(null),
    [updates, setUpdates] = useState<any>(null),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [diagnostics, setDiagnostics] = useState(true),
    [reviewed, setReviewed] = useState(false),
    [report, setReport] = useState<any>(null),
    [nativeInfo, setNativeInfo] = useState<any>(null);
  const current = sections.find((v) => v.name === section)!;
  const select = (
    key: "appearance" | "darkPalette" | "lightPalette",
    value: string,
  ) => s.change((v) => ({ ...v, [key]: value }), true);
  return (
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Settings categories">
        {sections.map(({ name, icon: Icon }) => (
          <button
            key={name}
            className={section === name ? "selected" : ""}
            onClick={() => setSection(name)}
          >
            <Icon size={17} />
            {name}
          </button>
        ))}
      </nav>
      <section className="settings-content">
        <div className="page-section-heading">
          <span className="eyebrow">SETTINGS</span>
          <h2>{current.name}</h2>
          <p className="muted">{current.description}</p>
        </div>
        {section === "Appearance" ? (
          <>
            <label>
              Appearance
              <select
                value={s.data.appearance}
                onChange={(e) => select("appearance", e.target.value)}
              >
                <option value="system">Follow system</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <h3>Dark palettes</h3>
            <div className="palette-options">
              {[
                {
                  key: "charcoal",
                  label: "Charcoal",
                  text: "Neutral and focused",
                  colours: ["#17191c", "#22252a", "#eeeff2"],
                },
                {
                  key: "forest",
                  label: "Forest",
                  text: "Quiet green and warm detail",
                  colours: ["#101916", "#1e2c25", "#d5b77c"],
                },
              ].map((p) => (
                <button
                  className={
                    "palette-card " +
                    (s.data.darkPalette === p.key ? "selected" : "")
                  }
                  key={p.key}
                  onClick={() => select("darkPalette", p.key)}
                >
                  <div
                    className="palette-preview"
                    style={{ background: p.colours[0] }}
                  >
                    <i style={{ background: p.colours[1] }} />
                    <i style={{ background: p.colours[2] }} />
                  </div>
                  <strong>
                    {p.label}
                    {s.data.darkPalette === p.key && <Check size={15} />}
                  </strong>
                  <span>{p.text}</span>
                </button>
              ))}
            </div>
            <h3>Light palettes</h3>
            <div className="palette-options">
              {[
                {
                  key: "paper",
                  label: "Paper",
                  text: "Clear neutral surfaces",
                  colours: ["#f6f7f9", "#fff", "#323842"],
                },
                {
                  key: "parchment",
                  label: "Parchment",
                  text: "Warm and understated",
                  colours: ["#f3efe5", "#fffaf0", "#785b24"],
                },
              ].map((p) => (
                <button
                  className={
                    "palette-card " +
                    (s.data.lightPalette === p.key ? "selected" : "")
                  }
                  key={p.key}
                  onClick={() => select("lightPalette", p.key)}
                >
                  <div
                    className="palette-preview"
                    style={{ background: p.colours[0] }}
                  >
                    <i style={{ background: p.colours[1] }} />
                    <i style={{ background: p.colours[2] }} />
                  </div>
                  <strong>
                    {p.label}
                    {s.data.lightPalette === p.key && <Check size={15} />}
                  </strong>
                  <span>{p.text}</span>
                </button>
              ))}
            </div>
            <label>
              Interface text size · {s.data.textSize}
              <input
                type="range"
                min={12}
                max={22}
                value={s.data.textSize}
                onChange={(e) =>
                  s.change((v) => ({ ...v, textSize: Number(e.target.value) }))
                }
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={s.data.reducedMotion}
                onChange={(e) =>
                  s.change(
                    (v) => ({ ...v, reducedMotion: e.target.checked }),
                    true,
                  )
                }
              />
              <span>Reduce interface motion</span>
            </label>
            <p className="muted small">
              Settings apply immediately and save automatically.
            </p>
          </>
        ) : section === "AI & connections" ? (
          <ConnectionPanel />
        ) : section === "Search & routine" ? (
          <>
            <RoutineFields />
            <div className="form-grid">
              <label>
                Document and AI response language
                <input
                  value={s.data.language}
                  onChange={(e) =>
                    s.change((v) => ({ ...v, language: e.target.value }))
                  }
                />
              </label>
              <label>
                Preferred currency code
                <input
                  maxLength={3}
                  value={s.data.currency}
                  onChange={(e) =>
                    s.change((v) => ({
                      ...v,
                      currency: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </label>
            </div>
            <div className="divider" />
            <h3>Recent discovery</h3>
            <dl className="facts">
              <div>
                <dt>Last successful local search</dt>
                <dd>{relativeDate(w.searches.lastSuccessAt)}</dd>
              </div>
              <div>
                <dt>Next local search due</dt>
                <dd>{relativeDate(w.searches.nextDueAt)}</dd>
              </div>
              <div>
                <dt>Current mode</dt>
                <dd>
                  {s.data.cloud.enabled
                    ? "Cloud delivery"
                    : s.data.routine.enabled
                      ? "Local routine"
                      : "Manual searches"}
                </dd>
              </div>
            </dl>
            <div className="run-history">
              {w.searches.runs.slice(0, 8).map((r) => (
                <div key={r.id}>
                  <span
                    className={
                      "badge " + (r.status === "failed" ? "warning" : "")
                    }
                  >
                    {r.status}
                  </span>
                  <div>
                    <strong>{r.stage}</strong>
                    <small>
                      {relativeDate(r.startedAt)} · {r.provider}
                    </small>
                    {r.error && <p className="error-text">{r.error}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : section === "Notifications & background" ? (
          <>
            <label className="check-row">
              <input
                type="checkbox"
                checked={s.data.background}
                onChange={(e) =>
                  s.change(
                    (v) => ({ ...v, background: e.target.checked }),
                    true,
                  )
                }
              />
              <span>
                Keep running when the window closes
                <small>
                  A tray or menu-bar icon provides quick access, search controls
                  and Quit.
                </small>
              </span>
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={s.data.startAtLogin}
                onChange={(e) =>
                  s.change(
                    (v) => ({ ...v, startAtLogin: e.target.checked }),
                    true,
                  )
                }
              />
              <span>Launch at sign-in</span>
            </label>
            <div className="divider" />
            {[
              { key: "jobs", label: "Notify when new jobs are found" },
              {
                key: "reminders",
                label: "Application and follow-up reminders",
              },
              {
                key: "details",
                label: "Include action details in desktop notifications",
              },
            ].map((item) => (
              <label className="check-row" key={item.key}>
                <input
                  type="checkbox"
                  checked={(s.data.notifications as any)[item.key]}
                  onChange={(e) =>
                    s.change(
                      (v) => ({
                        ...v,
                        notifications: {
                          ...v.notifications,
                          [item.key]: e.target.checked,
                        },
                      }),
                      true,
                    )
                  }
                />
                <span>{item.label}</span>
              </label>
            ))}
            <div className="form-grid">
              <label>
                Quiet hours start
                <input
                  type="time"
                  value={s.data.notifications.quietStart}
                  onChange={(e) =>
                    s.change((v) => ({
                      ...v,
                      notifications: {
                        ...v.notifications,
                        quietStart: e.target.value,
                      },
                    }))
                  }
                />
              </label>
              <label>
                Quiet hours end
                <input
                  type="time"
                  value={s.data.notifications.quietEnd}
                  onChange={(e) =>
                    s.change((v) => ({
                      ...v,
                      notifications: {
                        ...v.notifications,
                        quietEnd: e.target.value,
                      },
                    }))
                  }
                />
              </label>
            </div>
            <button
              className="button secondary"
              disabled={!w.desktop}
              onClick={() =>
                void w.act("Checking desktop notifications", async () => {
                  const result =
                    await window.careerDesktop!.requestNotifications();
                  w.notify(
                    result.supported
                      ? "A test notification was requested. Review operating-system notification permissions if it does not appear."
                      : "Desktop notifications are unavailable on this system.",
                  );
                })
              }
            >
              <Bell size={16} />
              Test notifications
            </button>
            <p className="muted small">
              Local work pauses when the computer sleeps. One overdue search
              resumes when it wakes; missed intervals are not replayed.
            </p>
          </>
        ) : section === "Data & privacy" ? (
          <>
            <div className="notice">
              <ShieldCheck size={20} />
              <p>
                Career records, evidence and documents are stored locally by
                default. AI requests send the selected information to the chosen
                provider. The optional cloud inbox receives only the approved
                search brief and delivered results.
              </p>
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={s.data.privacy.allowAI}
                onChange={(e) =>
                  s.change(
                    (v) => ({
                      ...v,
                      privacy: { ...v.privacy, allowAI: e.target.checked },
                    }),
                    true,
                  )
                }
              />
              <span>
                Allow the chosen AI service to process selected career
                information
              </span>
            </label>
            <div className="divider" />
            <h3>Complete backup and restore</h3>
            <p className="muted">
              A backup includes the profile, evidence, opportunities,
              application records, CV source, drafts and generated documents.
              Credentials are excluded. Automatic backups retain the ten most
              recent copies.
            </p>
            <div className="button-row">
              <a className="button" href="/api/backup" download>
                <Download size={16} />
                Download complete backup
              </a>
              <button
                className="button secondary"
                disabled={!!w.busy}
                onClick={() =>
                  void w.act("Creating a local backup", async () => {
                    await api("/api/backup", {});
                    w.notify("A complete local backup was created.");
                  })
                }
              >
                Back up now
              </button>
              <label className="button secondary file-button">
                <Upload size={16} />
                Restore backup
                <input
                  type="file"
                  accept=".zip,application/zip"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (
                      !file ||
                      !confirm(
                        "Restore this complete backup? It replaces the current workspace. A recovery backup will be created first.",
                      )
                    )
                      return;
                    void w.act("Restoring the complete workspace", async () => {
                      const form = new FormData();
                      form.set("file", file);
                      form.set("confirm", "RESTORE");
                      const r = await fetch("/api/backup", {
                        method: "POST",
                        body: form,
                      });
                      const data = await r.json();
                      if (!r.ok) throw new Error(data.error);
                      window.location.reload();
                    });
                  }}
                />
              </label>
              <button
                className="button subtle"
                disabled={!w.desktop}
                onClick={() => void window.careerDesktop?.openData()}
              >
                <FolderOpen size={16} />
                Open data folder
              </button>
            </div>
            <p className="muted small">
              Backup archives contain private career information. Restoring
              validates records and checksums before replacing the workspace.
            </p>
          </>
        ) : section === "Cloud discovery" ? (
          <>
            <div className="notice">
              <Cloud size={20} />
              <p>
                This optional connection lets the provider's native cloud task
                save results while the computer is off. The personal workspace
                remains local. A free private GitHub repository is sufficient.
              </p>
            </div>
            <ol className="setup-steps">
              <li>
                Create a separate private repository for the search brief and
                incoming results.{" "}
                <a
                  href="https://github.com/new"
                  target="_blank"
                  rel="noreferrer"
                >
                  Create repository ↗
                </a>
              </li>
              <li>
                Authorise the AI service to write to that repository. A
                read-only project attachment cannot deliver results.
              </li>
              <li>
                Use a repository-limited GitHub credential with Contents
                read/write for this application's delivery connection.
              </li>
            </ol>
            <div className="form-grid">
              <label>
                Private repository
                <input
                  value={s.data.cloud.repository}
                  onChange={(e) =>
                    s.change((v) => ({
                      ...v,
                      cloud: {
                        ...v.cloud,
                        repository: e.target.value,
                        verified: false,
                      },
                    }))
                  }
                  placeholder="owner/private-inbox"
                />
              </label>
              <label>
                Branch
                <input
                  value={s.data.cloud.branch}
                  onChange={(e) =>
                    s.change((v) => ({
                      ...v,
                      cloud: {
                        ...v.cloud,
                        branch: e.target.value,
                        verified: false,
                      },
                    }))
                  }
                />
              </label>
              <label className="span-two">
                Repository-limited credential
                <input
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Stored only in the local credential store"
                />
              </label>
            </div>
            <button
              className="button secondary"
              disabled={!!w.busy || !token}
              onClick={() =>
                void w.act("Verifying private cloud delivery", async () => {
                  const result = await api("/api/cloud", {
                    action: "verify",
                    token,
                  });
                  setToken("");
                  setCloud(await api("/api/cloud"));
                  w.notify(
                    "The private repository passed a real write-and-read check.",
                  );
                })
              }
            >
              <ShieldCheck size={16} />
              Verify private connection
            </button>
            <label className="check-row">
              <input
                type="checkbox"
                checked={s.data.cloud.publishCapability}
                onChange={(e) =>
                  s.change(
                    (v) => ({
                      ...v,
                      cloud: {
                        ...v.cloud,
                        publishCapability: e.target.checked,
                      },
                    }),
                    true,
                  )
                }
              />
              <span>
                Include confirmed capability evidence in the cloud search brief
                <small>
                  Without this, the cloud task can match preferences but has
                  less evidence to assess candidacy. Contact details and the
                  original CV file are excluded.
                </small>
              </span>
            </label>
            <div className="button-row">
              <button
                className="button secondary"
                disabled={!!w.busy || !s.data.cloud.verified}
                onClick={() =>
                  void w.act(
                    "Publishing the approved search brief",
                    async () => {
                      await api("/api/cloud", { action: "publish" });
                      setCloud(await api("/api/cloud"));
                      w.notify(
                        "The selected search brief was published to the private repository.",
                      );
                    },
                  )
                }
              >
                Publish selected brief
              </button>
              <button
                className="button secondary"
                disabled={!!w.busy || !s.data.cloud.verified}
                onClick={() =>
                  void w.act("Checking incoming cloud results", async () => {
                    const result = await api("/api/cloud", {
                      action: "import",
                    });
                    setCloud(await api("/api/cloud"));
                    w.notify(result.message);
                  })
                }
              >
                <RefreshCw size={16} />
                Check delivery
              </button>
              <button
                className="button subtle"
                onClick={() =>
                  void w.act(
                    "Preparing provider scheduling instructions",
                    async () => setCloud(await api("/api/cloud")),
                  )
                }
              >
                Show scheduling instructions
              </button>
            </div>
            {cloud?.instructions && (
              <div className="copy-block">
                <p>
                  Create and confirm the actual schedule in the AI service. This
                  application does not mark a schedule active merely because
                  these instructions exist.
                </p>
                <textarea
                  aria-label="Cloud scheduling instructions"
                  readOnly
                  rows={9}
                  value={cloud.instructions}
                />
                <button
                  className="button subtle"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(cloud.instructions)
                      .then(() => w.notify("Scheduling instructions copied."))
                  }
                >
                  <Copy size={16} />
                  Copy instructions
                </button>
              </div>
            )}
            <label className="check-row">
              <input
                type="checkbox"
                checked={s.data.cloud.enabled}
                disabled={
                  !s.data.cloud.verified ||
                  !w.searches.runs.some((r) => r.kind === "cloud")
                }
                onChange={(e) =>
                  s.change(
                    (v) => ({
                      ...v,
                      cloud: { ...v.cloud, enabled: e.target.checked },
                    }),
                    true,
                  )
                }
              />
              <span>
                Use cloud delivery for periodic discovery
                <small>
                  Available after the first delivered result has been imported.
                  This replaces the local periodic search to avoid duplicate
                  runs.
                </small>
              </span>
            </label>
            <button
              className="text-button danger"
              disabled={!!w.busy}
              onClick={() =>
                void w.act("Disconnecting cloud delivery", async () => {
                  await api("/api/cloud", { action: "disconnect" });
                  setToken("");
                  setCloud(null);
                  w.notify(
                    "Cloud delivery disconnected here. Pause or delete its native schedule in the AI service as well.",
                  );
                })
              }
            >
              Disconnect cloud inbox
            </button>
          </>
        ) : section === "Updates & help" ? (
          <>
            <div className="version-card">
              <span className="app-mark">CW</span>
              <div>
                <h3>Career Workshop</h3>
                <p className="muted">
                  Version {w.version} · private local workspace
                </p>
              </div>
            </div>
            <div className="button-row">
              <button
                className="button secondary"
                disabled={!!w.busy}
                onClick={() =>
                  void w.act("Checking published releases", async () =>
                    setUpdates(await api("/api/updates")),
                  )
                }
              >
                <RefreshCw size={16} />
                Check for updates
              </button>
              <button
                className="button subtle"
                disabled={!w.desktop}
                onClick={() =>
                  void window.careerDesktop?.info().then(setNativeInfo)
                }
              >
                Show installation details
              </button>
            </div>
            {updates && (
              <div className="notice">
                <div>
                  <strong>
                    {updates.available
                      ? "A different release is available"
                      : updates.message || "This is the current release"}
                  </strong>
                  {updates.latest && <p>{updates.latest}</p>}
                  {updates.url && (
                    <button
                      className="text-button"
                      onClick={() => void external(updates.url)}
                    >
                      Open installer and release notes ↗
                    </button>
                  )}
                  <p className="small muted">
                    Install the new version normally. Personal records are
                    stored separately and retained.
                  </p>
                </div>
              </div>
            )}
            {nativeInfo && (
              <dl className="facts">
                <div>
                  <dt>Platform</dt>
                  <dd>{nativeInfo.platform}</dd>
                </div>
                <div>
                  <dt>Workspace folder</dt>
                  <dd className="break-word">{nativeInfo.dataDirectory}</dd>
                </div>
              </dl>
            )}
            <div className="divider" />
            <h3>A few useful boundaries</h3>
            <ul className="help-list">
              <li>
                Keep related conversations in a dedicated career project. The
                current saved records remain authoritative.
              </li>
              <li>
                Use Search now for a fresh run, or enable the approved routine
                for background discovery.
              </li>
              <li>
                A listing's availability is independent of its application
                stage.
              </li>
              <li>
                Application drafts and PDFs require review. The application does
                not submit them or contact employers.
              </li>
              <li>
                Use the tray or menu-bar Quit action to stop local background
                work.
              </li>
              <li>
                AI limits and capabilities depend on the provider and account.
                No separately billed API fallback is enabled.
              </li>
            </ul>
            <a
              href="https://github.com/FREQ-EE/career-workspace"
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              Documentation and source <ArrowUpRight size={15} />
            </a>
          </>
        ) : (
          <>
            <div className="notice">
              <MessageSquare size={20} />
              <p>
                Reports submitted to the public GitHub repository are public.
                Review the text and exclude personal career information,
                credentials and private document contents.
              </p>
            </div>
            <label>
              Short title
              <input
                maxLength={200}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setReviewed(false);
                }}
                placeholder="Describe the issue or suggestion"
              />
            </label>
            <label>
              What happened, and what was expected?
              <textarea
                rows={8}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setReviewed(false);
                }}
                placeholder="Include useful steps to reproduce a problem…"
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={diagnostics}
                onChange={(e) => setDiagnostics(e.target.checked)}
              />
              <span>
                Include application version and system type
                <small>
                  Career records, account details, credentials and connection
                  tokens are excluded.
                </small>
              </span>
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              <span>
                I have reviewed the report and understand that it will be
                public.
              </span>
            </label>
            <button
              className="button"
              disabled={!reviewed || !title.trim() || !body.trim() || !!w.busy}
              onClick={() =>
                void w.act("Preparing the public report", async () => {
                  const result = await api("/api/feedback", {
                    title,
                    body,
                    diagnostics,
                  });
                  setReport(result);
                  await external(result.url);
                  w.notify(
                    "The prepared report is open on GitHub. Review and submit it there; it has not been posted automatically.",
                  );
                })
              }
            >
              Review and submit on GitHub
              <ArrowUpRight size={16} />
            </button>
            {report && (
              <p className="muted small">
                The report was prepared. GitHub sign-in and final submission
                happen in the browser.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
