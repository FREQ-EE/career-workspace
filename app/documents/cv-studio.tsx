"use client";
import type { CV } from "@/lib/career";
export default function CVEditor({
  value,
  onChange,
}: {
  value: CV;
  onChange: (fn: (cv: CV) => CV) => void;
}) {
  const field = (key: keyof CV, label: string, multiline = false) => (
    <label key={key}>
      {label}
      {multiline ? (
        <textarea
          rows={4}
          value={String(value[key] || "")}
          onChange={(e) => onChange((c) => ({ ...c, [key]: e.target.value }))}
        />
      ) : (
        <input
          value={String(value[key] || "")}
          onChange={(e) => onChange((c) => ({ ...c, [key]: e.target.value }))}
        />
      )}
    </label>
  );
  const itemField = (
    type: "experience" | "education" | "projects",
    index: number,
    key: string,
    label: string,
    multiline = false,
  ) => (
    <label key={key}>
      {label}
      {multiline ? (
        <textarea
          rows={3}
          value={
            Array.isArray((value[type][index] as any)[key])
              ? (value[type][index] as any)[key].join("\n")
              : (value[type][index] as any)[key]
          }
          onChange={(e) =>
            onChange((c) => {
              (c[type][index] as any)[key] =
                key === "bullets" ? e.target.value.split("\n") : e.target.value;
              return c;
            })
          }
        />
      ) : (
        <input
          value={(value[type][index] as any)[key]}
          onChange={(e) =>
            onChange((c) => {
              (c[type][index] as any)[key] = e.target.value;
              return c;
            })
          }
        />
      )}
    </label>
  );
  return (
    <div className="cv-editor">
      <div className="form-grid">
        {field("name", "Full name")}
        {field("headline", "Professional headline")}
        {field("email", "Email")}
        {field("phone", "Phone")}
        {field("location", "Location")}
        {field("language", "Document language code")}
      </div>
      {field("summary", "Factual profile", true)}
      <div className="form-grid">
        <label>
          Skills · one per line
          <textarea
            rows={4}
            value={value.skills.join("\n")}
            onChange={(e) =>
              onChange((c) => ({ ...c, skills: e.target.value.split("\n") }))
            }
          />
        </label>
        <label>
          Languages · include stated proficiency
          <textarea
            rows={4}
            value={value.languages.join("\n")}
            onChange={(e) =>
              onChange((c) => ({ ...c, languages: e.target.value.split("\n") }))
            }
          />
        </label>
      </div>
      <div className="section-heading">
        <h3>Experience</h3>
        <button
          className="button subtle"
          onClick={() =>
            onChange((c) => {
              c.experience.push({
                id: crypto.randomUUID(),
                dates: "",
                location: "",
                title: "",
                company: "",
                bullets: [],
              });
              return c;
            })
          }
        >
          Add experience
        </button>
      </div>
      {value.experience.map((item, index) => (
        <div className="entry-editor" key={item.id}>
          <div className="form-grid">
            {itemField("experience", index, "title", "Role")}
            {itemField("experience", index, "company", "Organisation")}
            {itemField("experience", index, "dates", "Dates")}
            {itemField("experience", index, "location", "Location")}
          </div>
          {itemField(
            "experience",
            index,
            "bullets",
            "Responsibilities and achievements · one per line",
            true,
          )}
          <button
            className="text-button danger"
            onClick={() =>
              onChange((c) => {
                c.experience.splice(index, 1);
                return c;
              })
            }
          >
            Remove entry
          </button>
        </div>
      ))}
      <div className="section-heading">
        <h3>Education and qualifications</h3>
        <button
          className="button subtle"
          onClick={() =>
            onChange((c) => {
              c.education.push({
                id: crypto.randomUUID(),
                dates: "",
                title: "",
                organisation: "",
                detail: "",
              });
              return c;
            })
          }
        >
          Add education
        </button>
      </div>
      {value.education.map((item, index) => (
        <div className="entry-editor" key={item.id}>
          <div className="form-grid">
            {itemField("education", index, "title", "Qualification")}
            {itemField("education", index, "organisation", "Institution")}
            {itemField("education", index, "dates", "Dates")}
          </div>
          {itemField("education", index, "detail", "Details", true)}
          <button
            className="text-button danger"
            onClick={() =>
              onChange((c) => {
                c.education.splice(index, 1);
                return c;
              })
            }
          >
            Remove entry
          </button>
        </div>
      ))}
      <div className="section-heading">
        <h3>Projects and other evidence</h3>
        <button
          className="button subtle"
          onClick={() =>
            onChange((c) => {
              c.projects.push({
                id: crypto.randomUUID(),
                name: "",
                detail: "",
              });
              return c;
            })
          }
        >
          Add project
        </button>
      </div>
      {value.projects.map((item, index) => (
        <div className="entry-editor" key={item.id}>
          {itemField("projects", index, "name", "Project")}
          {itemField(
            "projects",
            index,
            "detail",
            "Evidence and contribution",
            true,
          )}
          <button
            className="text-button danger"
            onClick={() =>
              onChange((c) => {
                c.projects.splice(index, 1);
                return c;
              })
            }
          >
            Remove entry
          </button>
        </div>
      ))}
      <p className="muted small">
        Changes save automatically. Keep claims faithful to the source evidence
        and review every tailored version before sending.
      </p>
    </div>
  );
}
