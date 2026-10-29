"use client";
import { useState } from "react";
import {
  CheckCircle2,
  Link2,
  ShieldCheck,
  ArrowUpRight,
  RefreshCw,
  Download,
} from "lucide-react";
import { useWorkshop, api, external, download } from "./state";
export function ConnectionPanel() {
  const {
    settings,
    connections,
    loadConnections,
    act,
    busy,
    notify,
    desktop,
    settle,
  } = useWorkshop();
  const [models, setModels] = useState<any[]>([]),
    [login, setLogin] = useState("");
  const provider = settings.data.provider;
  async function connect() {
    await act("Opening provider sign-in", async () => {
      const result = await api("/api/connections", {
        action: "connect",
        provider,
      });
      if (result.url) {
        setLogin(result.url);
        await external(result.url);
      }
      notify(
        "Complete sign-in in the provider window, then check the connection here.",
      );
    });
  }
  return (
    <div className="connection-panel">
      <div className="provider-choices">
        {[
          {
            id: "chatgpt",
            label: "ChatGPT",
            text: "Use an eligible existing ChatGPT plan.",
          },
          {
            id: "claude",
            label: "Claude",
            text: "Use your Claude subscription through the official helper.",
          },
        ].map((p) => (
          <button
            key={p.id}
            className={
              "provider-choice " + (provider === p.id ? "selected" : "")
            }
            onClick={() =>
              settings.change(
                (s) => ({
                  ...s,
                  provider: p.id as "chatgpt" | "claude",
                  model: "",
                }),
                true,
              )
            }
          >
            <span className="provider-symbol">
              {p.id === "chatgpt" ? "◉" : "✳"}
            </span>
            <strong>{p.label}</strong>
            <span>{p.text}</span>
            {provider === p.id && <CheckCircle2 size={17} />}
          </button>
        ))}
      </div>
      <p className="muted small">
        The connection uses your own account. Subscription limits are shared
        with other use. Disable paid extra usage in the provider's account
        settings to keep a fixed subscription budget.
      </p>
      <label className="check-row">
        <input
          type="checkbox"
          checked={settings.data.privacy.allowAI}
          onChange={(e) =>
            settings.change(
              (s) => ({
                ...s,
                privacy: { ...s.privacy, allowAI: e.target.checked },
              }),
              true,
            )
          }
        />
        <span>
          Allow the selected career information and documents to be sent to the
          chosen AI service.
          <small>
            Stored records remain in this workspace. Search tasks receive the
            approved direction, constraints and evidence needed to assess
            vacancies.
          </small>
        </span>
      </label>
      {provider && (
        <div className="connection-status">
          <div>
            <span
              className={
                "status-dot " +
                (connections?.[provider]?.verified ? "success" : "")
              }
            />
            <strong>
              {connections?.[provider]?.verified
                ? "AI tasks verified"
                : connections?.[provider]?.connected
                  ? "Signed in · test required"
                  : "Connection needed"}
            </strong>
            {connections?.[provider]?.account && (
              <span className="muted small">
                {connections[provider].account}
              </span>
            )}
          </div>
          <div className="button-row">
            <button
              className="button"
              disabled={!!busy || !settings.data.privacy.allowAI}
              onClick={() => void connect()}
            >
              <Link2 size={16} />
              {connections?.[provider]?.connected
                ? "Reconnect"
                : "Connect " + (provider === "chatgpt" ? "ChatGPT" : "Claude")}
            </button>
            <button
              className="button secondary"
              disabled={!!busy || !settings.data.privacy.allowAI}
              onClick={() =>
                void act("Testing the AI connection", async () => {
                  await api("/api/connections", { action: "verify", provider });
                  await loadConnections();
                  notify("A real AI request completed successfully.");
                })
              }
            >
              <ShieldCheck size={16} />
              Test connection
            </button>
            <button
              className="icon-button"
              aria-label="Refresh connection status"
              onClick={() => void loadConnections()}
            >
              <RefreshCw size={16} />
            </button>
          </div>
          {login && (
            <a
              className="text-link"
              href={login}
              target="_blank"
              rel="noreferrer"
            >
              Continue sign-in <ArrowUpRight size={14} />
            </a>
          )}
          {provider === "claude" && connections?.claude?.message && (
            <p className="muted small">{connections.claude.message}</p>
          )}
          {provider === "chatgpt" && connections?.chatgpt?.connected && (
            <>
              <button
                className="text-button"
                onClick={() =>
                  void act("Loading available models", async () =>
                    setModels(
                      (
                        await api("/api/connections", {
                          action: "models",
                          provider,
                        })
                      ).models,
                    ),
                  )
                }
              >
                Choose an available model
              </button>
              {models.length > 0 && (
                <label>
                  Model
                  <select
                    value={settings.data.model}
                    onChange={(e) =>
                      settings.change(
                        (s) => ({ ...s, model: e.target.value }),
                        true,
                      )
                    }
                  >
                    <option value="">Account default</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
          <button
            className="text-button muted"
            disabled={!!busy}
            onClick={() =>
              void act("Disconnecting the AI", async () => {
                const result = await api("/api/connections", {
                  action: "disconnect",
                  provider,
                });
                await loadConnections();
                notify(
                  result.revoked === false
                    ? "Disconnected locally. Remote revocation was not confirmed; review the connection in ChatGPT settings."
                    : "Disconnected.",
                );
              })
            }
          >
            Disconnect
          </button>
        </div>
      )}
      {!desktop && (
        <p className="notice small">
          In this browser session, AI credentials are kept in memory. The
          installed desktop application uses the operating-system credential
          store.
        </p>
      )}
      <div className="divider" />
      <h3>Connect conversations to the workspace</h3>
      <p className="muted">
        Use a compatible AI desktop application for direct local MCP access.
        Keep related conversations in one career project; the connector reads
        the latest saved records each time.
      </p>
      <div className="button-row">
        <button
          className="button secondary"
          disabled={!provider || !desktop}
          onClick={() =>
            void act("Installing the conversation connector", async () => {
              await settle();
              const result = await window.careerDesktop!.configureMcp(provider);
              notify(result.message);
            })
          }
        >
          <Link2 size={16} />
          Install local conversation connector
        </button>
        <button
          className="button subtle"
          onClick={() =>
            download("Career-Workshop-Project-Guide.md", projectGuide)
          }
        >
          <Download size={16} />
          Project guide
        </button>
      </div>
      <p className="muted small">
        Restart the AI desktop application after installing the connector. Ask
        it to read the profile and career contract. This step grants access to
        career records; it does not share your entire computer.
      </p>
    </div>
  );
}
export const projectGuide = `# My Career Workshop project\n\nUse the connected Career Workshop MCP tools as the source of truth. Begin with career_contract, then read the current profile, CV, workspace and settings relevant to the request. Read fresh records before each new task.\n\nHelp me build an evidence-based profile, choose a direction, specify constraints, calibrate against actual vacancies and review a realistic routine. Ask one useful question at a time. Distinguish verified facts, unknowns, proposals and aspirations. Record only facts I confirm or facts verified from an attributable source.\n\nAssess desirable work separately from demonstrated capability. Show gaps without inventing achievements or qualifications. Respect my non-negotiable requirements and exclusions. Keep unknown salaries and languages unknown. Verify employer listings and avoid duplicates. Preserve application stages and notes.\n\nUse small career_edit patches after reading current before values. Preserve unrelated fields. An Applied stage requires my explicit statement that I submitted the application. Do not submit applications, contact employers, change privacy permissions or enable separately billed services.\n\nKeep this project's conversations together for context, while confirmed records and decisions remain saved in the workspace. Configure schedules through the application's routine setup and the AI service's actual scheduling interface; never claim that configuration text alone created a task.\n`;
