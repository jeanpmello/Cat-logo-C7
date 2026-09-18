import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./privateAuth";

describe("private authentication", () => {
  it("hashes passwords and rejects incorrect values", async () => {
    const encoded = await hashPassword("C7@Temp2026!");
    expect(encoded).not.toContain("C7@Temp2026!");
    expect(await verifyPassword("C7@Temp2026!", encoded)).toBe(true);
    expect(await verifyPassword("senha-incorreta", encoded)).toBe(false);
  });

  it("uses a unique salt for each password hash", async () => {
    const first = await hashPassword("mesma-senha-123");
    const second = await hashPassword("mesma-senha-123");
    expect(first).not.toBe(second);
    expect(await verifyPassword("mesma-senha-123", first)).toBe(true);
    expect(await verifyPassword("mesma-senha-123", second)).toBe(true);
  });
});
