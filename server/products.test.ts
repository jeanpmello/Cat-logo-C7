import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type ContextOptions = { user: TrpcContext["user"] };

function createContext({ user }: ContextOptions): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("products router", () => {
  it("allows the public catalog to query products without authentication", async () => {
    const caller = appRouter.createCaller(createContext({ user: null }));
    const result = await caller.products.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(8);
    expect(result.every((product) => product.condition === "Seminovo revisado")).toBe(true);
  });

  it("blocks inventory access for unauthenticated visitors", async () => {
    const caller = appRouter.createCaller(createContext({ user: null }));
    await expect(caller.products.adminList()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks product mutations for unauthenticated visitors", async () => {
    const caller = appRouter.createCaller(createContext({ user: null }));
    await expect(caller.products.remove({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.products.restore({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.products.uploadImage({ filename: "foto.png", mimeType: "image/png", base64: "aGVsbG8=" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks authenticated non-admin users from the inventory", async () => {
    const caller = appRouter.createCaller(createContext({ user: {
      id: 99,
      openId: "regular-user",
      name: "Usuário comum",
      email: "user@example.com",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } }));
    await expect(caller.products.adminList()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks even an admin user who is not the project owner from managing access", async () => {
    const caller = appRouter.createCaller(createContext({ user: {
      id: 100,
      openId: "invited-admin",
      name: "Administrador convidado",
      email: "admin@example.com",
      loginMethod: "email",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } }));
    await expect(caller.authorizedUsers.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
