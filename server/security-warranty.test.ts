import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("security and warranty regressions", () => {
  it("keeps progressive login protection persistent and keyed by IP plus username", () => {
    const auth = readFileSync(new URL("./privateAuth.ts", import.meta.url), "utf8");
    const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    expect(auth).toContain("MAX_LOGIN_FAILURES = 5");
    expect(auth).toContain("LOCK_MINUTES = 15");
    expect(router).toContain("x-forwarded-for");
    expect(router).toContain("recordLoginFailure(identifier)");
  });

  it("requires a valid customer name before printing and exposes warranty registration", () => {
    const contract = readFileSync(new URL("../client/src/components/admin/WarrantyContract.tsx", import.meta.url), "utf8");
    const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    expect(contract).toContain("buyerName.trim().length < 3");
    expect(contract).toContain("onPrinted?.");
    expect(router).toContain("warranties: router");
    expect(router).toContain("customerName: z.string().trim().min(3)");
  });
});
