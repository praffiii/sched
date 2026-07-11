import { expect, test } from "@playwright/test";

test("unknown routes show the sketchy not-found page", async ({ page }) => {
  await page.goto("/this-route-does-not-exist");

  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to Sched" }),
  ).toHaveAttribute("href", "/");
});
