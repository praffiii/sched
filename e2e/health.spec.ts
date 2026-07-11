import { expect, test } from "@playwright/test";

test.describe("health + auth-gated APIs", () => {
  test("health endpoint reports ok database", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ status: "ok", db: "ok" });
    expect(typeof body.ts).toBe("string");
  });

  test("protected APIs reject unauthenticated requests", async ({
    request,
  }) => {
    const cases: Array<{
      route: string;
      method: "get" | "post";
    }> = [
      { route: "/api/calendar/events", method: "get" },
      { route: "/api/tasks", method: "post" },
      { route: "/api/chat/history", method: "get" },
      { route: "/api/ai/pending", method: "get" },
      { route: "/api/ai/generate", method: "post" },
    ];

    for (const { route, method } of cases) {
      const response =
        method === "get"
          ? await request.get(route)
          : await request.post(route, { data: {} });

      expect(
        response.status(),
        `${method.toUpperCase()} ${route} should be 401`,
      ).toBe(401);

      await expect(response.json()).resolves.toMatchObject({
        error: "Unauthorized",
      });
    }
  });
});
