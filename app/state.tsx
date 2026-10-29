"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAutosave } from "@/lib/use-autosave";
import {
  recordPaths,
  type Settings,
  type CV,
  type Profile,
  type Journey,
  type Documents,
  type Searches,
} from "@/lib/career";
import {
  type Workspace,
  type Opportunity,
  validateWorkspace,
} from "@/lib/model";
import initialSettings from "@/data/settings.json";
import initialProfile from "@/data/profile.json";
import initialCV from "@/career/cv.json";
import initialJourney from "@/data/journey.json";
import initialDocuments from "@/data/documents.json";
import initialSearches from "@/data/searches.json";
export async function api(path: string, body?: unknown, method = "POST") {
  const response = await fetch(
    path,
    body === undefined
      ? { cache: "no-store" }
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "The request could not complete.");
  return data;
}
export function download(name: string, value: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function external(url: string) {
  if (window.careerDesktop) await window.careerDesktop.openExternal(url);
  else window.open(url, "_blank", "noopener,noreferrer");
}
export function localDate() {
  return new Date().toLocaleDateString("en-CA");
}
function useStateValue() {
  const workspace = useAutosave<Workspace>(
    { schemaVersion: 1, opportunities: [], tasks: [], activity: [] },
    "/api/workspace",
  );
  const profile = useAutosave<Profile>(
    initialProfile as Profile,
    "/api/records?path=data/profile.json",
    "PUT",
  );
  const settings = useAutosave<Settings>(
    initialSettings as Settings,
    "/api/records?path=data/settings.json",
    "PUT",
  );
  const cv = useAutosave<CV>(initialCV as CV, "/api/cv", "PUT");
  const journey = useAutosave<Journey>(
    initialJourney as Journey,
    "/api/records?path=data/journey.json",
    "PUT",
  );
  const documents = useAutosave<Documents>(
    initialDocuments as Documents,
    "/api/records?path=data/documents.json",
    "PUT",
  );
  const editors = { workspace, profile, settings, cv, journey, documents };
  const [ready, setReady] = useState(false),
    [fatal, setFatal] = useState(""),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(""),
    [desktop, setDesktop] = useState(false),
    [version, setVersion] = useState(""),
    [active, setActive] = useState<any>(null),
    [searches, setSearches] = useState<Searches>(initialSearches as Searches),
    [connections, setConnections] = useState<any>(null);
  const loading = useRef(false),
    latest = useRef<any>({}),
    editorsRef = useRef(editors);
  editorsRef.current = editors;
  async function settle() {
    await Promise.all(
      Object.values(editorsRef.current).map((e) => e.settled()),
    );
  }
  async function reload() {
    if (loading.current) return;
    loading.current = true;
    try {
      const data = await api("/api/app");
      if (!validateWorkspace(data.records.workspace.data))
        throw new Error(
          "The workspace could not be validated. Existing edits were retained.",
        );
      latest.current = data.records;
      for (const name of Object.keys(editorsRef.current)) {
        const record = data.records[name];
        (editorsRef.current as any)[name].initialise(
          record.data,
          record.revision,
        );
      }
      setSearches(data.records.searches.data);
      setActive(data.active);
      setDesktop(data.desktop);
      setVersion(data.version);
      setReady(true);
      setFatal("");
    } catch (error) {
      setFatal(
        error instanceof Error
          ? error.message
          : "The local workspace could not load.",
      );
    } finally {
      loading.current = false;
    }
  }
  async function loadConnections() {
    try {
      setConnections(await api("/api/connections"));
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "Connection details are unavailable.",
      );
    }
  }
  async function act<T>(
    label: string,
    fn: () => Promise<T>,
  ): Promise<T | undefined> {
    setBusy(label);
    try {
      await settle();
      const result = await fn();
      await reload();
      return result;
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "The action could not complete.",
      );
      return undefined;
    } finally {
      setBusy("");
    }
  }
  async function search(kind = "manual") {
    await act("Searching for jobs", async () => {
      await api("/api/search", { action: "start", kind });
      setToast("The search has started. New matches will appear in the inbox.");
    });
  }
  function notify(text: string) {
    setToast(text);
  }
  function patchOpportunity(id: string, patch: Partial<Opportunity>) {
    workspace.change(
      (w) => {
        const item = w.opportunities.find((o) => o.id === id);
        if (item) {
          if (patch.stage && patch.stage !== item.stage) {
            item.history.push({
              at: new Date().toISOString(),
              stage: patch.stage,
            });
            w.activity.unshift({
              id: crypto.randomUUID(),
              text: item.company + " moved to " + patch.stage,
              at: new Date().toISOString(),
              kind: "update",
            });
          }
          Object.assign(item, patch);
        }
        return w;
      },
      !("notes" in patch || "nextAction" in patch),
    );
  }
  function resolveConflict(name: string, keep: boolean) {
    const record = latest.current[name];
    if (record)
      (editorsRef.current as any)[name]?.queue.current?.resolve(
        record.data,
        record.revision,
        keep,
      );
  }
  useEffect(() => {
    void reload();
    void loadConnections();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, 15000);
    const focus = () => void reload();
    window.addEventListener("focus", focus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", focus);
    };
  }, []);
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => void reload(), 2000);
    return () => clearInterval(interval);
  }, [!!active]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 9000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!ready || !window.careerDesktop) return;
    return window.careerDesktop.onCloseRequested(settle);
  }, [ready]);
  useEffect(() => {
    if (!ready || !desktop) return;
    const timer = setTimeout(() => {
      void settle()
        .then(() => api("/api/background", {}))
        .catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [ready, desktop, settings.data]);
  useEffect(() => {
    if (!ready) return;
    const s = settings.data,
      root = document.documentElement,
      media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark =
        s.appearance === "dark" || (s.appearance === "system" && media.matches);
      root.dataset.palette = dark ? s.darkPalette : s.lightPalette;
      root.style.fontSize = s.textSize + "px";
      root.dataset.motion = s.reducedMotion ? "reduced" : "normal";
      root.style.colorScheme = dark ? "dark" : "light";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [ready, settings.data]);
  useEffect(() => {
    if (ready && !settings.data.timezone)
      settings.change(
        (s) => ({
          ...s,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
        true,
      );
  }, [ready]);
  return {
    workspace,
    profile,
    settings,
    cv,
    journey,
    documents,
    ready,
    fatal,
    toast,
    busy,
    desktop,
    version,
    active,
    searches,
    connections,
    reload,
    settle,
    act,
    search,
    notify,
    patchOpportunity,
    resolveConflict,
    loadConnections,
    editors,
  };
}
const Context = createContext<ReturnType<typeof useStateValue> | null>(null);
export function WorkshopProvider({ children }: { children: ReactNode }) {
  const value = useStateValue();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWorkshop() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing workspace context.");
  return value;
}
