import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { readJSON } from "./storage-backend";
import { mutateRecord } from "./records";
import {
  activeSearch,
  startSearch,
  buildSearchBrief,
  briefRevision,
  cancelSearch,
  waitForSearch,
} from "./search";
import { stopProviders } from "./providers";
import { saveAutomaticBackup } from "./backups";
import {
  publishSearchBrief,
  importCloudResults,
  cloudStatus,
} from "./cloud-inbox";
import { config } from "./runtime";
import type { Settings, Searches, Journey, Profile, CV } from "./career";
import type { Workspace } from "./model";
type State = {
  timer?: ReturnType<typeof setInterval>;
  busy: boolean;
  lastTick: string;
  lastError: string;
  lastBackup: string;
  lastCloud: number;
  lastPublished: string;
  notified: string[];
  lastRun: string;
};
const key = Symbol.for("career-workshop.background");
const state: State = ((globalThis as any)[key] ??= {
  busy: false,
  lastTick: "",
  lastError: "",
  lastBackup: "",
  lastCloud: 0,
  lastPublished: "",
  notified: [],
  lastRun: "",
});
export function backgroundStatus() {
  return {
    running: !!state.timer,
    lastTick: state.lastTick,
    lastError: state.lastError,
    lastBackup: state.lastBackup,
  };
}
export async function stopBackground() {
  if (state.timer) clearInterval(state.timer);
  state.timer = undefined;
  cancelSearch();
  await stopProviders();
  await waitForSearch();
  for (let n = 0; state.busy && n < 100; n++)
    await new Promise((r) => setTimeout(r, 100));
}
export function quietNow(settings: Settings, date = new Date()) {
  let time: string;
  try {
    time = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: settings.timezone || undefined,
    }).format(date);
  } catch {
    time = date.toISOString().slice(11, 16);
  }
  const start = settings.notifications.quietStart,
    end = settings.notifications.quietEnd;
  return start === end
    ? false
    : start < end
      ? time >= start && time < end
      : time >= start || time < end;
}
async function desktop(action: unknown) {
  const bridge = config("CW_SECRET_BRIDGE"),
    token = config("CW_DESKTOP_TOKEN");
  if (!bridge || !token) return;
  await fetch(bridge + "/native", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(action),
    signal: AbortSignal.timeout(5000),
  }).catch(() => {});
}
async function notify(settings: Settings, title: string, body: string) {
  if (quietNow(settings)) return false;
  await desktop({ action: "notify", title, body });
  return true;
}
export async function backgroundTick() {
  if (state.busy) return backgroundStatus();
  state.busy = true;
  try {
    const [
      { data: settings },
      { data: searches },
      { data: journey },
      { data: workspace },
    ] = await Promise.all([
      readJSON<Settings>("data/settings.json"),
      readJSON<Searches>("data/searches.json"),
      readJSON<Journey>("data/journey.json"),
      readJSON<Workspace>("data/workspace.json"),
    ]);
    await desktop({
      action: "preferences",
      background: settings.background,
      startAtLogin: settings.startAtLogin,
    });
    const latest = searches.runs.find(
      (r) => r.status === "succeeded" && r.finishedAt,
    );
    if (latest && latest.id !== state.lastRun) {
      if (latest.added > 0 && settings.notifications.jobs) {
        if (
          await notify(
            settings,
            "New career opportunities",
            settings.notifications.details
              ? `${latest.added} new vacancies are ready for review.`
              : "New opportunities are ready in the inbox.",
          )
        )
          state.lastRun = latest.id;
      } else state.lastRun = latest.id;
    }
    let today: string;
    try {
      today = new Intl.DateTimeFormat("en-CA", {
        timeZone: settings.timezone || undefined,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch {
      today = new Date().toISOString().slice(0, 10);
    }
    if (settings.notifications.reminders) {
      const due = workspace.tasks.filter(
          (t) => !t.done && t.due && t.due <= today,
        ),
        marker = "reminder-" + today;
      if (due.length && !state.notified.includes(marker)) {
        if (
          await notify(
            settings,
            "Career Workshop reminder",
            settings.notifications.details
              ? `${due.length} action${due.length === 1 ? " is" : "s are"} due, including ${due[0].title}.`
              : "Career actions are due. Open the workspace to review them.",
          )
        )
          state.notified.push(marker);
      }
    }
    if (journey.complete && state.lastBackup !== today && !activeSearch()) {
      await saveAutomaticBackup();
      state.lastBackup = today;
    }
    let useCloud = false;
    if (settings.cloud.enabled && settings.cloud.verified) {
      const connection = await cloudStatus();
      useCloud =
        connection.repository === settings.cloud.repository &&
        !!connection.verifiedAt;
      if (useCloud && Date.now() - state.lastCloud > 10 * 60_000) {
        state.lastCloud = Date.now();
        const [{ data: profile }, { data: cv }] = await Promise.all([
          readJSON<Profile>("data/profile.json"),
          readJSON<CV>("career/cv.json"),
        ]);
        const revision = briefRevision(
          buildSearchBrief(
            profile,
            cv,
            journey,
            settings,
            settings.cloud.publishCapability,
          ),
        );
        if (revision !== state.lastPublished) {
          await publishSearchBrief();
          state.lastPublished = revision;
        }
        await importCloudResults();
      }
    }
    if (
      !useCloud &&
      journey.complete &&
      settings.routine.enabled &&
      settings.privacy.backgroundAI &&
      !activeSearch()
    ) {
      if (!searches.nextDueAt && !settings.routine.searchOnLaunch)
        await mutateRecord<Searches>("data/searches.json", (s) => {
          s.nextDueAt = new Date(
            Date.now() + settings.routine.intervalHours * 3600_000,
          ).toISOString();
          return s;
        });
      else if (
        !searches.nextDueAt ||
        Date.parse(searches.nextDueAt) <= Date.now()
      )
        await startSearch("scheduled");
    }
    state.lastTick = new Date().toISOString();
    state.lastError = "";
    const runtime = config("CW_RUNTIME_DIRECTORY");
    if (runtime) {
      await mkdir(runtime, { recursive: true, mode: 0o700 });
      await writeFile(
        join(runtime, "background.json"),
        JSON.stringify({
          lastBackup: state.lastBackup,
          notified: state.notified.slice(-30),
          lastRun: state.lastRun,
        }),
        { mode: 0o600 },
      );
    }
  } catch (error) {
    state.lastError =
      error instanceof Error
        ? error.message
        : "A background task needs attention.";
  } finally {
    state.busy = false;
  }
  return backgroundStatus();
}
export async function startBackground() {
  if (
    state.timer ||
    config("CW_SERVER_ACTIVE") !== "1" ||
    config("APP_RUNTIME") === "sites"
  )
    return;
  const runtime = config("CW_RUNTIME_DIRECTORY");
  if (runtime) {
    try {
      const previous = JSON.parse(
        await readFile(join(runtime, "background.json"), "utf8"),
      );
      state.lastBackup = previous.lastBackup || "";
      state.notified = previous.notified || [];
      state.lastRun = previous.lastRun || "";
    } catch {}
  }
  state.timer = setInterval(() => void backgroundTick(), 60_000);
  state.timer.unref();
  void backgroundTick();
}
