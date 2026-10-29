import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { CV } from "./career";
export async function renderCV(
  cv: CV,
  variantId: string,
  photo: boolean,
  assets: { regular: Uint8Array; medium: Uint8Array; portrait?: Uint8Array },
) {
  const variant = cv.variants.find((v) => v.id === variantId),
    language = variant?.language || cv.language;
  const translations: Record<string, string[]> = {
    en: [
      "Profile",
      "Experience",
      "Education",
      "Projects",
      "Skills and languages",
    ],
    de: [
      "Profil",
      "Berufserfahrung",
      "Ausbildung",
      "Projekte",
      "Kenntnisse und Sprachen",
    ],
    fr: [
      "Profil",
      "Expérience",
      "Formation",
      "Projets",
      "Compétences et langues",
    ],
    es: [
      "Perfil",
      "Experiencia",
      "Formación",
      "Proyectos",
      "Competencias e idiomas",
    ],
  };
  const labels = translations[language.split("-")[0]] || translations.en;
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(cv.name + " — CV");
  doc.setProducer("Career Workshop");
  const regular = await doc.embedFont(assets.regular, { subset: true }),
    medium = await doc.embedFont(assets.medium, { subset: true });
  const portrait =
    photo && assets.portrait ? await doc.embedJpg(assets.portrait) : null;
  const W = 595.28,
    H = 841.89,
    M = 43,
    width = W - 2 * M,
    ink = rgb(0.12, 0.13, 0.15),
    muted = rgb(0.38, 0.4, 0.43);
  let page!: PDFPage,
    y = 0;
  function newPage() {
    page = doc.addPage([W, H]);
    y = H - M;
    if (doc.getPageCount() > 1) {
      page.drawText(cv.name, {
        x: M,
        y: y - 12,
        size: 11,
        font: medium,
        color: ink,
      });
      y -= 35;
    }
  }
  function ensure(height: number) {
    if (y - height < M + 18) newPage();
  }
  function wrap(value: string, font: PDFFont, size: number, max = width) {
    const result: string[] = [];
    for (const paragraph of String(value || "").split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        if (!word) continue;
        if (
          font.widthOfTextAtSize(line ? line + " " + word : word, size) <= max
        ) {
          line = line ? line + " " + word : word;
          continue;
        }
        if (line) {
          result.push(line);
          line = "";
        }
        for (const char of word) {
          if (line && font.widthOfTextAtSize(line + char, size) > max) {
            result.push(line);
            line = "";
          }
          line += char;
        }
      }
      result.push(line);
    }
    return result;
  }
  function text(
    value: string,
    { font = regular, size = 10, x = M, max = width, colour = ink } = {},
  ) {
    for (const line of wrap(value, font, size, max)) {
      ensure(size * 1.5);
      page.drawText(line, { x, y: y - size, font, size, color: colour });
      y -= size * 1.5;
    }
  }
  function section(label: string) {
    ensure(55);
    y -= 17;
    text(label.toLocaleUpperCase(), { font: medium, size: 10, colour: muted });
    y -= 7;
  }
  newPage();
  const top = y,
    headerWidth = portrait ? width - 100 : width;
  text(cv.name, {
    font: medium,
    size: Math.min(
      28,
      Math.max(
        16,
        headerWidth / Math.max(1, medium.widthOfTextAtSize(cv.name, 1)),
      ),
    ),
    max: headerWidth,
  });
  y -= 6;
  text(variant?.headline || cv.headline, {
    font: medium,
    size: 11,
    max: headerWidth,
  });
  y -= 5;
  text([cv.location, cv.email, cv.phone].filter(Boolean).join("  ·  "), {
    size: 9,
    colour: muted,
    max: headerWidth,
  });
  if (portrait) {
    const box = 78,
      scale = Math.min(box / portrait.width, box / portrait.height);
    page.drawImage(portrait, {
      x: W - M - box,
      y: top - box,
      width: portrait.width * scale,
      height: portrait.height * scale,
    });
    y = Math.min(y, top - box);
  }
  const summary = variant?.summary || cv.summary;
  if (summary) {
    section(labels[0]);
    text(summary);
  }
  if (cv.experience.length) {
    section(labels[1]);
    for (const item of cv.experience) {
      ensure(64);
      text([item.title, item.company].filter(Boolean).join(" · "), {
        font: medium,
        size: 11,
      });
      text([item.dates, item.location].filter(Boolean).join(" · "), {
        size: 9,
        colour: muted,
      });
      for (const bullet of item.bullets) text("• " + bullet);
      y -= 10;
    }
  }
  if (cv.education.length) {
    section(labels[2]);
    for (const item of cv.education) {
      ensure(55);
      text([item.title, item.organisation].filter(Boolean).join(" · "), {
        font: medium,
      });
      text(item.dates, { size: 9, colour: muted });
      if (item.detail) text(item.detail);
      y -= 8;
    }
  }
  if (cv.projects.length) {
    section(labels[3]);
    for (const item of cv.projects) {
      ensure(45);
      text(item.name, { font: medium });
      text(item.detail);
      y -= 8;
    }
  }
  if (cv.skills.length || cv.languages.length) {
    section(labels[4]);
    if (cv.skills.length) text(cv.skills.join(" · "));
    if (cv.languages.length) text(cv.languages.join(" · "));
  }
  const pages = doc.getPages();
  pages.forEach((p, index) =>
    p.drawText(`${index + 1} / ${pages.length}`, {
      x: W - M - 35,
      y: 22,
      size: 8,
      font: regular,
      color: muted,
    }),
  );
  return doc.save();
}
