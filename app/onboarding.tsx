"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  FileUp,
  Search,
  LoaderCircle,
  Sparkles,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Modal, Empty } from "./ui";
import { useWorkshop, api } from "./state";
import { ConnectionPanel } from "./connections";
import { ProfileFields, Interview } from "./profile-fields";
import CVEditor from "./documents/cv-studio";
import type { CV } from "@/lib/career";
const steps = [
  "Connect AI",
  "Evidence",
  "Direction",
  "Constraints",
  "Calibration",
  "Routine",
];
export function RoutineFields() {
  const { settings } = useWorkshop(),
    s = settings.data;
  return (
    <>
      <label className="check-row">
        <input
          type="checkbox"
          checked={s.routine.enabled && s.privacy.backgroundAI}
          onChange={(e) =>
            settings.change(
              (v) => ({
                ...v,
                routine: { ...v.routine, enabled: e.target.checked },
                privacy: { ...v.privacy, backgroundAI: e.target.checked },
              }),
              true,
            )
          }
        />
        <span>
          Allow periodic job searches using the connected AI plan
          <small>
            Searches use the approved profile and criteria. They stop when the
            included allowance is unavailable.
          </small>
        </span>
      </label>
      <div className="form-grid">
        <label>
          Search frequency
          <select
            value={s.routine.intervalHours}
            onChange={(e) =>
              settings.change(
                (v) => ({
                  ...v,
                  routine: {
                    ...v.routine,
                    intervalHours: Number(e.target.value),
                  },
                }),
                true,
              )
            }
          >
            {[1, 6, 12, 24, 48, 168].map((n) => (
              <option value={n} key={n}>
                {n === 168 ? "Weekly" : n === 24 ? "Daily" : `Every ${n} hours`}
              </option>
            ))}
          </select>
        </label>
        <label>
          Maximum new jobs per search
          <input
            type="number"
            min={1}
            max={20}
            value={s.routine.maxNew}
            onChange={(e) =>
              settings.change((v) => ({
                ...v,
                routine: {
                  ...v.routine,
                  maxNew: Math.max(
                    1,
                    Math.min(20, Number(e.target.value) || 1),
                  ),
                },
              }))
            }
          />
        </label>
        <label>
          Daily application time · minutes
          <input
            type="number"
            min={0}
            max={480}
            step={15}
            value={s.routine.applicationMinutes}
            onChange={(e) =>
              settings.change((v) => ({
                ...v,
                routine: {
                  ...v.routine,
                  applicationMinutes: Math.max(
                    0,
                    Math.min(480, Number(e.target.value) || 0),
                  ),
                },
              }))
            }
          />
        </label>
        <label>
          Review every · days
          <input
            type="number"
            min={1}
            max={90}
            value={s.routine.reviewDays}
            onChange={(e) =>
              settings.change((v) => ({
                ...v,
                routine: {
                  ...v.routine,
                  reviewDays: Math.max(
                    1,
                    Math.min(90, Number(e.target.value) || 1),
                  ),
                },
              }))
            }
          />
        </label>
        <label>
          Timezone
          <input
            value={s.timezone}
            onChange={(e) =>
              settings.change((v) => ({ ...v, timezone: e.target.value }))
            }
          />
        </label>
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={s.routine.searchOnLaunch}
          onChange={(e) =>
            settings.change(
              (v) => ({
                ...v,
                routine: { ...v.routine, searchOnLaunch: e.target.checked },
              }),
              true,
            )
          }
        />
        <span>Run an overdue search when the application starts</span>
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={s.background}
          onChange={(e) =>
            settings.change(
              (v) => ({ ...v, background: e.target.checked }),
              true,
            )
          }
        />
        <span>
          Keep working in the tray or menu bar when the window closes
          <small>
            The computer must remain awake and online for local work.
          </small>
        </span>
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={s.startAtLogin}
          onChange={(e) =>
            settings.change(
              (v) => ({ ...v, startAtLogin: e.target.checked }),
              true,
            )
          }
        />
        <span>Start Career Workshop when signing in to the computer</span>
      </label>
    </>
  );
}
export function EvidenceImport() {
  const { journey, act, busy, notify } = useWorkshop();
  const [text, setText] = useState(""),
    [url, setURL] = useState(""),
    [file, setFile] = useState<File | null>(null);
  const control = useRef<AbortController | null>(null);
  async function extract(chosen?: File) {
    await act("Extracting an evidence draft", async () => {
      const form = new FormData();
      if (chosen || file) form.set("file", chosen || file!);
      form.set("text", text);
      form.set("url", url);
      control.current = new AbortController();
      try {
        const r = await fetch("/api/import", {
          method: "POST",
          body: form,
          signal: control.current.signal,
        });
        const result = await r.json();
        if (!r.ok) throw new Error(result.error);
        setFile(null);
        setText("");
        setURL("");
        notify(
          "A draft is ready. Review the extracted facts before using them.",
        );
      } finally {
        control.current = null;
      }
    });
  }
  return (
    <>
      <div
        className="drop-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) {
            setFile(f);
            void extract(f);
          }
        }}
      >
        <FileUp size={30} strokeWidth={1.4} />
        <h3>Start with the evidence already available</h3>
        <p>
          Drop a CV PDF here, or choose a file. The AI prepares a draft for
          review.
        </p>
        <label className="button secondary file-button">
          Choose PDF
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setFile(f);
                void extract(f);
              }
              e.target.value = "";
            }}
            disabled={!!busy}
          />
        </label>
        <span className="muted small">
          PDFs up to 10 MB · confirmed records stay unchanged during extraction
        </span>
      </div>
      <details className="disclosure">
        <summary>Use a LinkedIn profile or pasted text</summary>
        <label>
          LinkedIn profile URL
          <input
            type="url"
            value={url}
            onChange={(e) => setURL(e.target.value)}
            placeholder="https://www.linkedin.com/in/…"
          />
        </label>
        <p className="muted small">
          If the full profile cannot be read, use an exported PDF or paste the
          text.
        </p>
        <label>
          CV or profile text
          <textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the source information…"
          />
        </label>
        <button
          className="button secondary"
          disabled={!!busy || (!url && !text && !file)}
          onClick={() => void extract()}
        >
          <Sparkles size={16} />
          Extract a draft
        </button>
      </details>
      {busy === "Extracting an evidence draft" && (
        <div className="notice">
          <LoaderCircle className="spin" size={17} />
          Reading the supplied information…
          <button
            className="text-button"
            onClick={() => control.current?.abort()}
          >
            Cancel
          </button>
        </div>
      )}
      {journey.data.draft && (
        <section className="import-review">
          <div className="section-heading">
            <div>
              <span className="eyebrow">UNCONFIRMED DRAFT</span>
              <h3>Review the extracted evidence</h3>
            </div>
            <span className="badge">{journey.data.draft.source?.name}</span>
          </div>
          {journey.data.draft.uncertainties?.length > 0 && (
            <div className="notice">
              <div>
                <strong>Needs review</strong>
                <ul>
                  {journey.data.draft.uncertainties.map(
                    (v: string, i: number) => (
                      <li key={i}>{v}</li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          )}
          <CVEditor
            value={journey.data.draft.cv as CV}
            onChange={(fn) =>
              journey.change((j) => {
                j.draft!.cv = fn(j.draft!.cv as CV);
                return j;
              })
            }
          />
          <div className="button-row">
            <button
              className="button"
              disabled={!!busy}
              onClick={() =>
                void act("Confirming reviewed evidence", async () => {
                  await api("/api/actions", { action: "confirm-evidence" });
                  notify(
                    "Reviewed evidence is now saved to the profile and CV source.",
                  );
                })
              }
            >
              <Check size={16} />
              Use reviewed evidence
            </button>
            <button
              className="button subtle"
              onClick={() =>
                journey.change((j) => ({ ...j, draft: null }), true)
              }
            >
              Discard draft
            </button>
          </div>
        </section>
      )}
    </>
  );
}
export function Calibration() {
  const { workspace, journey, search, active, searches, busy } = useWorkshop();
  const last = searches.runs.find((r) => r.kind === "calibration"),
    items = workspace.data.opportunities
      .filter((o) => !o.discoveryRunId || o.discoveryRunId === last?.id)
      .slice(-5);
  return (
    <>
      <div className="section-heading">
        <div>
          <h3>Compare the system's judgement with yours</h3>
          <p className="muted">
            Interest and credible capability are separate. Correct either
            without needing a numerical rating.
          </p>
        </div>
        <button
          className="button secondary"
          disabled={!!active || !!busy}
          onClick={() => void search("calibration")}
        >
          <Search size={16} />
          {last ? "Find another set" : "Find five vacancies"}
        </button>
      </div>
      {active && (
        <div className="notice">
          <LoaderCircle size={18} className="spin" />
          {active.stage}…
        </div>
      )}
      {!items.length && !active && (
        <Empty
          title={
            last?.status === "succeeded"
              ? "No matching vacancies found"
              : "Use real vacancies to calibrate"
          }
        >
          A search may return fewer than five suitable roles. Results are never
          invented to fill the set.
        </Empty>
      )}
      {items.map((item) => {
        const rating = journey.data.calibration.find((r) => r.id === item.id);
        function change(key: string, value: string) {
          journey.change((j) => {
            let row = j.calibration.find((r) => r.id === item.id);
            if (!row) {
              row = {
                id: item.id,
                interest: "",
                accuracy: "",
                reason: "",
                context: {
                  company: item.company,
                  title: item.title,
                  fit: item.fit,
                  gaps: item.gaps,
                  goalScore: item.goalScore ?? null,
                  capabilityScore: item.capabilityScore ?? null,
                },
              };
              j.calibration.push(row);
            }
            (row as any)[key] = value;
            return j;
          }, key !== "reason");
        }
        return (
          <article className="calibration-card" key={item.id}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">{item.company}</span>
                <h3>{item.title}</h3>
                <span className="muted small">
                  {item.location} · {item.assessment}
                </span>
              </div>
              <a
                href={item.source}
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                Employer page ↗
              </a>
            </div>
            <div className="assessment-grid">
              <div>
                <span className="small muted">Why it could fit</span>
                <p>{item.fit}</p>
              </div>
              <div>
                <span className="small muted">Gaps and uncertainty</span>
                <p>
                  {item.gaps ||
                    "No specific gap was recorded; review requirements carefully."}
                </p>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Would this work interest you?
                <select
                  value={rating?.interest || ""}
                  onChange={(e) => change("interest", e.target.value)}
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {["Interested", "Maybe", "No"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                How accurate is the capability assessment?
                <select
                  value={rating?.accuracy || ""}
                  onChange={(e) => change("accuracy", e.target.value)}
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {["Accurate", "Too optimistic", "Too cautious"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="span-two">
                What should change? · optional
                <input
                  value={rating?.reason || ""}
                  onChange={(e) => change("reason", e.target.value)}
                />
              </label>
            </div>
          </article>
        );
      })}
    </>
  );
}
export default function Onboarding({ onClose }: { onClose: () => void }) {
  const {
    journey,
    settings,
    connections,
    act,
    busy,
    active,
    search,
    searches,
    notify,
  } = useWorkshop();
  const step = journey.data.step < 6 ? journey.data.step : 0,
    started = useRef(false);
  useEffect(() => {
    if (
      step === 4 &&
      !started.current &&
      !active &&
      !searches.runs.some((r) => r.kind === "calibration")
    ) {
      started.current = true;
      void search("calibration");
    }
  }, [step]);
  async function next() {
    await act("Saving onboarding progress", async () => {
      if (step === 5) {
        await api("/api/actions", { action: "finish-onboarding" });
        notify(
          "The workspace is ready. The routine uses the confirmed criteria.",
        );
        onClose();
        return;
      }
      if (step === 0 && !connections?.[settings.data.provider]?.verified)
        throw new Error(
          "Connect the chosen provider and complete its real connection test first.",
        );
      if (step === 1 && journey.data.draft)
        throw new Error("Use or discard the imported draft before continuing.");
      const names = [
        "provider",
        "evidence",
        "direction",
        "constraints",
        "calibration",
      ];
      await api("/api/actions", { action: "confirm-step", step: names[step] });
      journey.change((j) => {
        j.step = step + 1;
        return j;
      }, true);
      await journey.settled();
    });
  }
  return (
    <Modal title="Set up your career workspace" onClose={onClose} wide>
      <div className="onboarding-progress" aria-label="Onboarding progress">
        {steps.map((label, index) => (
          <div
            key={label}
            className={
              index === step ? "current" : index < step ? "complete" : ""
            }
          >
            <span>{index < step ? <Check size={13} /> : index + 1}</span>
            <small>{label}</small>
          </div>
        ))}
      </div>
      <div className="onboarding-body">
        <span className="eyebrow">STEP {step + 1} OF 6</span>
        <h1>
          {
            [
              "Connect the intelligence. Keep ownership.",
              "Build an accurate picture.",
              "Choose a deliberate direction.",
              "Define what works in practice.",
              "Make the assessments your own.",
              "Set a sustainable routine.",
            ][step]
          }
        </h1>
        <p className="lede">
          {
            [
              "Choose the AI service already used and review the connection before sharing any evidence.",
              "Import existing evidence or enter it below. Unknown facts can remain unknown.",
              "Describe the responsibilities, environments and progress that matter.",
              "Separate non-negotiable requirements from preferences that allow exceptions.",
              "Review real vacancies and correct how the search interprets interest and capability.",
              "Choose when to search, when to focus and how the application can work in the background.",
            ][step]
          }
        </p>
        {step === 0 ? (
          <ConnectionPanel />
        ) : step === 1 ? (
          <>
            <EvidenceImport />
            <ProfileFields groups={["identity", "employment", "capability"]} />
            <Interview step="evidence" />
          </>
        ) : step === 2 ? (
          <>
            <ProfileFields groups={["direction"]} />
            <Interview step="direction" />
          </>
        ) : step === 3 ? (
          <>
            <ProfileFields groups={["search"]} />
            <Interview step="constraints" />
          </>
        ) : step === 4 ? (
          <Calibration />
        ) : (
          <>
            <RoutineFields />
            <div className="notice">
              <Clock size={18} />
              <p>
                Local discovery runs while this application is running and the
                computer is awake. Optional discovery while the computer is off
                can be connected later in Settings.
              </p>
            </div>
          </>
        )}
      </div>
      <footer className="onboarding-footer">
        <button
          className="button subtle"
          disabled={!!busy || step === 0}
          onClick={() =>
            journey.change((j) => ({ ...j, step: Math.max(0, step - 1) }), true)
          }
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <span className="muted small">
          Progress saves automatically. Continue later at any time.
        </span>
        <button
          className="button"
          disabled={!!busy || (!!active && step === 4)}
          onClick={() => void next()}
        >
          {busy ? (
            <LoaderCircle size={16} className="spin" />
          ) : step === 5 ? (
            <ShieldCheck size={16} />
          ) : null}
          {step === 5 ? "Finish setup" : "Review and continue"}
          <ArrowRight size={16} />
        </button>
      </footer>
    </Modal>
  );
}
