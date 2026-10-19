import type { Express, Request } from "express";
import { ENV } from "./env";
import { getPrivateUserByToken, PRIVATE_SESSION_COOKIE } from "../privateAuth";

function readCookie(req: Request, name: string) {
  const header = req.headers.cookie || "";
  const pair = header
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : undefined;
}

function isWarrantyDocument(key: string) {
  return key === "warranty-documents" || key.startsWith("warranty-documents/");
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    // Product media remains public. Signed warranty pages are legal/customer
    // documents and must only be reachable by an authenticated editor.
    if (isWarrantyDocument(key)) {
      const user = await getPrivateUserByToken(readCookie(req, PRIVATE_SESSION_COOKIE));
      if (!user || !["seller", "admin"].includes(user.role)) {
        res.status(401).send("Warranty document requires panel authentication");
        return;
      }
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "private, no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
