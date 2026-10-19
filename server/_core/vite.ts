import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { getProductById } from "../db";


function escapeHtml(value: unknown) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
function absoluteUrl(origin: string, value: string | null | undefined) { if (!value) return `${origin}/manus-storage/c7-logo_ae3d1307.png`; try { return new URL(value, origin).toString(); } catch { return `${origin}/manus-storage/c7-logo_ae3d1307.png`; } }
export function buildCatalogMeta(template: string, requestUrl: string, origin: string, product?: { brand: string; model: string; processor: string; ram: string; storage: string; price: string; promoPrice?: string | null; imageUrl?: string | null; status: string }) { const url = new URL(requestUrl, origin); const isPublicProduct = Boolean(product && product.status === "available"); const title = isPublicProduct ? `${product!.brand} ${product!.model} · C7 Store` : "C7 Store | Catálogo de Tecnologia"; const description = isPublicProduct ? `${product!.brand} ${product!.model} seminovo revisado, ${product!.processor}, ${product!.ram}, ${product!.storage}, por ${product!.promoPrice || product!.price}. 1 ano de garantia C7 Store.` : "Notebooks e desktops seminovos revisados, com 1 ano de garantia C7 Store."; const image = isPublicProduct ? absoluteUrl(url.origin, product!.imageUrl) : absoluteUrl(url.origin, null); const canonical = isPublicProduct ? url.toString() : `${url.origin}/`; const head = `<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}" /><meta property="og:type" content="product" /><meta property="og:site_name" content="C7 Store" /><meta property="og:title" content="${escapeHtml(title)}" /><meta property="og:description" content="${escapeHtml(description)}" /><meta property="og:image" content="${escapeHtml(image)}" /><meta property="og:url" content="${escapeHtml(canonical)}" /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${escapeHtml(title)}" /><meta name="twitter:description" content="${escapeHtml(description)}" /><meta name="twitter:image" content="${escapeHtml(image)}" /><link rel="canonical" href="${escapeHtml(canonical)}" />`; return template.replace(/<title>[\s\S]*?<\/title>/i, "").replace(/<meta name="description"[^>]*>/i, "").replace(/<\/head>/i, `${head}</head>`); }
async function injectCatalogMeta(template: string, requestUrl: string, req: any) { const url = new URL(requestUrl, `${req.protocol}://${req.get("host")}`); const productId = Number(url.searchParams.get("produto")); const product = productId > 0 ? await getProductById(productId) : undefined; return buildCatalogMeta(template, requestUrl, url.origin, product); }

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      template = await injectCatalogMeta(template, url, req);
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html", "Cache-Control": "no-cache" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath, { index: false }));

  // Render product-specific social metadata instead of serving a generic shell.
  app.use("*", async (req, res, next) => {
    try {
      const template = await fs.promises.readFile(path.resolve(distPath, "index.html"), "utf-8");
      const html = await injectCatalogMeta(template, req.originalUrl, req);
      res.status(200).set({ "Content-Type": "text/html", "Cache-Control": "no-cache" }).end(html);
    } catch (error) {
      next(error);
    }
  });
}
