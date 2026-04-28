import { GET } from "@/app/api/health/route";
import { describe, expect, it } from "vitest";

describe("GET /api/health", () => {
  it("returns an ok payload for smoke checks", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      status: "ok",
      service: "Context-to-Action System"
    });
    expect(payload.timestamp).toEqual(expect.any(String));
  });
});
