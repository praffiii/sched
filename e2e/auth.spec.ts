import { expect, test } from "@playwright/test";

test.describe("auth landing (screen 1B / 1C)", () => {
  test("unauthenticated home redirects to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("login page shows brand pitch and Google connect CTA", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Sched" })).toBeVisible();
    await expect(
      page.getByText(/Type what your week looks like/i),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Connect to start" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Continue with Google/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms",
    );
    await expect(
      page.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/privacy");
  });

  test("permission preview opens and closes before OAuth", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: /Continue with Google/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Sched wants to:")).toBeVisible();
    await expect(dialog.getByText("See your calendars")).toBeVisible();
    await expect(dialog.getByText("Create events")).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /Allow & continue/i }),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });
});
