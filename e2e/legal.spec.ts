import { expect, test } from "@playwright/test";

test.describe("legal pages", () => {
  test("privacy policy renders required disclosures", async ({ page }) => {
    await page.goto("/privacy");

    await expect(
      page.getByRole("heading", { name: "Privacy Policy" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Google login" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Google Calendar and Google Tasks access",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "AI scheduling" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Data storage" }),
    ).toBeVisible();
  });

  test("terms of service renders account and AI terms", async ({ page }) => {
    await page.goto("/terms");

    await expect(
      page.getByRole("heading", { name: "Terms of Service" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Google account and permissions" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "AI scheduling" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Google Calendar and Google Tasks changes",
      }),
    ).toBeVisible();
  });

  test("login legal links navigate to privacy and terms", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("link", { name: "Privacy Policy" }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(
      page.getByRole("heading", { name: "Privacy Policy" }),
    ).toBeVisible();

    await page.goto("/login");
    await page.getByRole("link", { name: "Terms" }).click();
    await expect(page).toHaveURL(/\/terms$/);
    await expect(
      page.getByRole("heading", { name: "Terms of Service" }),
    ).toBeVisible();
  });
});
