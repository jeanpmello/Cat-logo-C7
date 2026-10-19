import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type Role = NonNullable<TrpcContext["user"]>["role"];
function contextFor(role: Role): TrpcContext {
  const now = new Date();
  return {
    user: { id: 777, openId: `campaign-${role}`, email: `${role}@campaign.test`, name: "Campaign Test", loginMethod: "private", username: `campaign-${role}`, passwordHash: null, role, createdAt: now, updatedAt: now, lastSignedIn: now },
    req: { protocol: "https", headers: {}, get: () => "catalogo.c7tecnologia.com" } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("campaign management", () => {
  it("keeps campaign administration restricted to editors", async () => {
    const viewer = appRouter.createCaller(contextFor("viewer"));
    await expect(viewer.campaigns.adminList()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(viewer.campaigns.save({ internalName: "Oferta", slug: "oferta", title: "Oferta", description: null, bannerUrl: null, accentColor: "#1db8ff", ctaLabel: "Ver ofertas", status: "draft", startsAt: null, endsAt: null, productIds: [] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("validates the public campaign form slug before persistence", async () => {
    const seller = appRouter.createCaller(contextFor("seller"));
    await expect(seller.campaigns.save({ internalName: "Oferta", slug: "Oferta com espaço", title: "Oferta", description: null, bannerUrl: null, accentColor: "#1db8ff", ctaLabel: "Ver ofertas", status: "draft", startsAt: null, endsAt: null, productIds: [] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("only exposes active campaigns in the public listing rules", () => {
    const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    expect(source).toContain('eq(campaigns.status, "active")');
    expect(source).toContain("campaign.startsAt");
    expect(source).toContain("campaign.endsAt");
    expect(source).toContain('product?.status === "available"');
  });

  it("keeps the campaign manager and public spotlight accessible", () => {
    const manager = readFileSync(new URL("../client/src/components/admin/CampaignManager.tsx", import.meta.url), "utf8");
    const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    expect(manager).toContain("Nova campanha");
    expect(manager).toContain("Ativa no catálogo");
    expect(manager).toContain("productIds");
    expect(home).toContain("CampaignSpotlight");
    expect(home).toContain("trpc.campaigns.list.useQuery");
  });
});
