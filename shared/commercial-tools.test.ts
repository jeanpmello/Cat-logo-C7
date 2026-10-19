import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const card = readFileSync(new URL("../client/src/components/admin/CardDesigner.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

describe("commercial tools", () => {
  it("offers safe card presets that configure format and content together", () => {
    expect(card).toContain("applyTemplate(template");
    expect(card).toContain("Venda rápida");
    expect(card).toContain("Produto completo");
    expect(card).toContain("Comparativo");
    expect(card).toContain("Story");
  });

  it("adapts the advisor to games and creative programs", () => {
    expect(home).toContain("programOptions");
    expect(home).toContain("Digite o nome do programa");
    expect(home).toContain("freeText || (goal === \"jogos\" ? gameOther : programOther)");
    expect(home).toContain("% compatível");
  });

  it("visually distinguishes fit from limitations", () => {
    expect(css).toContain(".advisor-fit");
    expect(css).toContain(".advisor-limitations");
    expect(css).toContain(".card-template-button.active");
  });

  it("highlights the automatic ten-installment offer in the public product sheet", () => {
    expect(home).toContain("formatInstallment10x");
    expect(home).toContain("modal-installment");
    expect(css).toContain(".modal-installment");
  });

  it("keeps card details readable instead of clipping long lines", () => {
    expect(card).toContain("function wrapText");
    expect(card).toContain("drawWrappedText(ctx, installment");
    expect(card).toContain("À vista:");
    expect(card).toContain("imageHeight = options.format === \"story\" ? 690");
  });

  it("uses a safe public share-card layout with installment pricing", () => {
    expect(home).toContain("function wrapCanvasText");
    expect(home).toContain("drawCanvasText(ctx, specs");
    expect(home).toContain("const installment = formatInstallment10x(price)");
    expect(home).toContain("canvas.width = 1400");
    expect(home).toContain("const photoWidth = 580");
    expect(home).toContain("const photoHeight = 520");
    expect(home).toContain("const scale = Math.min(photoWidth / image.width, photoHeight / image.height, 1.35)");
    expect(home).toContain('ctx.filter = "blur(22px)"');
  });
});
