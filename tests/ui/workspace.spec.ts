import { test, expect } from "@playwright/test";
test("empty onboarding, keyboard focus, durable edits and responsive themes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", {
      name: "Connect the intelligence. Keep ownership.",
    }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((e) => e.contains(document.activeElement))).toBe(
    true,
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Make the next move." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add action", exact: true }).click();
  await dialog
    .getByLabel("Action", { exact: true })
    .fill("Review the next step");
  await dialog.getByRole("button", { name: "Add action", exact: true }).click();
  await expect(
    page.getByText("Review the next step", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("All changes saved")).toBeVisible();
  await page.reload();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dialog" })
    .click();
  await expect(
    page.getByText("Review the next step", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Opportunities", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add opportunity", exact: true })
    .click();
  await dialog
    .getByLabel("Organisation", { exact: true })
    .fill("User supplied organisation");
  await dialog
    .getByLabel("Role title", { exact: true })
    .fill("User supplied role");
  await dialog
    .getByLabel("Employer posting URL", { exact: true })
    .fill("https://example.com/job/user");
  await dialog
    .getByRole("button", { name: "Add opportunity", exact: true })
    .click();
  await expect(
    page.getByText("User supplied role", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  for (const mode of ["dark", "light"]) {
    await page
      .getByRole("combobox", { name: "Appearance", exact: true })
      .selectOption(mode);
    for (const palette of mode === "dark"
      ? ["Charcoal", "Forest"]
      : ["Paper", "Parchment"]) {
      await page.getByRole("button", { name: palette, exact: false }).click();
      await expect(page.locator("html")).toHaveAttribute(
        "data-palette",
        palette.toLowerCase(),
      );
    }
  }
  for (const size of [
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(size);
    for (const name of [
      "Home",
      "Opportunities",
      "Profile & Strategy",
      "Documents",
      "Settings",
    ]) {
      await page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("button", { name, exact: true })
        .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${name} at ${size.width}`,
      ).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});
