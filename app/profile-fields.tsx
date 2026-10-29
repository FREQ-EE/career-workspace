"use client";
import { useState } from "react";
import { Sparkles, Check, LoaderCircle } from "lucide-react";
import { useWorkshop, api } from "./state";
export const profileGroups: {
  key: string;
  title: string;
  description: string;
  fields: {
    key: string;
    label: string;
    placeholder?: string;
    long?: boolean;
  }[];
}[] = [
  {
    key: "identity",
    title: "About you",
    description: "The details used in your career records and documents.",
    fields: [
      { key: "name", label: "Name" },
      { key: "headline", label: "Professional headline" },
      { key: "location", label: "Current location" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
    ],
  },
  {
    key: "employment",
    title: "Experience and availability",
    description: "Actual work history and practical employment circumstances.",
    fields: [
      { key: "history", label: "Experience and responsibilities", long: true },
      { key: "availability", label: "Availability or notice period" },
      {
        key: "workEligibility",
        label: "Work eligibility and sponsorship needs",
      },
    ],
  },
  {
    key: "capability",
    title: "Evidence and capability",
    description:
      "What the evidence supports, including limitations and development needs.",
    fields: [
      { key: "skills", label: "Skills supported by experience", long: true },
      { key: "evidence", label: "Evidence and supporting context", long: true },
      { key: "achievements", label: "Verified achievements", long: true },
      { key: "gaps", label: "Gaps and development priorities", long: true },
    ],
  },
  {
    key: "direction",
    title: "Direction",
    description:
      "The work you want to move towards. Aspirations remain distinct from existing evidence.",
    fields: [
      {
        key: "targets",
        label: "Target roles or responsibilities",
        placeholder: "Describe the work you want to do",
        long: true,
      },
      { key: "industries", label: "Industries or organisations of interest" },
      {
        key: "motivations",
        label: "What matters in your next role",
        long: true,
      },
      { key: "alternatives", label: "Acceptable alternatives", long: true },
    ],
  },
  {
    key: "search",
    title: "Constraints",
    description:
      "State hard requirements and flexible preferences clearly. Missing information stays unknown.",
    fields: [
      { key: "locations", label: "Search locations" },
      { key: "arrangement", label: "Remote, hybrid or on-site preferences" },
      { key: "languages", label: "Working languages and proficiency" },
      {
        key: "salary",
        label: "Compensation requirements",
        placeholder: "Include currency, period and any flexibility",
      },
      { key: "hours", label: "Hours and contract preferences" },
      {
        key: "nonNegotiables",
        label: "Non-negotiable requirements",
        long: true,
      },
      {
        key: "exclusions",
        label: "Exclude these roles, employers or conditions",
        long: true,
      },
    ],
  },
];
export function ProfileFields({ groups }: { groups: string[] }) {
  const { profile } = useWorkshop();
  return (
    <>
      {profileGroups
        .filter((g) => groups.includes(g.key))
        .map((group) => (
          <section className="form-section" key={group.key}>
            <h3>{group.title}</h3>
            <p className="muted small">{group.description}</p>
            <div className="form-grid">
              {group.fields.map((field) => (
                <label className={field.long ? "span-two" : ""} key={field.key}>
                  {field.label}
                  {field.long ? (
                    <textarea
                      rows={3}
                      value={
                        (profile.data as any)[group.key]?.[field.key] || ""
                      }
                      placeholder={field.placeholder}
                      onChange={(e) =>
                        profile.change((p) => {
                          (p as any)[group.key][field.key] = e.target.value;
                          return p;
                        })
                      }
                      onBlur={() => void profile.flush()}
                    />
                  ) : (
                    <input
                      value={
                        (profile.data as any)[group.key]?.[field.key] || ""
                      }
                      placeholder={field.placeholder}
                      onChange={(e) =>
                        profile.change((p) => {
                          (p as any)[group.key][field.key] = e.target.value;
                          return p;
                        })
                      }
                      onBlur={() => void profile.flush()}
                    />
                  )}
                </label>
              ))}
            </div>
          </section>
        ))}
    </>
  );
}
export function Interview({ step }: { step: string }) {
  const { act, busy, notify } = useWorkshop();
  const [answer, setAnswer] = useState(""),
    [reply, setReply] = useState<any>(null);
  return (
    <section className="interview">
      <div className="section-heading">
        <div>
          <h3>
            <Sparkles size={17} /> Work through this with the AI
          </h3>
          <p className="muted small">
            Ask for the next useful question or add context. Suggested facts are
            reviewed before saving.
          </p>
        </div>
      </div>
      {reply && (
        <div className="interview-reply">
          <strong>{reply.question}</strong>
          <p className="muted small">{reply.why}</p>
          {reply.suggestions?.length > 0 && (
            <>
              <dl>
                {reply.suggestions.map((s: any, index: number) => (
                  <div key={index}>
                    <dt>{s.field.replace(/([A-Z])/g, " $1")}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
              <button
                className="button"
                disabled={!!busy}
                onClick={() =>
                  void act("Saving reviewed answers", async () => {
                    await api("/api/actions", {
                      action: "apply-interview",
                      suggestions: reply.suggestions,
                    });
                    setReply({ ...reply, suggestions: [] });
                    setAnswer("");
                    notify("Reviewed answers saved.");
                  })
                }
              >
                <Check size={15} />
                Use these reviewed updates
              </button>
            </>
          )}
        </div>
      )}
      <textarea
        aria-label="Answer or context for the AI interview"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={3}
        placeholder="Add context or answer the question…"
      />
      <button
        className="button secondary"
        disabled={!!busy}
        onClick={() =>
          void act("Preparing the next interview question", async () =>
            setReply(
              await api("/api/actions", { action: "interview", step, answer }),
            ),
          )
        }
      >
        {busy ? (
          <LoaderCircle size={16} className="spin" />
        ) : (
          <Sparkles size={16} />
        )}
        Ask the next question
      </button>
    </section>
  );
}
