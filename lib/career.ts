export type ProviderName = "chatgpt" | "claude";
export type Settings = {
  schemaVersion: 1;
  appearance: "system" | "dark" | "light";
  darkPalette: "charcoal" | "forest";
  lightPalette: "paper" | "parchment";
  textSize: number;
  reducedMotion: boolean;
  provider: "" | ProviderName;
  model: string;
  language: string;
  currency: string;
  timezone: string;
  background: boolean;
  startAtLogin: boolean;
  notifications: {
    jobs: boolean;
    reminders: boolean;
    details: boolean;
    quietStart: string;
    quietEnd: string;
  };
  routine: {
    enabled: boolean;
    intervalHours: number;
    searchOnLaunch: boolean;
    maxNew: number;
    applicationMinutes: number;
    reviewDays: number;
  };
  privacy: { allowAI: boolean; backgroundAI: boolean };
  cloud: {
    enabled: boolean;
    repository: string;
    branch: string;
    publishCapability: boolean;
    verified: boolean;
  };
};
export type Profile = {
  schema_version: 1;
  identity: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    headline?: string;
  };
  employment: {
    history?: string;
    availability?: string;
    workEligibility?: string;
  };
  direction: {
    targets?: string;
    industries?: string;
    motivations?: string;
    alternatives?: string;
  };
  capability: {
    skills?: string;
    evidence?: string;
    achievements?: string;
    gaps?: string;
  };
  search: {
    locations?: string;
    arrangement?: string;
    languages?: string;
    salary?: string;
    hours?: string;
    exclusions?: string;
    nonNegotiables?: string;
  };
  qualifications: unknown[];
  presentation: { language?: string };
  privacy: Record<string, unknown>;
};
export type CV = {
  schemaVersion: 2;
  name: string;
  email: string;
  phone: string;
  location: string;
  language: string;
  headline: string;
  summary: string;
  skills: string[];
  languages: string[];
  experience: {
    id: string;
    dates: string;
    location: string;
    title: string;
    company: string;
    bullets: string[];
  }[];
  education: {
    id: string;
    dates: string;
    title: string;
    organisation: string;
    detail: string;
  }[];
  projects: { id: string; name: string; detail: string }[];
  variants: {
    id: string;
    label: string;
    language: string;
    headline: string;
    summary: string;
    opportunityId: string;
  }[];
  reviewStatus: string;
  studio: { variantId: string; photo: boolean; opportunityId: string };
};
export type Journey = {
  schemaVersion: 1;
  step: number;
  complete: boolean;
  confirmed: string[];
  draft: Record<string, any> | null;
  calibration: {
    id: string;
    interest: "" | "Interested" | "Maybe" | "No";
    accuracy: "" | "Accurate" | "Too optimistic" | "Too cautious";
    reason: string;
    context?: {
      company: string;
      title: string;
      fit: string;
      gaps: string;
      goalScore: number | null;
      capabilityScore: number | null;
    };
  }[];
  reviewedAt: string;
};
export type SearchRun = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "succeeded" | "failed" | "cancelled";
  stage: string;
  added: number;
  error?: string;
  provider: string;
  kind: string;
  profileRevision?: string;
};
export type Searches = {
  schemaVersion: 1;
  runs: SearchRun[];
  lastAttemptAt: string;
  lastSuccessAt: string;
  nextDueAt: string;
  importedRuns: string[];
};
export type Documents = {
  schemaVersion: 1;
  drafts: {
    id: string;
    title: string;
    kind: "cover-letter" | "application-answer" | "notes";
    opportunityId: string;
    body: string;
    createdAt: string;
    reviewed: boolean;
  }[];
};
export const recordPaths = {
  workspace: "data/workspace.json",
  profile: "data/profile.json",
  settings: "data/settings.json",
  journey: "data/journey.json",
  cv: "career/cv.json",
  documents: "data/documents.json",
  searches: "data/searches.json",
} as const;
